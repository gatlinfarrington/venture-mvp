/**
 * Lemon Squeezy importer (JSON:API, https://docs.lemonsqueezy.com/api).
 * - Auth: Bearer API key; Accept/Content-Type application/vnd.api+json.
 * - Pagination: page[size] (max 100) + links.next; we persist links.next as the resume cursor.
 * - Lists return every status (subscriptions: on_trial, active, paused, past_due, unpaid, cancelled, expired).
 * - There is no /refunds endpoint: refunds are fields on orders (refunded_amount, refunded_at, status).
 * - The documented filters are store/user_email/etc. — there is no updated_at filter — so incremental
 *   runs re-read newest-first orders/customers until they pass a look-back window, and always re-read
 *   all subscriptions so status changes on old subscriptions land.
 */
import { deadlinePassed } from "../lib/deadline";
import { CONFIG } from "../lib/config";
import { completedCursor } from "../lib/backfill";
import { intervalFromUnitAndCount, roundMoney, toMonthlyFromUnitCount } from "../lib/intervals";
import { fetchJsonSync, toIsoDate, toIsoTimestamp } from "../lib/http";
import { incrementalStopBefore, pageIsOlderThan, toMajor } from "../lib/money";
import { emptyBundle } from "./paginate";
import type {
  ImportBundle,
  ImportResult,
  NormalizedCustomer,
  NormalizedOrder,
  NormalizedRefund,
  NormalizedSubscription,
  SyncCursor,
  SyncResource,
} from "./types";

const BASE = "https://api.lemonsqueezy.com/v1";
const ORDER: SyncResource[] = ["orders", "subscriptions", "customers"];

interface LsListResponse<T> {
  data?: T[];
  included?: LsResource[];
  links?: { next?: string | null };
}

interface LsResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data?: { id?: string; type?: string } | null }>;
}

export interface LemonRelatedPricing {
  /** Variant attributes (`interval`, `interval_count`, `price` — deprecated but still returned). */
  variant?: Record<string, unknown>;
  /** Price attributes (`renewal_interval_unit`, `renewal_interval_quantity`, `unit_price`, `scheme`, `tiers`). */
  price?: Record<string, unknown>;
  /** Order attributes (for currency). */
  order?: Record<string, unknown>;
  /** Customer attributes (for country). */
  customer?: Record<string, unknown>;
}

function lsOrderStatus(a: Record<string, unknown>): string {
  const s = String(a.status || "paid").toLowerCase();
  if (s === "partial_refund") return "partially_refunded";
  if (s === "fraudulent") return "failed";
  return s;
}

export function mapLemonOrder(resource: LsResource): NormalizedOrder {
  const a = resource.attributes || {};
  const firstItem = (a.first_order_item as Record<string, unknown> | undefined) || {};
  const currency = String(a.currency || "USD");
  return {
    id: `ls_order_${resource.id}`,
    source: "lemon_squeezy",
    created: toIsoTimestamp(String(a.created_at || a.createdAt || "")),
    product: String(firstItem.product_name || a.product_name || a.name || "Product"),
    customerEmail: String(a.user_email || a.customer_email || ""),
    // Gross (incl. tax), matching Stripe; refunds subtract via the Refunds tab.
    amount: toMajor(a.total, currency),
    currency: currency.toUpperCase(),
    status: lsOrderStatus(a),
    rawId: String(resource.id),
  };
}

/** Lemon Squeezy has no refund objects; derive one row per refunded order. */
export function mapLemonRefundFromOrder(resource: LsResource): NormalizedRefund | null {
  const a = resource.attributes || {};
  const refunded = Number(a.refunded_amount) || 0;
  if (refunded <= 0) return null;
  const currency = String(a.currency || "USD");
  return {
    id: `ls_refund_${resource.id}`,
    source: "lemon_squeezy",
    created: toIsoTimestamp(String(a.refunded_at || a.updated_at || a.created_at || "")),
    orderId: String(resource.id),
    amount: toMajor(refunded, currency),
    currency: currency.toUpperCase(),
    status: "succeeded",
    rawId: String(resource.id),
  };
}

/** @deprecated kept for older callers; LS has no refunds endpoint. */
export function mapLemonRefund(resource: LsResource): NormalizedRefund {
  const a = resource.attributes || {};
  const currency = String(a.currency || "USD");
  return {
    id: `ls_refund_${resource.id}`,
    source: "lemon_squeezy",
    created: toIsoTimestamp(String(a.created_at || a.refunded_at || "")),
    orderId: String(a.order_id || a.orderId || ""),
    amount: toMajor((a.amount as number) ?? (a.refunded_amount as number) ?? (a.total as number) ?? 0, currency),
    currency: currency.toUpperCase(),
    status: String(a.status || "refunded").toLowerCase(),
    rawId: String(resource.id),
  };
}

function lsPriceMinorPerPeriod(priceObj: Record<string, unknown>, variant: Record<string, unknown>, a: Record<string, unknown>, quantity: number): number | null {
  if (priceObj.usage_based === true || (a.first_subscription_item as Record<string, unknown> | undefined)?.is_usage_based === true) return null;
  const scheme = String(priceObj.scheme || "standard");
  const unit = Number(priceObj.unit_price_decimal ?? priceObj.unit_price ?? variant.price ?? a.recurring_price ?? a.price ?? 0) || 0;
  if (scheme === "package") {
    const size = Number(priceObj.package_size) || 1;
    return unit * Math.ceil(quantity / size);
  }
  if (scheme === "graduated" || scheme === "volume") {
    const tiers = (priceObj.tiers as Array<Record<string, unknown>>) || [];
    if (!tiers.length) return unit * quantity;
    const tierUnit = (t: Record<string, unknown>) => Number(t.unit_price_decimal ?? t.unit_price ?? 0) || 0;
    const tierFixed = (t: Record<string, unknown>) => Number(t.fixed_fee ?? 0) || 0;
    const cap = (t: Record<string, unknown>) => (t.last_unit === "inf" || t.last_unit == null ? Infinity : Number(t.last_unit));
    if (scheme === "volume") {
      const t = tiers.find((x) => quantity <= cap(x)) || tiers[tiers.length - 1];
      return tierUnit(t) * quantity + tierFixed(t);
    }
    let remaining = quantity;
    let prev = 0;
    let total = 0;
    for (const t of tiers) {
      const inTier = Math.max(0, Math.min(remaining, cap(t) - prev));
      if (inTier > 0) total += tierUnit(t) * inTier + tierFixed(t);
      remaining -= inTier;
      prev = cap(t);
      if (remaining <= 0) break;
    }
    return total;
  }
  return unit * quantity;
}

/**
 * Map a Lemon Squeezy subscription. Interval + price live on the related Price
 * (`renewal_interval_unit/quantity`, `unit_price`) or legacy Variant (`interval/interval_count`, `price`).
 * Status: `cancelled` means "cancelled but paid until ends_at" (like Stripe cancel_at_period_end),
 * so it stays MRR-active until `ends_at`; `expired` is the real end.
 */
export function mapLemonSubscription(resource: LsResource, related: LemonRelatedPricing = {}): NormalizedSubscription {
  const a = resource.attributes || {};
  const variant = related.variant || {};
  const priceObj = related.price || {};
  const unit = String(priceObj.renewal_interval_unit || variant.interval || a.billing_interval || a.interval || "month");
  const countRaw = priceObj.renewal_interval_quantity ?? variant.interval_count ?? a.interval_count ?? 1;
  const count = Number(countRaw);
  const intervalCount = Number.isFinite(count) && count > 0 ? count : 1;
  const interval = intervalFromUnitAndCount(unit, intervalCount);

  const item = (a.first_subscription_item as Record<string, unknown> | undefined) || {};
  const qty = Number(item.quantity);
  const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1;
  const currency = String((related.order || {}).currency || a.currency || "USD");
  const minor = lsPriceMinorPerPeriod(priceObj, variant, a, quantity);
  const mrr = minor == null ? 0 : roundMoney(toMonthlyFromUnitCount(toMajor(minor, currency), unit, intervalCount));

  const raw = String(a.status || "active").toLowerCase();
  const endsAt = a.ends_at ? Date.parse(String(a.ends_at)) : NaN;
  let status = raw;
  let cancelledAt: string | null = null;
  if (raw === "on_trial") status = "trialing";
  else if (raw === "cancelled") {
    if (!Number.isNaN(endsAt) && endsAt > Date.now()) status = "active"; // grace period, still paid
    else {
      status = "canceled";
      cancelledAt = a.ends_at ? toIsoTimestamp(String(a.ends_at)) : toIsoTimestamp(String(a.updated_at || ""));
    }
  } else if (raw === "expired") {
    status = "canceled";
    cancelledAt = toIsoTimestamp(String(a.ends_at || a.updated_at || ""));
  }
  const customer = related.customer || {};
  return {
    id: `ls_sub_${resource.id}`,
    source: "lemon_squeezy",
    created: toIsoTimestamp(String(a.created_at || "")),
    product: [a.product_name, a.variant_name && a.variant_name !== "Default" ? a.variant_name : ""].filter(Boolean).join(" · ") || "Subscription",
    customerEmail: String(a.user_email || a.customer_email || ""),
    mrr,
    currency: currency.toUpperCase(),
    status,
    cancelledAt,
    interval,
    rawId: String(resource.id),
    country: customer.country ? String(customer.country).toUpperCase() : undefined,
  };
}

export function mapLemonCustomer(resource: LsResource): NormalizedCustomer {
  const a = resource.attributes || {};
  return {
    id: `ls_cust_${resource.id}`,
    source: "lemon_squeezy",
    email: String(a.email || ""),
    name: String(a.name || a.user_name || ""),
    created: toIsoDate(String(a.created_at || "")),
    rawId: String(resource.id),
    country: a.country ? String(a.country).toUpperCase() : undefined,
  };
}

function headers(apiKey: string): Record<string, string> {
  return { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json", Authorization: `Bearer ${apiKey}` };
}

function startUrl(resource: SyncResource): string {
  const path = resource === "subscriptions" ? "/subscriptions" : resource === "customers" ? "/customers" : "/orders";
  let url = `${BASE}${path}?page[size]=100`;
  if (resource === "subscriptions") url += "&include=variant,order,customer";
  return url;
}

function indexIncluded(included: LsResource[] | undefined, into: Map<string, LsResource>): void {
  for (const r of included || []) into.set(`${r.type}:${r.id}`, r);
}

function relId(r: LsResource, rel: string, attr: string): string {
  return String(r.attributes?.[attr] || r.relationships?.[rel]?.data?.id || "");
}

function getOne(apiKey: string, path: string, cache: Map<string, LsResource>, key: string): LsResource | undefined {
  if (cache.has(key)) return cache.get(key);
  try {
    const res = fetchJsonSync<{ data?: LsResource }>(`${BASE}${path}`, { headers: headers(apiKey) });
    if (res.status < 400 && res.data.data) {
      cache.set(key, res.data.data);
      return res.data.data;
    }
  } catch {
    /* fall back to variant pricing */
  }
  return undefined;
}

function relatedFor(apiKey: string, r: LsResource, inc: Map<string, LsResource>): LemonRelatedPricing {
  const variantId = relId(r, "variant", "variant_id");
  const orderId = relId(r, "order", "order_id");
  const customerId = relId(r, "customer", "customer_id");
  const priceId = String((r.attributes?.first_subscription_item as Record<string, unknown> | undefined)?.price_id || "");
  const variant = variantId ? inc.get(`variants:${variantId}`) || getOne(apiKey, `/variants/${variantId}`, inc, `variants:${variantId}`) : undefined;
  const price = priceId ? inc.get(`prices:${priceId}`) || getOne(apiKey, `/prices/${priceId}`, inc, `prices:${priceId}`) : undefined;
  return {
    variant: variant?.attributes,
    price: price?.attributes,
    order: orderId ? inc.get(`orders:${orderId}`)?.attributes : undefined,
    customer: customerId ? inc.get(`customers:${customerId}`)?.attributes : undefined,
  };
}

export function fetchLemonSqueezyResultSync(
  apiKey: string,
  cursor?: SyncCursor,
  maxPages = CONFIG.MAX_PAGES_PER_RUN,
): ImportResult {
  const bundle = emptyBundle();
  let resource: SyncResource | "done" = (cursor?.resource as SyncResource) || "orders";
  if (!ORDER.includes(resource as SyncResource)) resource = "orders";
  let url: string | null = cursor?.pageToken || null;
  const stopBefore = incrementalStopBefore(cursor?.lastSyncedAt);
  const inc = new Map<string, LsResource>();
  let pages = 0;

  while (resource !== "done" && pages < maxPages && (pages === 0 || !deadlinePassed())) {
    if (!url) url = startUrl(resource);
    pages += 1;
    const res = fetchJsonSync<LsListResponse<LsResource>>(url, { headers: headers(apiKey) });
    if (res.status === 401 || res.status === 403) throw new Error("Lemon Squeezy rejected the API key (create one under Settings → API).");
    if (res.status >= 400) throw new Error(`Lemon Squeezy error ${res.status} on ${resource}`);
    indexIncluded(res.data.included, inc);
    const rows = res.data.data || [];
    for (const r of rows) {
      if (resource === "orders") {
        bundle.orders.push(mapLemonOrder(r));
        const refund = mapLemonRefundFromOrder(r);
        if (refund) bundle.refunds.push(refund);
      } else if (resource === "subscriptions") {
        bundle.subscriptions.push(mapLemonSubscription(r, relatedFor(apiKey, r, inc)));
      } else {
        bundle.customers.push(mapLemonCustomer(r));
      }
    }
    let next = res.data.links?.next || null;
    // Orders/customers are newest-first: on incremental runs stop once we pass the look-back window.
    if (next && resource !== "subscriptions" && pageIsOlderThan(rows.map((r) => String(r.attributes?.created_at || "")), stopBefore)) next = null;
    if (next) {
      url = next;
      continue;
    }
    url = null;
    const idx = ORDER.indexOf(resource);
    resource = idx >= ORDER.length - 1 ? "done" : ORDER[idx + 1];
  }

  if (resource !== "done") {
    return {
      bundle,
      cursor: { pageToken: url || undefined, resource, backfillComplete: false, lastSyncedAt: cursor?.lastSyncedAt },
      incomplete: true,
    };
  }
  return { bundle, cursor: completedCursor(new Date().toISOString()), incomplete: false };
}

export function fetchLemonSqueezySync(apiKey: string, cursor?: SyncCursor): ImportBundle {
  return fetchLemonSqueezyResultSync(apiKey, cursor, CONFIG.MAX_PAGES).bundle;
}

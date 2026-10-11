import { deadlinePassed } from "../lib/deadline";
import { CONFIG } from "../lib/config";
import { completedCursor } from "../lib/backfill";
import {
  intervalFromUnitAndCount,
  roundMoney,
  toMonthlyFromUnitCount,
} from "../lib/intervals";
import { centsToMajor, fetchJson, fetchJsonSync, toIsoDate, toIsoTimestamp } from "../lib/http";
import { emptyBundle, nextResource } from "./paginate";
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
  /** Price attributes (`renewal_interval_unit`, `renewal_interval_quantity`, `unit_price`). */
  price?: Record<string, unknown>;
}

export function mapLemonOrder(resource: LsResource): NormalizedOrder {
  const a = resource.attributes || {};
  const firstItem = (a.first_order_item as Record<string, unknown> | undefined) || {};
  return {
    id: `ls_order_${resource.id}`,
    source: "lemon_squeezy",
    created: toIsoTimestamp(String(a.created_at || a.createdAt || "")),
    product: String(firstItem.product_name || a.product_name || a.name || "Product"),
    customerEmail: String(a.user_email || a.customer_email || ""),
    amount: centsToMajor(a.total as number),
    currency: String(a.currency || "USD").toUpperCase(),
    status: String(a.status || "paid").toLowerCase(),
    rawId: resource.id,
  };
}

/**
 * Map a Lemon Squeezy subscription.
 *
 * The Subscription object itself has no billing interval or price — those live on
 * the related Variant (`interval` + `interval_count` + `price`) or Price
 * (`renewal_interval_unit` + `renewal_interval_quantity` + `unit_price`).
 * Pass `related` from `include=variant` (or a price fetch) so yearly / quarterly
 * plans normalize to monthly MRR instead of defaulting to monthly.
 */
export function mapLemonSubscription(
  resource: LsResource,
  related: LemonRelatedPricing = {},
): NormalizedSubscription {
  const a = resource.attributes || {};
  const variant = related.variant || {};
  const priceObj = related.price || {};

  const unit = String(
    priceObj.renewal_interval_unit ||
      variant.interval ||
      a.billing_interval ||
      a.interval ||
      "month",
  );
  const countRaw =
    priceObj.renewal_interval_quantity ?? variant.interval_count ?? a.interval_count ?? 1;
  const count = Number(countRaw);
  const intervalCount = Number.isFinite(count) && count > 0 ? count : 1;
  const interval = intervalFromUnitAndCount(unit, intervalCount);

  const item = (a.first_subscription_item as Record<string, unknown> | undefined) || {};
  const qty = Number(item.quantity);
  const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1;
  const priceCents = Number(
    priceObj.unit_price ?? variant.price ?? a.recurring_price ?? a.price ?? 0,
  );
  const billed = centsToMajor(priceCents) * quantity;
  const mrr = roundMoney(toMonthlyFromUnitCount(billed, unit, intervalCount));

  const status = String(a.status || "").toLowerCase();
  const cancelledAt =
    a.cancelled_at || a.ends_at || (status === "cancelled" || status === "expired" ? a.updated_at : null);

  return {
    id: `ls_sub_${resource.id}`,
    source: "lemon_squeezy",
    created: toIsoTimestamp(String(a.created_at || "")),
    product: String(a.product_name || a.variant_name || "Subscription"),
    customerEmail: String(a.user_email || a.customer_email || ""),
    mrr,
    currency: String(a.currency || "USD").toUpperCase(),
    status: status || "active",
    cancelledAt: cancelledAt ? toIsoTimestamp(String(cancelledAt)) : null,
    interval,
    rawId: resource.id,
  };
}

function indexIncluded(included: LsResource[] | undefined): Map<string, LsResource> {
  const map = new Map<string, LsResource>();
  for (const r of included || []) map.set(`${r.type}:${r.id}`, r);
  return map;
}

function relatedPricingForSubscription(
  resource: LsResource,
  included: Map<string, LsResource>,
): LemonRelatedPricing {
  const a = resource.attributes || {};
  const variantId = String(
    a.variant_id || resource.relationships?.variant?.data?.id || "",
  );
  const variant = variantId ? included.get(`variants:${variantId}`) : undefined;
  const priceId = String(
    ((a.first_subscription_item as Record<string, unknown> | undefined)?.price_id as
      | string
      | number
      | undefined) || "",
  );
  const price = priceId ? included.get(`prices:${priceId}`) : undefined;
  return {
    variant: variant?.attributes,
    price: price?.attributes,
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
    rawId: resource.id,
  };
}

export function mapLemonRefund(resource: LsResource): NormalizedRefund {
  const a = resource.attributes || {};
  return {
    id: `ls_refund_${resource.id}`,
    source: "lemon_squeezy",
    created: toIsoTimestamp(String(a.created_at || a.refunded_at || "")),
    orderId: String(a.order_id || a.orderId || ""),
    amount: centsToMajor((a.amount as number) ?? (a.total as number) ?? 0),
    currency: String(a.currency || "USD").toUpperCase(),
    status: String(a.status || "refunded").toLowerCase(),
    rawId: resource.id,
  };
}

function startUrl(path: string, cursor?: SyncCursor): string {
  let url = `${BASE}${path}?page[size]=${CONFIG.PAGE_SIZE}`;
  // Subscriptions carry no interval/price — pull the related Variant (still
  // returns deprecated interval + interval_count + price for backwards compat).
  if (path === "/subscriptions") {
    url += "&include=variant";
  }
  if (cursor?.lastSyncedAt) {
    url += `&filter[updated_at][gte]=${encodeURIComponent(cursor.lastSyncedAt)}`;
  }
  return url;
}

function pathFor(resource: SyncResource): string {
  switch (resource) {
    case "subscriptions":
      return "/subscriptions";
    case "customers":
      return "/customers";
    case "refunds":
      return "/refunds";
    default:
      return "/orders";
  }
}

function mapFor(
  resource: SyncResource,
): (r: LsResource, included: Map<string, LsResource>) => unknown {
  switch (resource) {
    case "subscriptions":
      return (r, included) => mapLemonSubscription(r, relatedPricingForSubscription(r, included));
    case "customers":
      return (r) => mapLemonCustomer(r);
    case "refunds":
      return (r) => mapLemonRefund(r);
    default:
      return (r) => mapLemonOrder(r);
  }
}

function assignResource(bundle: ImportBundle, resource: SyncResource, items: unknown[]): void {
  switch (resource) {
    case "subscriptions":
      bundle.subscriptions.push(...(items as NormalizedSubscription[]));
      break;
    case "customers":
      bundle.customers.push(...(items as NormalizedCustomer[]));
      break;
    case "refunds":
      bundle.refunds.push(...(items as NormalizedRefund[]));
      break;
    default:
      bundle.orders.push(...(items as NormalizedOrder[]));
  }
}

function ensureVariantIncludedSync(
  apiKey: string,
  resource: LsResource,
  included: Map<string, LsResource>,
  cache: Map<string, LsResource>,
): void {
  const a = resource.attributes || {};
  const variantId = String(a.variant_id || resource.relationships?.variant?.data?.id || "");
  if (!variantId) return;
  const key = `variants:${variantId}`;
  if (included.has(key) || cache.has(key)) {
    const hit = included.get(key) || cache.get(key);
    if (hit) included.set(key, hit);
    return;
  }
  try {
    const res: { status: number; data: { data?: LsResource } } = fetchJsonSync(
      `${BASE}/variants/${variantId}`,
      {
        headers: {
          Accept: "application/vnd.api+json",
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );
    if (res.status < 400 && res.data.data) {
      included.set(key, res.data.data);
      cache.set(key, res.data.data);
    }
  } catch {
    /* leave interval as monthly default if variant fetch fails */
  }
}

function paginateBudgetSync(
  path: string,
  apiKey: string,
  mapFn: (r: LsResource, included: Map<string, LsResource>) => unknown,
  start: string | null,
  maxPages: number,
  opts: { fetchMissingVariants?: boolean } = {},
): { items: unknown[]; nextUrl: string | null; pagesUsed: number; incomplete: boolean } {
  const out: unknown[] = [];
  let url: string | null = start;
  let pages = 0;
  const variantCache = new Map<string, LsResource>();
  while (url && pages < maxPages && (pages === 0 || !deadlinePassed())) {
    pages += 1;
    const res: { status: number; data: LsListResponse<LsResource> } = fetchJsonSync(url, {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (res.status === 401 || res.status === 403) throw new Error("Lemon Squeezy API key rejected");
    if (res.status >= 400) {
      if (path === "/refunds") return { items: out, nextUrl: null, pagesUsed: pages, incomplete: false };
      throw new Error(`Lemon Squeezy error ${res.status}`);
    }
    const included = indexIncluded(res.data.included);
    for (const item of res.data.data || []) {
      if (opts.fetchMissingVariants) {
        ensureVariantIncludedSync(apiKey, item, included, variantCache);
      }
      out.push(mapFn(item, included));
    }
    url = res.data.links?.next || null;
  }
  return { items: out, nextUrl: url, pagesUsed: pages, incomplete: Boolean(url) };
}

export function fetchLemonSqueezyResultSync(
  apiKey: string,
  cursor?: SyncCursor,
  maxPages = CONFIG.MAX_PAGES_PER_RUN,
): ImportResult {
  const bundle = emptyBundle();
  let pagesLeft = maxPages;
  let resource: SyncResource | "done" = (cursor?.resource as SyncResource) || "orders";
  let pageToken = cursor?.pageToken;

  while (pagesLeft > 0 && resource !== "done" && !deadlinePassed()) {
    const path = pathFor(resource);
    const start =
      pageToken ||
      startUrl(path, cursor?.lastSyncedAt && !pageToken ? cursor : undefined);
    const page = paginateBudgetSync(path, apiKey, mapFor(resource), start, pagesLeft, {
      fetchMissingVariants: resource === "subscriptions",
    });
    assignResource(bundle, resource, page.items);
    pagesLeft -= page.pagesUsed;
    if (page.incomplete) {
      return {
        bundle,
        cursor: { pageToken: page.nextUrl || undefined, resource, backfillComplete: false },
        incomplete: true,
      };
    }
    pageToken = undefined;
    resource = nextResource(resource);
  }

  if (resource !== "done") {
    return {
      bundle,
      cursor: { pageToken: undefined, resource, backfillComplete: false },
      incomplete: true,
    };
  }
  return { bundle, cursor: completedCursor(new Date().toISOString()), incomplete: false };
}

export function fetchLemonSqueezySync(apiKey: string, cursor?: SyncCursor): ImportBundle {
  return fetchLemonSqueezyResultSync(apiKey, cursor, CONFIG.MAX_PAGES).bundle;
}

async function paginateAsync(
  path: string,
  apiKey: string,
  mapFn: (r: LsResource, included: Map<string, LsResource>) => unknown,
  cursor: SyncCursor | undefined,
  fetchImpl: typeof fetch,
  opts: { fetchMissingVariants?: boolean } = {},
): Promise<unknown[]> {
  const out: unknown[] = [];
  let url: string | null = cursor?.pageToken || startUrl(path, cursor);
  let pages = 0;
  const variantCache = new Map<string, LsResource>();
  while (url && pages < CONFIG.MAX_PAGES) {
    pages += 1;
    const res: { status: number; data: LsListResponse<LsResource> } = await fetchJson(url, {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      fetchImpl,
    });
    if (res.status === 401 || res.status === 403) throw new Error("Lemon Squeezy API key rejected");
    if (res.status >= 400) {
      if (path === "/refunds") return out;
      throw new Error(`Lemon Squeezy error ${res.status}`);
    }
    const included = indexIncluded(res.data.included);
    for (const item of res.data.data || []) {
      if (opts.fetchMissingVariants) {
        const a = item.attributes || {};
        const variantId = String(a.variant_id || item.relationships?.variant?.data?.id || "");
        const key = `variants:${variantId}`;
        if (variantId && !included.has(key) && !variantCache.has(key)) {
          try {
            const vRes: { status: number; data: { data?: LsResource } } = await fetchJson(
              `${BASE}/variants/${variantId}`,
              {
                headers: {
                  Accept: "application/vnd.api+json",
                  Authorization: `Bearer ${apiKey}`,
                },
                fetchImpl,
              },
            );
            if (vRes.status < 400 && vRes.data.data) {
              included.set(key, vRes.data.data);
              variantCache.set(key, vRes.data.data);
            }
          } catch {
            /* ignore */
          }
        } else if (variantCache.has(key)) {
          included.set(key, variantCache.get(key)!);
        }
      }
      out.push(mapFn(item, included));
    }
    url = res.data.links?.next || null;
  }
  return out;
}

export async function fetchLemonSqueezy(
  apiKey: string,
  cursor?: SyncCursor,
  fetchImpl?: typeof fetch,
): Promise<ImportBundle> {
  if (!fetchImpl) return fetchLemonSqueezySync(apiKey, cursor);
  let refunds: NormalizedRefund[] = [];
  try {
    refunds = (await paginateAsync(
      "/refunds",
      apiKey,
      (r) => mapLemonRefund(r),
      cursor,
      fetchImpl,
    )) as NormalizedRefund[];
  } catch {
    refunds = [];
  }
  return {
    orders: (await paginateAsync(
      "/orders",
      apiKey,
      (r) => mapLemonOrder(r),
      cursor,
      fetchImpl,
    )) as NormalizedOrder[],
    subscriptions: (await paginateAsync(
      "/subscriptions",
      apiKey,
      (r, included) => mapLemonSubscription(r, relatedPricingForSubscription(r, included)),
      cursor,
      fetchImpl,
      { fetchMissingVariants: true },
    )) as NormalizedSubscription[],
    customers: (await paginateAsync(
      "/customers",
      apiKey,
      (r) => mapLemonCustomer(r),
      cursor,
      fetchImpl,
    )) as NormalizedCustomer[],
    refunds,
  };
}

import { deadlinePassed } from "../lib/deadline";
import { buildQuery } from "../lib/query";
import { CONFIG } from "../lib/config";
import { completedCursor } from "../lib/backfill";
import { normalizeBillingInterval, roundMoney, toMonthlyAmount } from "../lib/intervals";
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

const BASE = "https://api.stripe.com/v1";
/** Initial Stripe history window (~24 months). */
export const STRIPE_HISTORY_DAYS = 730;

type StripeRecord = Record<string, unknown>;

interface StripeList {
  data?: StripeRecord[];
  has_more?: boolean;
}

const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

/** Stripe amounts are in the smallest unit; zero-decimal currencies (JPY, KRW, …) are already whole units. */
export function stripeToMajor(amount: unknown, currency: unknown): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return ZERO_DECIMAL.has(String(currency || "usd").toLowerCase()) ? n : Math.round(n) / 100;
}

/** Product id → name, filled from /v1/products when the key can read Products. */
export type ProductNames = Record<string, string>;

function obj(v: unknown): StripeRecord {
  return v && typeof v === "object" ? (v as StripeRecord) : {};
}

export function mapStripeCharge(row: StripeRecord): NormalizedOrder {
  const billing = obj(row.billing_details);
  const address = obj(billing.address);
  const currency = String(row.currency || "usd");
  const amount = Number(row.amount) || 0;
  const refundedAmt = Number(row.amount_refunded) || 0;
  const status = String(row.status || "").toLowerCase();
  let outStatus: string;
  if (status !== "succeeded" || row.paid === false) outStatus = status === "pending" ? "pending" : "failed";
  else if (row.disputed && obj(row.dispute).status === "lost") outStatus = "chargeback";
  else if (row.refunded || (refundedAmt > 0 && refundedAmt >= amount)) outStatus = "refunded";
  else if (refundedAmt > 0) outStatus = "partially_refunded";
  else outStatus = "paid";
  const customer = obj(row.customer);
  return {
    id: `stripe_ch_${row.id}`,
    source: "stripe",
    created: toIsoTimestamp(Number(row.created) * 1000),
    product: String(row.description || row.calculated_statement_descriptor || row.statement_descriptor || "Stripe charge"),
    customerEmail: String(billing.email || row.receipt_email || customer.email || ""),
    // Gross amount; refunds are subtracted from the Refunds tab.
    amount: stripeToMajor(amount, currency),
    currency: currency.toUpperCase(),
    status: outStatus,
    rawId: String(row.id),
    country: address.country ? String(address.country).toUpperCase() : undefined,
  };
}

function monthsPerInterval(interval: string, count: number): number {
  const c = count > 0 ? count : 1;
  switch (interval) {
    case "day":
      return (c * 12) / 365;
    case "week":
      return (c * 12) / 52;
    case "year":
      return c * 12;
    default:
      return c;
  }
}

function canonicalInterval(interval: string, count: number): NormalizedSubscription["interval"] {
  if (interval === "month" && count === 3) return "quarter";
  if (interval === "month" && count === 6) return "biannual";
  if (interval === "year" && count === 2) return "biennial";
  if (interval === "month" || interval === "year" || interval === "week" || interval === "day") return interval;
  return "unknown";
}

/** Recurring amount per billing period for one item, in minor units (null = usage-based / unknown). */
function itemPeriodMinor(item: StripeRecord): number | null {
  const price = Object.keys(obj(item.price)).length ? obj(item.price) : obj(item.plan);
  const recurring = obj(price.recurring);
  const usageType = String(recurring.usage_type || price.usage_type || "licensed");
  if (usageType === "metered") return null; // depends on usage; not knowable from the subscription
  const qty = item.quantity == null ? 1 : Number(item.quantity) || 0;
  const scheme = String(price.billing_scheme || "per_unit");
  if (scheme === "tiered") {
    const tiers = (price.tiers as StripeRecord[]) || [];
    if (!tiers.length) return null; // tiers need expand; unknown
    const mode = String(price.tiers_mode || "graduated");
    const unitOf = (t: StripeRecord) => Number(t.unit_amount_decimal ?? t.unit_amount ?? 0) || 0;
    const flatOf = (t: StripeRecord) => Number(t.flat_amount_decimal ?? t.flat_amount ?? 0) || 0;
    if (mode === "volume") {
      const t = tiers.find((x) => x.up_to == null || qty <= Number(x.up_to)) || tiers[tiers.length - 1];
      return unitOf(t) * qty + flatOf(t);
    }
    let remaining = qty;
    let prevCap = 0;
    let total = 0;
    for (const t of tiers) {
      const cap = t.up_to == null ? Infinity : Number(t.up_to);
      const inTier = Math.max(0, Math.min(remaining, cap - prevCap));
      if (inTier > 0 || prevCap === 0) total += flatOf(t);
      total += unitOf(t) * inTier;
      remaining -= inTier;
      prevCap = cap;
      if (remaining <= 0) break;
    }
    return total;
  }
  const unit = price.unit_amount_decimal != null ? Number(price.unit_amount_decimal) : Number(price.unit_amount ?? price.amount ?? 0);
  const tq = obj(price.transform_quantity);
  if (tq.divide_by) {
    const units = qty / Number(tq.divide_by);
    return unit * (tq.round === "down" ? Math.floor(units) : Math.ceil(units));
  }
  return (Number.isFinite(unit) ? unit : 0) * qty;
}

function discountsOf(row: StripeRecord): StripeRecord[] {
  const list: StripeRecord[] = [];
  const arr = row.discounts as unknown[];
  if (Array.isArray(arr)) for (const d of arr) if (d && typeof d === "object") list.push(d as StripeRecord);
  if (!list.length && row.discount && typeof row.discount === "object") list.push(row.discount as StripeRecord);
  return list;
}

/** Apply forever/repeating, still-running coupons to a monthly amount (major units). */
function applyDiscounts(row: StripeRecord, monthlyMajor: number, currency: string, nowSec: number): number {
  let out = monthlyMajor;
  for (const d of discountsOf(row)) {
    const coupon = obj(obj(d.source).coupon).id ? obj(obj(d.source).coupon) : obj(d.coupon);
    if (!coupon.id && coupon.percent_off == null && coupon.amount_off == null) continue;
    if (d.end != null && Number(d.end) <= nowSec) continue;
    if (String(coupon.duration || "forever") === "once") continue; // one-off, not recurring revenue
    if (coupon.percent_off != null) out *= 1 - Number(coupon.percent_off) / 100;
    else if (coupon.amount_off != null && String(coupon.currency || currency).toLowerCase() === currency.toLowerCase()) {
      // amount_off applies per invoice; normalize by the subscription's billing period.
      const items = (obj(row.items).data as StripeRecord[]) || [];
      const p = obj(obj(items[0]).price);
      const r = obj(p.recurring);
      const months = monthsPerInterval(String(r.interval || "month"), Number(r.interval_count) || 1);
      out -= stripeToMajor(coupon.amount_off, currency) / months;
    }
  }
  return Math.max(0, out);
}

export function mapStripeSubscription(row: StripeRecord, products: ProductNames = {}): NormalizedSubscription {
  const items = (obj(row.items).data as StripeRecord[]) || [];
  const currency = String(row.currency || obj(obj(items[0]).price).currency || "usd");
  const nowSec = Math.floor(Date.now() / 1000);
  let monthlyMajor = 0;
  const names: string[] = [];
  let firstInterval = "month";
  let firstCount = 1;
  items.forEach((item, i) => {
    const price = Object.keys(obj(item.price)).length ? obj(item.price) : obj(item.plan);
    const recurring = obj(price.recurring);
    const interval = String(recurring.interval || price.interval || "month");
    const count = Number(recurring.interval_count || price.interval_count || 1) || 1;
    if (i === 0) {
      firstInterval = interval;
      firstCount = count;
    }
    const minor = itemPeriodMinor(item);
    if (minor != null) monthlyMajor += stripeToMajor(minor, currency) / monthsPerInterval(interval, count);
    const productRef = price.product;
    const productId = typeof productRef === "string" ? productRef : String(obj(productRef).id || "");
    const name =
      (typeof productRef === "object" && obj(productRef).name ? String(obj(productRef).name) : "") ||
      products[productId] ||
      String(price.nickname || price.lookup_key || productId || "Subscription");
    if (!names.includes(name)) names.push(name);
  });
  monthlyMajor = applyDiscounts(row, monthlyMajor, currency, nowSec);
  const status = String(row.status || "active").toLowerCase();
  const cancelledAt = row.ended_at
    ? toIsoTimestamp(Number(row.ended_at) * 1000)
    : status === "canceled" && row.canceled_at
      ? toIsoTimestamp(Number(row.canceled_at) * 1000)
      : null;
  const customer = obj(row.customer);
  return {
    id: `stripe_sub_${row.id}`,
    source: "stripe",
    created: toIsoTimestamp(Number(row.start_date || row.created) * 1000),
    product: names.join(" + ") || "Subscription",
    customerEmail: String(customer.email || ""),
    mrr: roundMoney(monthlyMajor),
    currency: currency.toUpperCase(),
    status,
    cancelledAt,
    interval: canonicalInterval(firstInterval, firstCount),
    rawId: String(row.id),
    country: obj(customer.address).country ? String(obj(customer.address).country).toUpperCase() : undefined,
  };
}

export function mapStripeCustomer(row: StripeRecord): NormalizedCustomer {
  const address = (row.address as StripeRecord) || {};
  return {
    id: `stripe_cust_${row.id}`,
    source: "stripe",
    email: String(row.email || ""),
    name: String(row.name || ""),
    created: toIsoDate(Number(row.created) * 1000),
    rawId: String(row.id),
    country: address.country ? String(address.country).toUpperCase() : undefined,
  };
}

export function mapStripeRefund(row: StripeRecord): NormalizedRefund {
  return {
    id: `stripe_re_${row.id}`,
    source: "stripe",
    created: toIsoTimestamp(Number(row.created) * 1000),
    orderId: String((typeof row.charge === "object" ? obj(row.charge).id : row.charge) || row.payment_intent || ""),
    amount: stripeToMajor(row.amount, row.currency),
    currency: String(row.currency || "usd").toUpperCase(),
    status: String(row.status || "succeeded").toLowerCase(),
    rawId: String(row.id),
  };
}

function authHeader(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
}

/** Restricted-key permission (Dashboard label) each list endpoint needs. */
export const STRIPE_PERMISSION: Record<string, string> = {
  "/charges": "Charges and Refunds: Read",
  "/refunds": "Charges and Refunds: Read",
  "/customers": "Customers: Read",
  "/subscriptions": "Subscriptions: Read",
};

export class StripePermissionError extends Error {}

function stripeErrorMessage(data: unknown): string {
  const err = (data as { error?: { message?: string } })?.error;
  return err?.message ? String(err.message) : "";
}

/** Product names for nicer labels. Optional: needs Products: Read; silently skipped on 403. */
function fetchProductNames(apiKey: string): ProductNames {
  const out: ProductNames = {};
  let after: string | undefined;
  for (let page = 0; page < 10; page++) {
    const q: Array<[string, string]> = [["limit", "100"]];
    if (after) q.push(["starting_after", after]);
    let res: { status: number; data: StripeList };
    try {
      res = fetchJsonSync<StripeList>(`${BASE}/products?${buildQuery(q)}`, { headers: authHeader(apiKey) });
    } catch {
      return out;
    }
    if (res.status >= 400) return out;
    const items = res.data.data || [];
    for (const p of items) out[String(p.id)] = String(p.name || p.id);
    if (!res.data.has_more || !items.length) return out;
    after = String(items[items.length - 1].id);
  }
  return out;
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
      return "/charges";
  }
}

function mapFor(resource: SyncResource, products: ProductNames = {}): (row: StripeRecord) => unknown {
  switch (resource) {
    case "subscriptions":
      return (row: StripeRecord) => mapStripeSubscription(row, products);
    case "customers":
      return mapStripeCustomer;
    case "refunds":
      return mapStripeRefund;
    default:
      return mapStripeCharge;
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

function paginateBudgetSync(
  path: string,
  apiKey: string,
  mapFn: (row: StripeRecord) => unknown,
  startAfter: string | undefined,
  cursor: SyncCursor | undefined,
  maxPages: number,
): { items: unknown[]; next: string | undefined; pagesUsed: number; incomplete: boolean } {
  const out: unknown[] = [];
  let startingAfter = startAfter;
  let pages = 0;
  const floor = Math.floor((Date.now() - STRIPE_HISTORY_DAYS * 86400000) / 1000);
  const since = cursor?.lastSyncedAt ? Math.floor(Date.parse(cursor.lastSyncedAt) / 1000) : NaN;
  // Only payments are history-capped; active subscriptions/customers can be older than 24 months.
  const capped = path === "/charges" || path === "/refunds";
  // Subscriptions/customers are always fetched in full: an incremental created[gte] filter
  // would miss status changes (cancellations, upgrades) on older subscriptions.
  const createdFloor = capped ? (Number.isNaN(since) ? floor : Math.max(floor, since)) : NaN;
  while (pages < maxPages && (pages === 0 || !deadlinePassed())) {
    pages += 1;
    const params: Array<[string, string]> = [["limit", String(Math.min(CONFIG.PAGE_SIZE, 100))]];
    if (startingAfter) params.push(["starting_after", startingAfter]);
    // Initial backfill is capped at 24 months; keep the same filter on every page so
    // starting_after pagination stays consistent.
    if (!Number.isNaN(createdFloor)) params.push(["created[gte]", String(createdFloor)]);
    if (path === "/subscriptions") {
      // Default list excludes canceled; we need them for churn. Expand customer for email/country.
      params.push(["status", "all"], ["expand[]", "data.customer"], ["expand[]", "data.discounts"]);
    }
    const url = `${BASE}${path}?${buildQuery(params)}`;
    const { status, data } = fetchJsonSync<StripeList>(url, { headers: authHeader(apiKey) });
    if (status === 401) {
      throw new Error(
        `Stripe rejected the API key (401)${stripeErrorMessage(data) ? `: ${stripeErrorMessage(data)}` : ""}. Paste a valid restricted key (rk_live_...).`,
      );
    }
    if (status === 403) {
      throw new StripePermissionError(STRIPE_PERMISSION[path] || path);
    }
    if (status >= 400) {
      throw new Error(`Stripe error ${status} on ${path}${stripeErrorMessage(data) ? `: ${stripeErrorMessage(data)}` : ""}`);
    }
    const items = data.data || [];
    for (const item of items) out.push(mapFn(item));
    if (!data.has_more || !items.length) {
      return { items: out, next: undefined, pagesUsed: pages, incomplete: false };
    }
    startingAfter = String(items[items.length - 1].id);
  }
  return { items: out, next: startingAfter, pagesUsed: pages, incomplete: Boolean(startingAfter) };
}

export function fetchStripeResultSync(
  apiKey: string,
  cursor?: SyncCursor,
  maxPages = CONFIG.MAX_PAGES_PER_RUN,
): ImportResult {
  const bundle = emptyBundle();
  let pagesLeft = maxPages;
  let resource: SyncResource | "done" = (cursor?.resource as SyncResource) || "orders";
  if (resource === "sales" || resource === "done") resource = "orders";
  let pageToken = cursor?.pageToken;
  const missing: string[] = [];
  const warn = () =>
    missing.length
      ? [`your restricted key is missing ${missing.join(", ")} (Stripe Dashboard → Developers → API keys → edit key)`]
      : undefined;

  while (pagesLeft > 0 && resource !== "done" && !deadlinePassed()) {
    const path = pathFor(resource);
    let page: ReturnType<typeof paginateBudgetSync>;
    try {
      page = paginateBudgetSync(
        path,
        apiKey,
        mapFor(resource, resource === "subscriptions" ? fetchProductNames(apiKey) : {}),
        pageToken,
        pageToken ? undefined : cursor,
        pagesLeft,
      );
    } catch (err) {
      if (!(err instanceof StripePermissionError)) throw err;
      // One missing permission must not abort the whole store: skip this resource.
      if (!missing.includes(err.message)) missing.push(err.message);
      pagesLeft -= 1;
      pageToken = undefined;
      resource = nextResource(resource);
      continue;
    }
    assignResource(bundle, resource, page.items);
    pagesLeft -= page.pagesUsed;
    if (page.incomplete) {
      return {
        bundle,
        cursor: { pageToken: page.next, resource, backfillComplete: false },
        incomplete: true,
        warnings: warn(),
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
      warnings: warn(),
    };
  }
  return { bundle, cursor: completedCursor(new Date().toISOString()), incomplete: false, warnings: warn() };
}

export function fetchStripeSync(apiKey: string, cursor?: SyncCursor): ImportBundle {
  return fetchStripeResultSync(apiKey, cursor, CONFIG.MAX_PAGES).bundle;
}

export async function fetchStripe(
  apiKey: string,
  cursor?: SyncCursor,
  fetchImpl?: typeof fetch,
): Promise<ImportBundle> {
  if (!fetchImpl) return fetchStripeSync(apiKey, cursor);
  // Async test path: single-page charges for mapper coverage via sync result with full budget.
  void fetchJson;
  return fetchStripeSync(apiKey, cursor);
}

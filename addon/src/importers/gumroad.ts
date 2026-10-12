/**
 * Gumroad importer (https://gumroad.com/api, API v2).
 * - Auth: access_token query param.
 * - /v2/sales: page_key cursor (next_page_key), optional `after=YYYY-MM-DD`.
 * - /v2/products: page_key cursor, 100/page.
 * - /v2/products/:id/subscribers?paginated=true: page_key cursor, 100/page. Returns only
 *   *active* subscriptions (alive / pending_cancellation / pending_failure), with no price —
 *   price comes from the subscription's sales, falling back to the product's recurrence price.
 *   Because ended subscriptions disappear from the list, results are a full snapshot
 *   (`subscriptionsSnapshot`) and previously-seen subscriptions that vanish are marked cancelled.
 */
import { deadlinePassed } from "../lib/deadline";
import { buildQuery } from "../lib/query";
import { CONFIG } from "../lib/config";
import { completedCursor } from "../lib/backfill";
import { normalizeBillingInterval, roundMoney, toMonthlyAmount } from "../lib/intervals";
import { fetchJsonSync, toIsoDate, toIsoTimestamp } from "../lib/http";
import { toMajor } from "../lib/money";
import type {
  ImportBundle,
  ImportResult,
  NormalizedCustomer,
  NormalizedOrder,
  NormalizedRefund,
  NormalizedSubscription,
  SyncCursor,
} from "./types";

const BASE = "https://api.gumroad.com/v2";

type GumRecord = Record<string, unknown>;

function saleCurrency(row: GumRecord, fallback = "usd"): string {
  return String(row.currency || row.currency_code || fallback).toLowerCase();
}

/** Refunded amount (major units) for a sale; partial refunds via amount_refundable_in_currency. */
function refundedMajor(row: GumRecord): number {
  const currency = saleCurrency(row);
  const price = toMajor(row.price ?? 0, currency);
  if (row.refunded || row.chargedback) return price;
  if (row.partially_refunded) {
    const refundable = Number(row.amount_refundable_in_currency);
    if (Number.isFinite(refundable)) return Math.max(0, roundMoney(price - refundable));
  }
  return 0;
}

export function mapGumroadSaleStrict(row: GumRecord): NormalizedOrder {
  const currency = saleCurrency(row);
  const status = row.chargedback
    ? "chargeback"
    : row.refunded
      ? "refunded"
      : row.partially_refunded
        ? "partially_refunded"
        : "paid";
  return {
    id: `gumroad_sale_${row.id || row.sale_id}`,
    source: "gumroad",
    created: toIsoTimestamp(String(row.created_at || "")),
    product: String(row.product_name || "Product"),
    customerEmail: String(row.email || row.purchase_email || ""),
    amount: toMajor(row.price ?? 0, currency),
    currency: currency.toUpperCase(),
    status,
    rawId: String(row.id || row.sale_id || ""),
    country: row.country_iso2 ? String(row.country_iso2).toUpperCase() : undefined,
  };
}

export interface GumroadSubPricing {
  /** Billed amount per period in the smallest unit. */
  priceCents?: number;
  currency?: string;
}

/**
 * Status mapping (docs): alive → active (trialing while free_trial_ends_at is in the future),
 * pending_cancellation → active (paid until the period ends), pending_failure → past_due,
 * failed_payment / fixed_subscription_period_ended / cancelled → canceled.
 */
export function mapGumroadSubscriber(row: GumRecord, pricing: GumroadSubPricing = {}): NormalizedSubscription {
  const currency = String(pricing.currency || row.currency || "usd");
  const cents = Number(pricing.priceCents ?? row.price ?? row.recurrence_price ?? 0) || 0;
  const interval = normalizeBillingInterval(String(row.recurrence || "monthly"));
  const mrr = roundMoney(toMonthlyAmount(toMajor(cents, currency), interval));
  const raw = String(row.status || (row.cancelled || row.ended_at ? "cancelled" : row.failed ? "pending_failure" : "alive")).toLowerCase();
  const trialEnd = row.free_trial_ends_at ? Date.parse(String(row.free_trial_ends_at)) : NaN;
  let status: string;
  if (raw === "alive") status = !Number.isNaN(trialEnd) && trialEnd > Date.now() ? "trialing" : "active";
  else if (raw === "pending_cancellation") status = "active";
  else if (raw === "pending_failure") status = "past_due";
  else status = "canceled";
  const endedRaw = status === "canceled" ? row.ended_at || row.failed_at || row.cancelled_at || row.updated_at : null;
  return {
    id: `gumroad_sub_${row.id || row.subscriber_id}`,
    source: "gumroad",
    created: toIsoTimestamp(String(row.created_at || "")),
    product: String(row.product_name || "Membership"),
    customerEmail: String(row.user_email || row.email || ""),
    mrr,
    currency: currency.toUpperCase(),
    status,
    cancelledAt: endedRaw ? toIsoTimestamp(String(endedRaw)) : null,
    interval,
    rawId: String(row.id || row.subscriber_id || ""),
  };
}

export function mapGumroadCustomerFromSale(row: GumRecord): NormalizedCustomer {
  const email = String(row.email || row.purchase_email || "");
  return {
    id: `gumroad_cust_${email || row.id}`,
    source: "gumroad",
    email,
    name: String(row.full_name || row.name || ""),
    created: toIsoDate(String(row.created_at || "")),
    rawId: email || String(row.id || ""),
    country: row.country_iso2 ? String(row.country_iso2).toUpperCase() : undefined,
  };
}

export function mapGumroadRefundFromSale(row: GumRecord): NormalizedRefund | null {
  const amount = refundedMajor(row);
  if (amount <= 0) return null;
  const currency = saleCurrency(row);
  return {
    id: `gumroad_refund_${row.id || row.sale_id}`,
    source: "gumroad",
    // Gumroad exposes no refund timestamp; the sale date is the best available.
    created: toIsoTimestamp(String(row.refunded_at || row.created_at || "")),
    orderId: String(row.id || row.sale_id || ""),
    amount,
    currency: currency.toUpperCase(),
    status: row.chargedback ? "chargeback" : "succeeded",
    rawId: String(row.id || row.sale_id || ""),
  };
}

function get<T>(path: string, params: Record<string, string | undefined>): { status: number; data: T } {
  return fetchJsonSync<T>(`${BASE}${path}?${buildQuery(params)}`);
}

function checkAuth(status: number, data: { message?: string }): void {
  if (status === 401 || status === 403) throw new Error("Gumroad rejected the access token (generate one under Settings → Advanced → Applications).");
  if (status >= 400) throw new Error(`Gumroad error ${status}${data?.message ? `: ${data.message}` : ""}`);
}

interface SalesPage {
  sales: GumRecord[];
  nextPageKey?: string;
  incomplete: boolean;
}

/** Sales via page_key cursor. `after` (date) only applies to the first page of an incremental run. */
export function fetchSalesPageSync(apiKey: string, cursor?: SyncCursor, maxPages = CONFIG.MAX_PAGES_PER_RUN): SalesPage {
  const out: GumRecord[] = [];
  if (cursor?.resource && cursor.resource !== "sales") return { sales: [], incomplete: false };
  let pageKey = cursor?.pageToken;
  let pages = 0;
  while (pages < maxPages && (pages === 0 || !deadlinePassed())) {
    pages += 1;
    const after = cursor?.lastSyncedAt ? new Date(Date.parse(cursor.lastSyncedAt) - 60 * 86400000).toISOString().slice(0, 10) : undefined;
    const { status, data } = get<{ sales?: GumRecord[]; next_page_key?: string; message?: string }>("/sales", {
      access_token: apiKey,
      page_key: pageKey,
      // 60-day look-back so refunds on recent sales are picked up.
      after,
    });
    checkAuth(status, data);
    const sales = data.sales || [];
    out.push(...sales);
    const next = data.next_page_key ? String(data.next_page_key) : undefined;
    if (!next || !sales.length) return { sales: out, incomplete: false };
    pageKey = next;
  }
  return { sales: out, nextPageKey: pageKey, incomplete: Boolean(pageKey) };
}

interface ProductInfo {
  id: string;
  name: string;
  currency: string;
  /** recurrence → lowest price in cents. */
  recurrencePrices: Record<string, number>;
  price: number;
}

function fetchProducts(apiKey: string): ProductInfo[] {
  const out: ProductInfo[] = [];
  let pageKey: string | undefined;
  for (let i = 0; i < 50; i++) {
    const { status, data } = get<{ products?: GumRecord[]; next_page_key?: string; message?: string }>("/products", {
      access_token: apiKey,
      page_key: pageKey,
    });
    checkAuth(status, data);
    for (const p of data.products || []) {
      const rec: Record<string, number> = {};
      for (const v of (p.variants as GumRecord[]) || []) {
        for (const o of (v.options as GumRecord[]) || []) {
          const rp = (o.recurrence_prices as Record<string, GumRecord> | null) || {};
          for (const [k, val] of Object.entries(rp)) {
            const c = Number(val?.price_cents);
            if (Number.isFinite(c) && (rec[k] == null || c < rec[k])) rec[k] = c;
          }
        }
      }
      out.push({ id: String(p.id), name: String(p.name || ""), currency: String(p.currency || "usd"), recurrencePrices: rec, price: Number(p.price) || 0 });
    }
    if (!data.next_page_key) break;
    pageKey = String(data.next_page_key);
  }
  return out;
}

function fetchSubscribers(apiKey: string, products: ProductInfo[]): GumRecord[] {
  const out: GumRecord[] = [];
  for (const product of products) {
    let pageKey: string | undefined;
    for (let i = 0; i < 500; i++) {
      const { status, data } = get<{ subscribers?: GumRecord[]; next_page_key?: string; message?: string }>(
        `/products/${encodeURIComponent(product.id)}/subscribers`,
        { access_token: apiKey, paginated: "true", page_key: pageKey },
      );
      if (status === 404) break; // not a membership product
      checkAuth(status, data);
      for (const s of data.subscribers || []) out.push({ ...s, product_name: product.name || s.product_name, _product: product });
      if (!data.next_page_key) break;
      pageKey = String(data.next_page_key);
    }
  }
  return out;
}

function bundleFrom(sales: GumRecord[], subscribers: GumRecord[]): ImportBundle {
  const orders = sales.map(mapGumroadSaleStrict);
  const refunds = sales.map(mapGumroadRefundFromSale).filter((r): r is NormalizedRefund => r != null);
  const customersMap = new Map<string, NormalizedCustomer>();
  for (const sale of sales) {
    const c = mapGumroadCustomerFromSale(sale);
    if (c.email) customersMap.set(c.email, c);
  }
  // Latest recurring charge per subscription → its price.
  const latestBySub = new Map<string, GumRecord>();
  for (const s of sales) {
    const sid = String(s.subscription_id || "");
    if (!sid) continue;
    const prev = latestBySub.get(sid);
    if (!prev || Date.parse(String(s.created_at)) > Date.parse(String(prev.created_at))) latestBySub.set(sid, s);
  }
  const subscriptions = subscribers.map((row) => {
    const product = row._product as ProductInfo | undefined;
    const sale = latestBySub.get(String(row.id));
    const recurrence = String(row.recurrence || "monthly");
    const priceCents = sale
      ? Number(sale.price)
      : product
        ? (product.recurrencePrices[recurrence] ?? product.price)
        : undefined;
    const clean = { ...row };
    delete clean._product;
    return mapGumroadSubscriber(clean, { priceCents, currency: sale ? saleCurrency(sale, product?.currency) : product?.currency });
  });
  return { orders, subscriptions, customers: [...customersMap.values()], refunds };
}

function emptyBundle(): ImportBundle {
  return { orders: [], subscriptions: [], customers: [], refunds: [] };
}

/**
 * Chunked Gumroad import: sales page through page_key (resumable); once sales are done the
 * active-subscriber snapshot is fetched in the same run.
 */
export function fetchGumroadResultSync(apiKey: string, cursor?: SyncCursor, maxPages = CONFIG.MAX_PAGES_PER_RUN): ImportResult {
  const resource = cursor?.resource || "sales";
  let sales: GumRecord[] = [];
  if (resource === "sales" || resource === "orders") {
    const page = fetchSalesPageSync(apiKey, { ...cursor, resource: "sales" }, maxPages);
    if (page.incomplete) {
      return {
        bundle: bundleFrom(page.sales, []),
        cursor: { pageToken: page.nextPageKey, resource: "sales", backfillComplete: false, lastSyncedAt: cursor?.lastSyncedAt },
        incomplete: true,
      };
    }
    sales = page.sales;
    if (deadlinePassed()) {
      return {
        bundle: bundleFrom(sales, []),
        cursor: { pageToken: undefined, resource: "subscriptions", backfillComplete: false, lastSyncedAt: cursor?.lastSyncedAt },
        incomplete: true,
      };
    }
  }
  const products = fetchProducts(apiKey);
  const subscribers = fetchSubscribers(apiKey, products);
  return {
    bundle: bundleFrom(sales, subscribers),
    cursor: completedCursor(new Date().toISOString()),
    incomplete: false,
    subscriptionsSnapshot: true,
  };
}

export function fetchGumroadSync(apiKey: string, cursor?: SyncCursor): ImportBundle {
  return fetchGumroadResultSync(apiKey, cursor, CONFIG.MAX_PAGES).bundle;
}

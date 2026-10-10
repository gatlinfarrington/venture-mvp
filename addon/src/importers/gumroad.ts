import { CONFIG } from "../lib/config";
import { fetchJson, fetchJsonSync, toIsoDate, toIsoTimestamp } from "../lib/http";
import type {
  ImportBundle,
  NormalizedCustomer,
  NormalizedOrder,
  NormalizedRefund,
  NormalizedSubscription,
  SyncCursor,
} from "./types";

const BASE = "https://api.gumroad.com/v2";

type GumRecord = Record<string, unknown>;

export function mapGumroadSaleStrict(row: GumRecord): NormalizedOrder {
  const refunded = Boolean(row.refunded) || Boolean(row.chargedback);
  const cents = Number(row.price ?? 0);
  return {
    id: `gumroad_sale_${row.id || row.sale_id}`,
    source: "gumroad",
    created: toIsoTimestamp(String(row.created_at || "")),
    product: String(row.product_name || "Product"),
    customerEmail: String(row.email || ""),
    amount: Math.round(cents) / 100,
    currency: String(row.currency || "USD").toUpperCase(),
    status: refunded ? (row.chargedback ? "chargeback" : "refunded") : "paid",
    rawId: String(row.id || row.sale_id || ""),
  };
}

export function mapGumroadSubscriber(row: GumRecord): NormalizedSubscription {
  const cents = Number(row.price ?? row.recurrence_price ?? 0);
  const interval = normalizeInterval(String(row.recurrence || "monthly"));
  const major = Math.round(cents) / 100;
  const mrr = interval === "year" ? major / 12 : major;
  const cancelled = Boolean(row.cancelled) || Boolean(row.ended_at);
  const status = cancelled ? "cancelled" : row.failed ? "past_due" : "active";

  return {
    id: `gumroad_sub_${row.id || row.subscriber_id}`,
    source: "gumroad",
    created: toIsoTimestamp(String(row.created_at || "")),
    product: String(row.product_name || "Membership"),
    customerEmail: String(row.user_email || row.email || ""),
    mrr: Math.round(mrr * 100) / 100,
    currency: "USD",
    status,
    cancelledAt: cancelled
      ? toIsoTimestamp(String(row.ended_at || row.cancelled_at || row.updated_at || ""))
      : null,
    interval,
    rawId: String(row.id || row.subscriber_id || ""),
  };
}

export function mapGumroadCustomerFromSale(row: GumRecord): NormalizedCustomer {
  const email = String(row.email || "");
  return {
    id: `gumroad_cust_${email || row.id}`,
    source: "gumroad",
    email,
    name: String(row.full_name || row.name || ""),
    created: toIsoDate(String(row.created_at || "")),
    rawId: email || String(row.id || ""),
  };
}

export function mapGumroadRefundFromSale(row: GumRecord): NormalizedRefund | null {
  if (!row.refunded && !row.chargedback) return null;
  const cents = Number(row.price ?? 0);
  return {
    id: `gumroad_refund_${row.id || row.sale_id}`,
    source: "gumroad",
    created: toIsoTimestamp(String(row.refunded_at || row.created_at || "")),
    orderId: String(row.id || row.sale_id || ""),
    amount: Math.round(cents) / 100,
    currency: String(row.currency || "USD").toUpperCase(),
    status: row.chargedback ? "chargeback" : "refunded",
    rawId: String(row.id || row.sale_id || ""),
  };
}

function normalizeInterval(raw: string): NormalizedSubscription["interval"] {
  const v = raw.toLowerCase();
  if (v.includes("year") || v.includes("annual")) return "year";
  if (v.includes("week")) return "week";
  if (v.includes("day")) return "day";
  if (v.includes("month")) return "month";
  return "month";
}

function fetchSalesSync(apiKey: string, cursor?: SyncCursor): GumRecord[] {
  const out: GumRecord[] = [];
  let page = 1;
  while (page <= CONFIG.MAX_PAGES) {
    const url = `${BASE}/sales?access_token=${encodeURIComponent(apiKey)}&page=${page}`;
    const { status, data } = fetchJsonSync<{ success?: boolean; sales?: GumRecord[] }>(url);
    if (status === 401 || status === 403) throw new Error("Gumroad API key rejected");
    if (status >= 400) throw new Error(`Gumroad sales error ${status}`);
    const sales = data.sales || [];
    if (!sales.length) break;
    for (const sale of sales) {
      if (cursor?.lastSyncedAt) {
        const created = Date.parse(String(sale.created_at || ""));
        const since = Date.parse(cursor.lastSyncedAt);
        if (!Number.isNaN(created) && !Number.isNaN(since) && created < since) continue;
      }
      out.push(sale);
    }
    if (sales.length < 10) break;
    page += 1;
  }
  return out;
}

async function fetchSalesAsync(
  apiKey: string,
  cursor: SyncCursor | undefined,
  fetchImpl: typeof fetch,
): Promise<GumRecord[]> {
  const out: GumRecord[] = [];
  let page = 1;
  while (page <= CONFIG.MAX_PAGES) {
    const url = `${BASE}/sales?access_token=${encodeURIComponent(apiKey)}&page=${page}`;
    const { status, data } = await fetchJson<{ success?: boolean; sales?: GumRecord[] }>(url, {
      fetchImpl,
    });
    if (status === 401 || status === 403) throw new Error("Gumroad API key rejected");
    if (status >= 400) throw new Error(`Gumroad sales error ${status}`);
    const sales = data.sales || [];
    if (!sales.length) break;
    for (const sale of sales) {
      if (cursor?.lastSyncedAt) {
        const created = Date.parse(String(sale.created_at || ""));
        const since = Date.parse(cursor.lastSyncedAt);
        if (!Number.isNaN(created) && !Number.isNaN(since) && created < since) continue;
      }
      out.push(sale);
    }
    if (sales.length < 10) break;
    page += 1;
  }
  return out;
}

function fetchSubscribersSync(apiKey: string): GumRecord[] {
  const productsUrl = `${BASE}/products?access_token=${encodeURIComponent(apiKey)}`;
  const { status, data } = fetchJsonSync<{ products?: GumRecord[] }>(productsUrl);
  if (status >= 400) return [];
  const products = data.products || [];
  const out: GumRecord[] = [];
  for (const product of products) {
    const id = String(product.id || "");
    if (!id) continue;
    let page = 1;
    while (page <= 50) {
      const url = `${BASE}/products/${id}/subscribers?access_token=${encodeURIComponent(apiKey)}&page=${page}`;
      const res = fetchJsonSync<{ subscribers?: GumRecord[] }>(url);
      const subs = res.data.subscribers || [];
      if (!subs.length) break;
      for (const s of subs) out.push({ ...s, product_name: product.name || s.product_name });
      if (subs.length < 10) break;
      page += 1;
    }
  }
  return out;
}

async function fetchSubscribersAsync(apiKey: string, fetchImpl: typeof fetch): Promise<GumRecord[]> {
  const productsUrl = `${BASE}/products?access_token=${encodeURIComponent(apiKey)}`;
  const { status, data } = await fetchJson<{ products?: GumRecord[] }>(productsUrl, { fetchImpl });
  if (status >= 400) return [];
  const products = data.products || [];
  const out: GumRecord[] = [];
  for (const product of products) {
    const id = String(product.id || "");
    if (!id) continue;
    let page = 1;
    while (page <= 50) {
      const url = `${BASE}/products/${id}/subscribers?access_token=${encodeURIComponent(apiKey)}&page=${page}`;
      const res = await fetchJson<{ subscribers?: GumRecord[] }>(url, { fetchImpl });
      const subs = res.data.subscribers || [];
      if (!subs.length) break;
      for (const s of subs) out.push({ ...s, product_name: product.name || s.product_name });
      if (subs.length < 10) break;
      page += 1;
    }
  }
  return out;
}

function bundleFrom(sales: GumRecord[], subscribers: GumRecord[]): ImportBundle {
  const orders = sales.map(mapGumroadSaleStrict);
  const refunds = sales
    .map(mapGumroadRefundFromSale)
    .filter((r): r is NormalizedRefund => r != null);
  const customersMap = new Map<string, NormalizedCustomer>();
  for (const sale of sales) {
    const c = mapGumroadCustomerFromSale(sale);
    if (c.email) customersMap.set(c.email, c);
  }
  return {
    orders,
    subscriptions: subscribers.map(mapGumroadSubscriber),
    customers: [...customersMap.values()],
    refunds,
  };
}

export function fetchGumroadSync(apiKey: string, cursor?: SyncCursor): ImportBundle {
  return bundleFrom(fetchSalesSync(apiKey, cursor), fetchSubscribersSync(apiKey));
}

export async function fetchGumroad(
  apiKey: string,
  cursor?: SyncCursor,
  fetchImpl?: typeof fetch,
): Promise<ImportBundle> {
  if (!fetchImpl) return fetchGumroadSync(apiKey, cursor);
  const sales = await fetchSalesAsync(apiKey, cursor, fetchImpl);
  const subscribers = await fetchSubscribersAsync(apiKey, fetchImpl);
  return bundleFrom(sales, subscribers);
}

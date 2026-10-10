import { CONFIG } from "../lib/config";
import { completedCursor } from "../lib/backfill";
import { normalizeBillingInterval, roundMoney, toMonthlyAmount } from "../lib/intervals";
import { fetchJson, fetchJsonSync, toIsoDate, toIsoTimestamp } from "../lib/http";
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
  const interval = normalizeBillingInterval(String(row.recurrence || "monthly"));
  const major = Math.round(cents) / 100;
  const mrr = roundMoney(toMonthlyAmount(major, interval));
  const cancelled = Boolean(row.cancelled) || Boolean(row.ended_at);
  const status = cancelled ? "cancelled" : row.failed ? "past_due" : "active";

  return {
    id: `gumroad_sub_${row.id || row.subscriber_id}`,
    source: "gumroad",
    created: toIsoTimestamp(String(row.created_at || "")),
    product: String(row.product_name || "Membership"),
    customerEmail: String(row.user_email || row.email || ""),
    mrr,
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

interface SalesPage {
  sales: GumRecord[];
  nextPageKey?: string;
  incomplete: boolean;
}

/**
 * Fetch Gumroad sales via cursor pagination (`page_key` / `next_page_key`).
 * The offset `page` parameter is deprecated and returns 400 on large accounts.
 * Each response is ~10 sales; we stop after MAX_PAGES_PER_RUN and return the next key.
 */
export function fetchSalesPageSync(
  apiKey: string,
  cursor?: SyncCursor,
  maxPages = CONFIG.MAX_PAGES_PER_RUN,
): SalesPage {
  const out: GumRecord[] = [];
  let pageKey = cursor?.resource === "sales" || !cursor?.resource ? cursor?.pageToken : undefined;
  // Fresh backfill / incremental: no pageKey yet
  if (cursor?.resource && cursor.resource !== "sales") {
    return { sales: [], incomplete: false };
  }
  let pages = 0;
  while (pages < maxPages) {
    pages += 1;
    const params = new URLSearchParams({ access_token: apiKey });
    if (pageKey) params.set("page_key", pageKey);
    if (cursor?.lastSyncedAt && !pageKey) {
      // Incremental watermark only on first page of an incremental run
      params.set("after", cursor.lastSyncedAt.slice(0, 10));
    }
    const url = `${BASE}/sales?${params.toString()}`;
    const { status, data } = fetchJsonSync<{
      success?: boolean;
      sales?: GumRecord[];
      next_page_key?: string;
    }>(url);
    if (status === 401 || status === 403) throw new Error("Gumroad API key rejected");
    if (status >= 400) {
      throw new Error(
        `Gumroad sales error ${status} (use page_key pagination; offset page is deprecated)`,
      );
    }
    const sales = data.sales || [];
    for (const sale of sales) out.push(sale);
    const next = data.next_page_key ? String(data.next_page_key) : undefined;
    if (!next || !sales.length) {
      return { sales: out, nextPageKey: undefined, incomplete: false };
    }
    pageKey = next;
  }
  return { sales: out, nextPageKey: pageKey, incomplete: Boolean(pageKey) };
}

export async function fetchSalesPageAsync(
  apiKey: string,
  cursor: SyncCursor | undefined,
  fetchImpl: typeof fetch,
  maxPages = CONFIG.MAX_PAGES_PER_RUN,
): Promise<SalesPage> {
  const out: GumRecord[] = [];
  let pageKey = cursor?.resource === "sales" || !cursor?.resource ? cursor?.pageToken : undefined;
  if (cursor?.resource && cursor.resource !== "sales") {
    return { sales: [], incomplete: false };
  }
  let pages = 0;
  while (pages < maxPages) {
    pages += 1;
    const params = new URLSearchParams({ access_token: apiKey });
    if (pageKey) params.set("page_key", pageKey);
    if (cursor?.lastSyncedAt && !pageKey) {
      params.set("after", cursor.lastSyncedAt.slice(0, 10));
    }
    const url = `${BASE}/sales?${params.toString()}`;
    const { status, data } = await fetchJson<{
      success?: boolean;
      sales?: GumRecord[];
      next_page_key?: string;
    }>(url, { fetchImpl });
    if (status === 401 || status === 403) throw new Error("Gumroad API key rejected");
    if (status >= 400) {
      throw new Error(
        `Gumroad sales error ${status} (use page_key pagination; offset page is deprecated)`,
      );
    }
    const sales = data.sales || [];
    for (const sale of sales) out.push(sale);
    const next = data.next_page_key ? String(data.next_page_key) : undefined;
    if (!next || !sales.length) {
      return { sales: out, nextPageKey: undefined, incomplete: false };
    }
    pageKey = next;
  }
  return { sales: out, nextPageKey: pageKey, incomplete: Boolean(pageKey) };
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

function emptyBundle(): ImportBundle {
  return { orders: [], subscriptions: [], customers: [], refunds: [] };
}

/**
 * Chunked Gumroad import. Sales use page_key; when the page budget is hit,
 * returns incomplete=true with cursor.pageToken = next_page_key for resume.
 * Subscribers load after sales complete (same run if budget remains, else next run).
 */
export function fetchGumroadResultSync(
  apiKey: string,
  cursor?: SyncCursor,
  maxPages = CONFIG.MAX_PAGES_PER_RUN,
): ImportResult {
  const resource = cursor?.resource || "sales";

  if (resource === "sales" || resource === undefined) {
    const page = fetchSalesPageSync(apiKey, { ...cursor, resource: "sales" }, maxPages);
    if (page.incomplete) {
      return {
        bundle: bundleFrom(page.sales, []),
        cursor: {
          pageToken: page.nextPageKey,
          resource: "sales",
          backfillComplete: false,
        },
        incomplete: true,
      };
    }
    // Sales done — pull subscribers in the same run
    const subscribers = fetchSubscribersSync(apiKey);
    return {
      bundle: bundleFrom(page.sales, subscribers),
      cursor: completedCursor(new Date().toISOString()),
      incomplete: false,
    };
  }

  if (resource === "subscriptions") {
    const subscribers = fetchSubscribersSync(apiKey);
    return {
      bundle: { ...emptyBundle(), subscriptions: subscribers.map(mapGumroadSubscriber) },
      cursor: completedCursor(new Date().toISOString()),
      incomplete: false,
    };
  }

  return {
    bundle: emptyBundle(),
    cursor: completedCursor(new Date().toISOString()),
    incomplete: false,
  };
}

export async function fetchGumroadResult(
  apiKey: string,
  cursor?: SyncCursor,
  fetchImpl?: typeof fetch,
  maxPages = CONFIG.MAX_PAGES_PER_RUN,
): Promise<ImportResult> {
  if (!fetchImpl) return fetchGumroadResultSync(apiKey, cursor, maxPages);
  const resource = cursor?.resource || "sales";
  if (resource === "sales" || resource === undefined) {
    const page = await fetchSalesPageAsync(
      apiKey,
      { ...cursor, resource: "sales" },
      fetchImpl,
      maxPages,
    );
    if (page.incomplete) {
      return {
        bundle: bundleFrom(page.sales, []),
        cursor: {
          pageToken: page.nextPageKey,
          resource: "sales",
          backfillComplete: false,
        },
        incomplete: true,
      };
    }
    const subscribers = await fetchSubscribersAsync(apiKey, fetchImpl);
    return {
      bundle: bundleFrom(page.sales, subscribers),
      cursor: completedCursor(new Date().toISOString()),
      incomplete: false,
    };
  }
  if (resource === "subscriptions") {
    const subscribers = await fetchSubscribersAsync(apiKey, fetchImpl);
    return {
      bundle: { ...emptyBundle(), subscriptions: subscribers.map(mapGumroadSubscriber) },
      cursor: completedCursor(new Date().toISOString()),
      incomplete: false,
    };
  }
  return {
    bundle: emptyBundle(),
    cursor: completedCursor(new Date().toISOString()),
    incomplete: false,
  };
}

/** @deprecated Prefer fetchGumroadResultSync — kept for callers expecting ImportBundle. */
export function fetchGumroadSync(apiKey: string, cursor?: SyncCursor): ImportBundle {
  return fetchGumroadResultSync(apiKey, cursor).bundle;
}

export async function fetchGumroad(
  apiKey: string,
  cursor?: SyncCursor,
  fetchImpl?: typeof fetch,
): Promise<ImportBundle> {
  return (await fetchGumroadResult(apiKey, cursor, fetchImpl)).bundle;
}

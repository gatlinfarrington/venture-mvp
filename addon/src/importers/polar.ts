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

const BASE = "https://api.polar.sh/v1";

interface PolarPage<T> {
  items?: T[];
  result?: T[];
  pagination?: { next_page?: string | null };
  next?: string | null;
}

type PolarRecord = Record<string, unknown>;

export function mapPolarOrder(row: PolarRecord): NormalizedOrder {
  const product =
    (row.product as PolarRecord)?.name ||
    (row.product_name as string) ||
    (row.description as string) ||
    "Product";
  const customer = (row.customer as PolarRecord) || {};
  const amount =
    row.amount != null
      ? centsToMajor(row.amount as number)
      : centsToMajor((row.net_amount as number) ?? (row.total_amount as number) ?? 0);

  return {
    id: `polar_order_${row.id}`,
    source: "polar",
    created: toIsoTimestamp(String(row.created_at || row.createdAt || "")),
    product: String(product),
    customerEmail: String(customer.email || row.email || ""),
    amount,
    currency: String(row.currency || "USD").toUpperCase(),
    status: String(row.status || "paid").toLowerCase(),
    rawId: String(row.id),
  };
}

export function mapPolarSubscription(row: PolarRecord): NormalizedSubscription {
  const price = (row.price as PolarRecord) || {};
  const product = (row.product as PolarRecord) || {};
  const customer = (row.customer as PolarRecord) || {};
  const amountCents =
    (price.price_amount as number) ??
    (row.amount as number) ??
    (row.recurring_interval_amount as number) ??
    0;
  const interval = normalizeBillingInterval(
    String(price.recurring_interval || row.recurring_interval || "month"),
  );
  const major = centsToMajor(amountCents);
  const mrr = roundMoney(toMonthlyAmount(major, interval));
  const status = String(row.status || "").toLowerCase();
  const cancelledAt = row.ended_at || row.canceled_at || row.cancelled_at || null;

  return {
    id: `polar_sub_${row.id}`,
    source: "polar",
    created: toIsoTimestamp(String(row.created_at || "")),
    product: String(product.name || row.product_name || "Subscription"),
    customerEmail: String(customer.email || row.email || ""),
    mrr,
    currency: String(price.price_currency || row.currency || "USD").toUpperCase(),
    status: status || "active",
    cancelledAt: cancelledAt ? toIsoTimestamp(String(cancelledAt)) : null,
    interval,
    rawId: String(row.id),
  };
}

export function mapPolarCustomer(row: PolarRecord): NormalizedCustomer {
  return {
    id: `polar_cust_${row.id}`,
    source: "polar",
    email: String(row.email || ""),
    name: String(row.name || ""),
    created: toIsoDate(String(row.created_at || "")),
    rawId: String(row.id),
  };
}

export function mapPolarRefund(row: PolarRecord): NormalizedRefund {
  return {
    id: `polar_refund_${row.id}`,
    source: "polar",
    created: toIsoTimestamp(String(row.created_at || row.refunded_at || "")),
    orderId: String(row.order_id || (row.order as PolarRecord)?.id || ""),
    amount: centsToMajor((row.amount as number) ?? 0),
    currency: String(row.currency || "USD").toUpperCase(),
    status: String(row.status || "succeeded").toLowerCase(),
    rawId: String(row.id),
  };
}

function startUrl(path: string, cursor?: SyncCursor): string {
  const params: Record<string, string> = { limit: String(CONFIG.PAGE_SIZE) };
  if (cursor?.lastSyncedAt) params["created_at.gt"] = cursor.lastSyncedAt;
  return `${BASE}${path}?${buildQuery(params)}`;
}

function nextUrl(data: PolarPage<PolarRecord> | PolarRecord[]): string | null {
  if (Array.isArray(data)) return null;
  const next = data.pagination?.next_page || data.next || null;
  if (!next) return null;
  return String(next).startsWith("http") ? String(next) : `${BASE}${next}`;
}

function itemsOf(data: PolarPage<PolarRecord> | PolarRecord[]): PolarRecord[] {
  return Array.isArray(data) ? data : data.items || data.result || [];
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

function mapFor(resource: SyncResource): (row: PolarRecord) => unknown {
  switch (resource) {
    case "subscriptions":
      return mapPolarSubscription;
    case "customers":
      return mapPolarCustomer;
    case "refunds":
      return mapPolarRefund;
    default:
      return mapPolarOrder;
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
  mapFn: (row: PolarRecord) => unknown,
  start: string | null,
  maxPages: number,
): { items: unknown[]; next: string | null; pagesUsed: number; incomplete: boolean } {
  const out: unknown[] = [];
  let url: string | null = start;
  let pages = 0;
  while (url && pages < maxPages) {
    pages += 1;
    const { status, data } = fetchJsonSync<PolarPage<PolarRecord> | PolarRecord[]>(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
    });
    if (status === 401 || status === 403) throw new Error("Polar API key rejected");
    if (status >= 400) {
      if (path === "/refunds") return { items: out, next: null, pagesUsed: pages, incomplete: false };
      throw new Error(`Polar error ${status}`);
    }
    for (const item of itemsOf(data)) out.push(mapFn(item));
    url = nextUrl(data);
  }
  return { items: out, next: url, pagesUsed: pages, incomplete: Boolean(url) };
}

export function fetchPolarResultSync(
  apiKey: string,
  cursor?: SyncCursor,
  maxPages = CONFIG.MAX_PAGES_PER_RUN,
): ImportResult {
  const bundle = emptyBundle();
  let pagesLeft = maxPages;
  let resource: SyncResource | "done" = (cursor?.resource as SyncResource) || "orders";
  let pageToken = cursor?.pageToken;

  while (pagesLeft > 0 && resource !== "done") {
    const path = pathFor(resource);
    const start =
      pageToken ||
      startUrl(path, cursor?.lastSyncedAt && !pageToken ? cursor : undefined);
    const page = paginateBudgetSync(path, apiKey, mapFor(resource), start, pagesLeft);
    assignResource(bundle, resource, page.items);
    pagesLeft -= page.pagesUsed;
    if (page.incomplete) {
      return {
        bundle,
        cursor: { pageToken: page.next || undefined, resource, backfillComplete: false },
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

function paginateSync(
  path: string,
  apiKey: string,
  mapFn: (row: PolarRecord) => unknown,
  cursor?: SyncCursor,
): unknown[] {
  return paginateBudgetSync(
    path,
    apiKey,
    mapFn,
    cursor?.pageToken || startUrl(path, cursor),
    CONFIG.MAX_PAGES,
  ).items;
}

async function paginateAsync(
  path: string,
  apiKey: string,
  mapFn: (row: PolarRecord) => unknown,
  cursor: SyncCursor | undefined,
  fetchImpl: typeof fetch,
): Promise<unknown[]> {
  const out: unknown[] = [];
  let url: string | null = cursor?.pageToken || startUrl(path, cursor);
  let pages = 0;
  while (url && pages < CONFIG.MAX_PAGES) {
    pages += 1;
    const { status, data } = await fetchJson<PolarPage<PolarRecord> | PolarRecord[]>(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
      fetchImpl,
    });
    if (status === 401 || status === 403) throw new Error("Polar API key rejected");
    if (status >= 400) {
      if (path === "/refunds") return out;
      throw new Error(`Polar error ${status}`);
    }
    for (const item of itemsOf(data)) out.push(mapFn(item));
    url = nextUrl(data);
  }
  return out;
}

export function fetchPolarSync(apiKey: string, cursor?: SyncCursor): ImportBundle {
  return fetchPolarResultSync(apiKey, cursor, CONFIG.MAX_PAGES).bundle;
}

export async function fetchPolar(
  apiKey: string,
  cursor?: SyncCursor,
  fetchImpl?: typeof fetch,
): Promise<ImportBundle> {
  if (!fetchImpl) return fetchPolarSync(apiKey, cursor);
  let refunds: NormalizedRefund[] = [];
  try {
    refunds = (await paginateAsync(
      "/refunds",
      apiKey,
      mapPolarRefund,
      cursor,
      fetchImpl,
    )) as NormalizedRefund[];
  } catch {
    refunds = [];
  }
  return {
    orders: (await paginateAsync("/orders", apiKey, mapPolarOrder, cursor, fetchImpl)) as NormalizedOrder[],
    subscriptions: (await paginateAsync(
      "/subscriptions",
      apiKey,
      mapPolarSubscription,
      cursor,
      fetchImpl,
    )) as NormalizedSubscription[],
    customers: (await paginateAsync(
      "/customers",
      apiKey,
      mapPolarCustomer,
      cursor,
      fetchImpl,
    )) as NormalizedCustomer[],
    refunds,
  };
}

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

const BASE = "https://api.lemonsqueezy.com/v1";

interface LsListResponse<T> {
  data?: T[];
  links?: { next?: string | null };
}

interface LsResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
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

export function mapLemonSubscription(resource: LsResource): NormalizedSubscription {
  const a = resource.attributes || {};
  const interval = normalizeBillingInterval(String(a.billing_interval || a.interval || "month"));
  const price = centsToMajor((a.recurring_price as number) ?? (a.price as number) ?? 0);
  const mrr = roundMoney(toMonthlyAmount(price, interval));
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

function mapFor(resource: SyncResource): (r: LsResource) => unknown {
  switch (resource) {
    case "subscriptions":
      return mapLemonSubscription;
    case "customers":
      return mapLemonCustomer;
    case "refunds":
      return mapLemonRefund;
    default:
      return mapLemonOrder;
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
  mapFn: (r: LsResource) => unknown,
  start: string | null,
  maxPages: number,
): { items: unknown[]; nextUrl: string | null; pagesUsed: number; incomplete: boolean } {
  const out: unknown[] = [];
  let url: string | null = start;
  let pages = 0;
  while (url && pages < maxPages) {
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
    for (const item of res.data.data || []) out.push(mapFn(item));
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
  mapFn: (r: LsResource) => unknown,
  cursor: SyncCursor | undefined,
  fetchImpl: typeof fetch,
): Promise<unknown[]> {
  const out: unknown[] = [];
  let url: string | null = cursor?.pageToken || startUrl(path, cursor);
  let pages = 0;
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
    for (const item of res.data.data || []) out.push(mapFn(item));
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
      mapLemonRefund,
      cursor,
      fetchImpl,
    )) as NormalizedRefund[];
  } catch {
    refunds = [];
  }
  return {
    orders: (await paginateAsync("/orders", apiKey, mapLemonOrder, cursor, fetchImpl)) as NormalizedOrder[],
    subscriptions: (await paginateAsync(
      "/subscriptions",
      apiKey,
      mapLemonSubscription,
      cursor,
      fetchImpl,
    )) as NormalizedSubscription[],
    customers: (await paginateAsync(
      "/customers",
      apiKey,
      mapLemonCustomer,
      cursor,
      fetchImpl,
    )) as NormalizedCustomer[],
    refunds,
  };
}

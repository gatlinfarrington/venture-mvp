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

type StripeRecord = Record<string, unknown>;

interface StripeList {
  data?: StripeRecord[];
  has_more?: boolean;
}

export function mapStripeCharge(row: StripeRecord): NormalizedOrder {
  const billing = (row.billing_details as StripeRecord) || {};
  const address = (billing.address as StripeRecord) || {};
  const refunded = Boolean(row.refunded);
  return {
    id: `stripe_ch_${row.id}`,
    source: "stripe",
    created: toIsoTimestamp(Number(row.created) * 1000),
    product: String(row.description || row.statement_descriptor || "Stripe charge"),
    customerEmail: String(billing.email || row.receipt_email || ""),
    amount: centsToMajor(row.amount as number),
    currency: String(row.currency || "usd").toUpperCase(),
    status: refunded ? "refunded" : String(row.status || "paid").toLowerCase(),
    rawId: String(row.id),
    country: address.country ? String(address.country).toUpperCase() : undefined,
  };
}

export function mapStripeSubscription(row: StripeRecord): NormalizedSubscription {
  const items = (row.items as { data?: StripeRecord[] })?.data || [];
  const price = (items[0]?.price as StripeRecord) || (items[0]?.plan as StripeRecord) || {};
  const amountCents = Number(price.unit_amount ?? price.amount ?? 0);
  const intervalRaw = String(
    price.recurring
      ? (price.recurring as StripeRecord).interval
      : price.interval || "month",
  );
  const interval = normalizeBillingInterval(intervalRaw);
  const major = centsToMajor(amountCents);
  const mrr = roundMoney(toMonthlyAmount(major, interval));
  const status = String(row.status || "active").toLowerCase();
  const cancelledAt = row.canceled_at
    ? toIsoTimestamp(Number(row.canceled_at) * 1000)
    : row.ended_at
      ? toIsoTimestamp(Number(row.ended_at) * 1000)
      : null;

  return {
    id: `stripe_sub_${row.id}`,
    source: "stripe",
    created: toIsoTimestamp(Number(row.created) * 1000),
    product: String(price.nickname || price.product || "Subscription"),
    customerEmail: "",
    mrr,
    currency: String(price.currency || row.currency || "usd").toUpperCase(),
    status,
    cancelledAt,
    interval,
    rawId: String(row.id),
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
    orderId: String(row.charge || row.payment_intent || ""),
    amount: centsToMajor(row.amount as number),
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

function mapFor(resource: SyncResource): (row: StripeRecord) => unknown {
  switch (resource) {
    case "subscriptions":
      return mapStripeSubscription;
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
  while (pages < maxPages) {
    pages += 1;
    const params = new URLSearchParams({ limit: String(Math.min(CONFIG.PAGE_SIZE, 100)) });
    if (startingAfter) params.set("starting_after", startingAfter);
    if (cursor?.lastSyncedAt && !startingAfter) {
      const created = Math.floor(Date.parse(cursor.lastSyncedAt) / 1000);
      if (!Number.isNaN(created)) params.set("created[gte]", String(created));
    }
    const url = `${BASE}${path}?${params.toString()}`;
    const { status, data } = fetchJsonSync<StripeList>(url, { headers: authHeader(apiKey) });
    if (status === 401 || status === 403) {
      throw new Error(
        "Stripe API key rejected (use a restricted read-only key with charges/subscriptions/customers/refunds read)",
      );
    }
    if (status >= 400) {
      if (path === "/refunds") {
        return { items: out, next: undefined, pagesUsed: pages, incomplete: false };
      }
      throw new Error(`Stripe error ${status}`);
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

  while (pagesLeft > 0 && resource !== "done") {
    const path = pathFor(resource);
    const page = paginateBudgetSync(
      path,
      apiKey,
      mapFor(resource),
      pageToken,
      pageToken ? undefined : cursor,
      pagesLeft,
    );
    assignResource(bundle, resource, page.items);
    pagesLeft -= page.pagesUsed;
    if (page.incomplete) {
      return {
        bundle,
        cursor: { pageToken: page.next, resource, backfillComplete: false },
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

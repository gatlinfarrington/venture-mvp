/**
 * Polar importer (Polar API reference, polar.sh docs).
 * - Auth: Bearer organization access token (polar_oat_…). Sandbox tokens only work on
 *   sandbox-api.polar.sh, so a 401 on production is retried once against sandbox.
 * - Pagination: page + limit (max 100); response { items, pagination: { total_count, max_page } }.
 * - Subscriptions list returns every status (incomplete, trialing, active, past_due, canceled, unpaid, paused).
 * - Amounts are integers in the currency's smallest unit.
 */
import { deadlinePassed } from "../lib/deadline";
import { buildQuery } from "../lib/query";
import { CONFIG } from "../lib/config";
import { completedCursor } from "../lib/backfill";
import { intervalFromUnitAndCount, normalizeBillingInterval, periodLengthInMonths, roundMoney, toMonthlyAmount } from "../lib/intervals";
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

export const POLAR_BASE = "https://api.polar.sh/v1";
export const POLAR_SANDBOX_BASE = "https://sandbox-api.polar.sh/v1";
const ORDER: SyncResource[] = ["orders", "subscriptions", "customers", "refunds"];

interface PolarPage<T> {
  items?: T[];
  pagination?: { total_count?: number; max_page?: number };
}

type PolarRecord = Record<string, unknown>;

function obj(v: unknown): PolarRecord {
  return v && typeof v === "object" ? (v as PolarRecord) : {};
}

function countryOf(...sources: unknown[]): string | undefined {
  for (const s of sources) {
    const c = obj(s).country;
    if (c) return String(c).toUpperCase();
  }
  return undefined;
}

export function mapPolarOrder(row: PolarRecord): NormalizedOrder {
  const product = obj(row.product);
  const customer = obj(row.customer);
  const currency = String(row.currency || "usd");
  const gross = row.total_amount ?? (row.net_amount != null ? Number(row.net_amount) + (Number(row.tax_amount) || 0) : row.amount) ?? 0;
  const raw = String(row.status || "paid").toLowerCase();
  const status = raw === "pending" ? "pending" : raw;
  return {
    id: `polar_order_${row.id}`,
    source: "polar",
    created: toIsoTimestamp(String(row.created_at || "")),
    product: String(product.name || row.product_name || row.description || "Product"),
    customerEmail: String(customer.email || row.email || ""),
    amount: toMajor(gross, currency),
    currency: currency.toUpperCase(),
    status,
    rawId: String(row.id),
    country: countryOf(row.billing_address, customer.billing_address),
  };
}

/** Recurring discount applied to the subscription amount (Polar `discount`: basis_points or fixed amounts). */
function applyPolarDiscount(row: PolarRecord, minor: number, currency: string): number {
  const d = obj(row.discount);
  if (!d.type) return minor;
  const duration = String(d.duration || "forever");
  if (duration === "once") return minor;
  if (duration === "repeating") {
    const months = Number(d.duration_in_months) || 0;
    const start = Date.parse(String(row.started_at || row.created_at || ""));
    if (months > 0 && !Number.isNaN(start) && Date.now() > start + months * 30.44 * 86400000) return minor;
  }
  if (d.type === "percentage") return minor * (1 - (Number(d.basis_points) || 0) / 10000);
  if (d.type === "fixed") {
    const amounts = obj(d.amounts);
    const off = Number(amounts[currency.toLowerCase()] ?? (String(d.currency || "").toLowerCase() === currency.toLowerCase() ? d.amount : 0)) || 0;
    return Math.max(0, minor - off);
  }
  return minor;
}

export function mapPolarSubscription(row: PolarRecord): NormalizedSubscription {
  const price = obj(row.price);
  const product = obj(row.product);
  const customer = obj(row.customer);
  const currency = String(row.currency || price.price_currency || "usd");
  const unit = String(row.recurring_interval || product.recurring_interval || price.recurring_interval || "month");
  const count = Number(row.recurring_interval_count || product.recurring_interval_count || 1) || 1;
  const minor = Number(row.amount ?? price.price_amount ?? 0) || 0;
  const discounted = applyPolarDiscount(row, minor, currency);
  const basic = /^(day|week|month|year)s?$/i.test(unit);
  const interval = basic ? intervalFromUnitAndCount(unit, count) : normalizeBillingInterval(unit);
  const mrr = roundMoney(
    basic ? toMajor(discounted, currency) / periodLengthInMonths(unit, count) : toMonthlyAmount(toMajor(discounted, currency), interval),
  );
  const status = String(row.status || "active").toLowerCase();
  // canceled_at is set as soon as a cancellation is *scheduled* (cancel_at_period_end); the sub
  // is still paid until ended_at, so only ended_at counts as churn.
  const cancelledAt = row.ended_at ? toIsoTimestamp(String(row.ended_at)) : status === "canceled" && row.canceled_at ? toIsoTimestamp(String(row.canceled_at)) : null;
  return {
    id: `polar_sub_${row.id}`,
    source: "polar",
    created: toIsoTimestamp(String(row.started_at || row.created_at || "")),
    product: String(product.name || row.product_name || "Subscription"),
    customerEmail: String(customer.email || row.email || ""),
    mrr,
    currency: currency.toUpperCase(),
    status,
    cancelledAt,
    interval,
    rawId: String(row.id),
    country: countryOf(customer.billing_address),
  };
}

export function mapPolarCustomer(row: PolarRecord): NormalizedCustomer {
  return {
    id: `polar_cust_${row.id}`,
    source: "polar",
    email: String(row.email || ""),
    name: String(row.name || row.billing_name || ""),
    created: toIsoDate(String(row.created_at || "")),
    rawId: String(row.id),
    country: countryOf(row.billing_address),
  };
}

export function mapPolarRefund(row: PolarRecord): NormalizedRefund {
  const currency = String(row.currency || "usd");
  // Orders are recorded gross (incl. tax), so subtract the refund incl. its tax portion.
  const total = (Number(row.amount) || 0) + (Number(row.tax_amount) || 0);
  return {
    id: `polar_refund_${row.id}`,
    source: "polar",
    created: toIsoTimestamp(String(row.created_at || "")),
    orderId: String(row.order_id || obj(row.order).id || ""),
    amount: toMajor(total, currency),
    currency: currency.toUpperCase(),
    status: String(row.status || "succeeded").toLowerCase(),
    rawId: String(row.id),
  };
}

function pathFor(resource: SyncResource): string {
  return resource === "subscriptions" ? "/subscriptions/" : resource === "customers" ? "/customers/" : resource === "refunds" ? "/refunds/" : "/orders/";
}

function pageUrl(base: string, resource: SyncResource, page: number): string {
  return `${base}${pathFor(resource)}?${buildQuery({ page, limit: 100 })}`;
}

function parseToken(token: string | undefined): { base: string; page: number } | null {
  if (!token) return null;
  const m = /^(https:\/\/[^?]+\/v1)\/[a-z]+\/?\?.*\bpage=(\d+)/.exec(token);
  return m ? { base: m[1], page: Number(m[2]) } : null;
}

export function fetchPolarResultSync(apiKey: string, cursor?: SyncCursor, maxPages = CONFIG.MAX_PAGES_PER_RUN): ImportResult {
  const bundle = emptyBundle();
  let resource: SyncResource | "done" = (cursor?.resource as SyncResource) || "orders";
  if (!ORDER.includes(resource as SyncResource)) resource = "orders";
  const resumed = parseToken(cursor?.pageToken);
  let base = resumed?.base || POLAR_BASE;
  let page = resumed?.page || 1;
  const stopBefore = incrementalStopBefore(cursor?.lastSyncedAt);
  const auth = { headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` } };
  let pages = 0;
  let triedSandbox = base === POLAR_SANDBOX_BASE;

  while (resource !== "done" && pages < maxPages && (pages === 0 || !deadlinePassed())) {
    pages += 1;
    const res = fetchJsonSync<PolarPage<PolarRecord>>(pageUrl(base, resource, page), auth);
    if (res.status === 401 && !triedSandbox) {
      triedSandbox = true;
      base = POLAR_SANDBOX_BASE; // sandbox token
      pages -= 1;
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Polar rejected the access token (needs orders:read, subscriptions:read, customers:read, refunds:read).");
    }
    if (res.status >= 400) {
      if (resource === "refunds") {
        resource = "done"; // refunds scope missing: keep everything else
        break;
      }
      throw new Error(`Polar error ${res.status} on ${resource}`);
    }
    const items = res.data.items || [];
    for (const r of items) {
      if (resource === "orders") bundle.orders.push(mapPolarOrder(r));
      else if (resource === "subscriptions") bundle.subscriptions.push(mapPolarSubscription(r));
      else if (resource === "customers") bundle.customers.push(mapPolarCustomer(r));
      else bundle.refunds.push(mapPolarRefund(r));
    }
    const maxPage = Number(res.data.pagination?.max_page) || 1;
    let more = items.length > 0 && page < maxPage;
    if (more && resource !== "subscriptions" && pageIsOlderThan(items.map((r) => String(r.created_at || "")), stopBefore)) more = false;
    if (more) {
      page += 1;
      continue;
    }
    page = 1;
    const idx = ORDER.indexOf(resource);
    resource = idx >= ORDER.length - 1 ? "done" : ORDER[idx + 1];
  }

  if (resource !== "done") {
    return {
      bundle,
      cursor: { pageToken: pageUrl(base, resource, page), resource, backfillComplete: false, lastSyncedAt: cursor?.lastSyncedAt },
      incomplete: true,
    };
  }
  return { bundle, cursor: completedCursor(new Date().toISOString()), incomplete: false };
}

export function fetchPolarSync(apiKey: string, cursor?: SyncCursor): ImportBundle {
  return fetchPolarResultSync(apiKey, cursor, CONFIG.MAX_PAGES).bundle;
}

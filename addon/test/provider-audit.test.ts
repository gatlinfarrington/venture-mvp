import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { clearDeadline, setDeadline } from "../src/lib/deadline";
import { fetchLemonSqueezyResultSync, mapLemonOrder, mapLemonRefundFromOrder, mapLemonSubscription } from "../src/importers/lemonSqueezy";
import { fetchPolarResultSync, mapPolarOrder, mapPolarRefund, mapPolarSubscription, POLAR_SANDBOX_BASE } from "../src/importers/polar";
import { fetchGumroadResultSync, mapGumroadRefundFromSale, mapGumroadSaleStrict, mapGumroadSubscriber } from "../src/importers/gumroad";
import { netRevenueBetween } from "../src/metrics/netRevenue";
import { computeMrr } from "../src/metrics/mrr";
import { vanishedSubscriptions } from "../src/sync";
import { tagBundleWithStore } from "../src/lib/stores";
import { revenueBySource30d } from "../src/sheets/dashboard";
import { newAccountId, maskKey } from "../src/ui/accountsCard";

type Handler = (url: string, opts?: { headers?: Record<string, string> }) => { status: number; body: unknown };
const g = globalThis as Record<string, unknown>;
function mockFetch(handler: Handler): string[] {
  const urls: string[] = [];
  g.UrlFetchApp = {
    fetch: (url: string, opts?: { headers?: Record<string, string> }) => {
      urls.push(url);
      const r = handler(url, opts);
      return { getResponseCode: () => r.status, getAllHeaders: () => ({}), getContentText: () => JSON.stringify(r.body) };
    },
  };
  g.Utilities = { sleep: () => undefined };
  return urls;
}
afterEach(() => {
  delete g.UrlFetchApp;
  clearDeadline();
});

const future = new Date(Date.now() + 10 * 86400000).toISOString();
const past = "2026-01-15T00:00:00.000000Z";

// ---------- Lemon Squeezy (fixtures follow docs.lemonsqueezy.com object examples) ----------
const lsOrder = (id: string, attrs: Record<string, unknown> = {}) => ({
  type: "orders",
  id,
  attributes: {
    store_id: 1, customer_id: 1, user_name: "John Doe", user_email: "john@example.com", currency: "USD",
    subtotal: 999, tax: 200, total: 1199, refunded_amount: 0, status: "paid", refunded: false, refunded_at: null,
    first_order_item: { product_name: "Test Limited License for 2 years", variant_name: "Default", price: 1199 },
    created_at: "2026-10-01T09:45:53.000000Z", updated_at: "2026-10-01T09:45:53.000000Z", test_mode: false, ...attrs,
  },
});
const lsSub = (id: string, attrs: Record<string, unknown> = {}) => ({
  type: "subscriptions",
  id,
  attributes: {
    store_id: 1, customer_id: 7, order_id: 11, product_name: "Pro", variant_id: 5, variant_name: "Yearly",
    user_email: "a@x.com", status: "active", ends_at: null, created_at: past, updated_at: past,
    first_subscription_item: { id: 1, subscription_id: Number(id), price_id: 50, quantity: 1, is_usage_based: false },
    ...attrs,
  },
  relationships: { variant: { data: { type: "variants", id: "5" } } },
});

describe("Lemon Squeezy audit", () => {
  it("orders: gross total, partial_refund status, refunds derived from refunded_amount", () => {
    const o = lsOrder("1", { status: "partial_refund", refunded_amount: 500 });
    const order = mapLemonOrder(o);
    assert.equal(order.amount, 11.99);
    assert.equal(order.status, "partially_refunded");
    assert.equal(order.product, "Test Limited License for 2 years");
    const refund = mapLemonRefundFromOrder(o)!;
    assert.equal(refund.amount, 5);
    assert.equal(refund.orderId, "1");
    assert.equal(mapLemonRefundFromOrder(lsOrder("2")), null);
    // fully refunded: counted once (gross − refund = 0), never double-subtracted
    const full = lsOrder("3", { status: "refunded", refunded: true, refunded_amount: 1199, refunded_at: "2026-10-02T00:00:00Z" });
    const t0 = Date.parse("2026-09-01"), t1 = Date.parse("2026-11-01");
    assert.equal(netRevenueBetween([mapLemonOrder(full)], [mapLemonRefundFromOrder(full)!], t0, t1), 0);
  });

  it("zero-decimal currency orders are not divided by 100", () => {
    assert.equal(mapLemonOrder(lsOrder("j", { currency: "JPY", total: 1500 })).amount, 1500);
  });

  it("subscription MRR from Price (renewal interval, quantity, package/graduated) and statuses", () => {
    const price = { renewal_interval_unit: "year", renewal_interval_quantity: 1, unit_price: 12000, scheme: "standard" };
    const s = mapLemonSubscription(lsSub("1", { first_subscription_item: { price_id: 50, quantity: 3 } }), { price, order: { currency: "EUR" }, customer: { country: "DE" } });
    assert.equal(s.mrr, 30);
    assert.equal(s.interval, "year");
    assert.equal(s.currency, "EUR");
    assert.equal(s.country, "DE");
    assert.equal(s.product, "Pro · Yearly");
    const grad = { renewal_interval_unit: "month", renewal_interval_quantity: 1, scheme: "graduated", tiers: [{ last_unit: 2, unit_price: 1000 }, { last_unit: "inf", unit_price: 500 }] };
    assert.equal(mapLemonSubscription(lsSub("2", { first_subscription_item: { price_id: 51, quantity: 4 } }), { price: grad }).mrr, 30);
    const usage = mapLemonSubscription(lsSub("3", { first_subscription_item: { price_id: 52, quantity: 1, is_usage_based: true } }), { price: { unit_price: 10 } });
    assert.equal(usage.mrr, 0);
    assert.equal(mapLemonSubscription(lsSub("4", { status: "on_trial" }), { price }).status, "trialing");
    // cancelled = grace period until ends_at → still active, not churned yet
    const grace = mapLemonSubscription(lsSub("5", { status: "cancelled", ends_at: future }), { price });
    assert.equal(grace.status, "active");
    assert.equal(grace.cancelledAt, null);
    const expired = mapLemonSubscription(lsSub("6", { status: "expired", ends_at: "2026-09-01T00:00:00Z" }), { price });
    assert.equal(expired.status, "canceled");
    assert.equal(Date.parse(String(expired.cancelledAt)), Date.parse("2026-09-01T00:00:00Z"));
    assert.equal(mapLemonSubscription(lsSub("7", { status: "paused" }), { price }).status, "paused");
  });

  it("fetch: walks orders→subscriptions→customers via links.next, no /refunds call, no updated_at filter, include=variant", () => {
    const urls = mockFetch((url) => {
      if (url.includes("/orders?")) return { status: 200, body: { data: [lsOrder("1", { status: "refunded", refunded_amount: 1199 })], links: { next: null } } };
      if (url.includes("/subscriptions?")) {
        return {
          status: 200,
          body: {
            data: [lsSub("9")],
            included: [
              { type: "variants", id: "5", attributes: { interval: "month", interval_count: 3, price: 3000 } },
              { type: "orders", id: "11", attributes: { currency: "GBP" } },
            ],
            links: { next: null },
          },
        };
      }
      if (url.includes("/prices/50")) return { status: 200, body: { data: { type: "prices", id: "50", attributes: { renewal_interval_unit: "month", renewal_interval_quantity: 3, unit_price: 3000 } } } };
      if (url.includes("/customers?")) return { status: 200, body: { data: [{ type: "customers", id: "7", attributes: { email: "a@x.com", name: "A", country: "GB", created_at: past } }], links: { next: null } } };
      return { status: 404, body: {} };
    });
    const r = fetchLemonSqueezyResultSync("k");
    assert.equal(r.incomplete, false);
    assert.equal(r.bundle.refunds.length, 1);
    assert.equal(r.bundle.subscriptions[0].mrr, 10);
    assert.equal(r.bundle.subscriptions[0].currency, "GBP");
    assert.equal(r.bundle.customers[0].country, "GB");
    assert.ok(!urls.some((u) => u.includes("/refunds")));
    assert.ok(!urls.some((u) => u.includes("updated_at")));
    assert.ok(urls.some((u) => u.includes("include=variant")));
  });

  it("chunked resume: stops on deadline and resumes from links.next; incremental stops past look-back", () => {
    let n = 0;
    mockFetch((url) => {
      n++;
      setDeadline(-1);
      if (url.includes("page%5Bnumber%5D=2") || url.includes("page[number]=2")) return { status: 200, body: { data: [lsOrder("2")], links: { next: null } } };
      return { status: 200, body: { data: [lsOrder("1")], links: { next: "https://api.lemonsqueezy.com/v1/orders?page[number]=2&page[size]=100" } } };
    });
    const first = fetchLemonSqueezyResultSync("k");
    assert.equal(first.incomplete, true);
    assert.equal(first.cursor.resource, "orders");
    assert.match(String(first.cursor.pageToken), /page\[number\]=2/);
    clearDeadline();
    const second = fetchLemonSqueezyResultSync("k", first.cursor, 1);
    assert.equal(second.bundle.orders[0].id, "ls_order_2");
    // incremental: page of old orders ends the orders walk even though links.next exists
    clearDeadline();
    const urls = mockFetch((url) => {
      if (url.includes("/orders")) return { status: 200, body: { data: [lsOrder("1", { created_at: "2025-01-01T00:00:00Z" })], links: { next: "https://api.lemonsqueezy.com/v1/orders?page[number]=2" } } };
      return { status: 200, body: { data: [], links: { next: null } } };
    });
    const inc = fetchLemonSqueezyResultSync("k", { lastSyncedAt: "2026-10-10T00:00:00Z", backfillComplete: true });
    assert.equal(inc.incomplete, false);
    assert.equal(urls.filter((u) => u.includes("/orders")).length, 1);
    assert.ok(n > 0);
  });
});

// ---------- Polar (fixtures follow the Polar OpenAPI Subscription/Order/Refund schemas) ----------
const polarSub = (extra: Record<string, unknown> = {}) => ({
  id: "s1", created_at: past, started_at: past, amount: 10000, currency: "usd", recurring_interval: "month",
  recurring_interval_count: 1, status: "active", cancel_at_period_end: false, canceled_at: null, ended_at: null,
  customer: { email: "c@x.com", billing_address: { country: "SE" } }, product: { name: "Team" }, discount: null, ...extra,
});

describe("Polar audit", () => {
  it("subscription: interval_count, discounts, cancel_at_period_end, statuses", () => {
    const s = mapPolarSubscription(polarSub());
    assert.equal(s.mrr, 100);
    assert.equal(s.country, "SE");
    assert.equal(mapPolarSubscription(polarSub({ recurring_interval: "month", recurring_interval_count: 3, amount: 9000 })).mrr, 30);
    assert.equal(mapPolarSubscription(polarSub({ recurring_interval: "year", amount: 120000 })).mrr, 100);
    assert.equal(mapPolarSubscription(polarSub({ discount: { type: "percentage", basis_points: 2500, duration: "forever" } })).mrr, 75);
    assert.equal(mapPolarSubscription(polarSub({ discount: { type: "fixed", amounts: { usd: 1000 }, duration: "forever" } })).mrr, 90);
    assert.equal(mapPolarSubscription(polarSub({ discount: { type: "percentage", basis_points: 5000, duration: "once" } })).mrr, 100);
    // scheduled cancel: canceled_at set, still paying → not churned
    const sched = mapPolarSubscription(polarSub({ cancel_at_period_end: true, canceled_at: "2026-10-01T00:00:00Z", ends_at: future }));
    assert.equal(sched.status, "active");
    assert.equal(sched.cancelledAt, null);
    const ended = mapPolarSubscription(polarSub({ status: "canceled", canceled_at: "2026-09-01T00:00:00Z", ended_at: "2026-09-30T00:00:00Z" }));
    assert.equal(Date.parse(String(ended.cancelledAt)), Date.parse("2026-09-30T00:00:00Z"));
    assert.equal(mapPolarSubscription(polarSub({ currency: "jpy", amount: 1200 })).mrr, 1200);
    const mrr = computeMrr([s, mapPolarSubscription(polarSub({ id: "t", status: "trialing" })), ended]);
    assert.equal(mrr.total, 100);
  });

  it("orders gross incl. tax; refunds incl. tax; no double count", () => {
    const o = mapPolarOrder({ id: "o1", created_at: "2026-10-05T00:00:00Z", status: "refunded", subtotal_amount: 1000, tax_amount: 250, net_amount: 1000, total_amount: 1250, refunded_amount: 1250, currency: "eur", product: { name: "Pro" }, customer: { email: "e@x.com" }, billing_address: { country: "FR" } });
    assert.equal(o.amount, 12.5);
    assert.equal(o.country, "FR");
    const r = mapPolarRefund({ id: "r1", created_at: "2026-10-06T00:00:00Z", amount: 1000, tax_amount: 250, currency: "eur", order_id: "o1", status: "succeeded" });
    assert.equal(r.amount, 12.5);
    assert.equal(netRevenueBetween([o], [r], Date.parse("2026-10-01"), Date.parse("2026-11-01")), 0);
  });

  it("fetch: page/limit with max_page (old code only read page 1), sandbox fallback, resume", () => {
    const urls = mockFetch((url) => {
      if (url.startsWith("https://api.polar.sh")) return { status: 401, body: {} };
      const page = Number(/page=(\d+)/.exec(url)?.[1] || 1);
      if (url.includes("/orders/")) return { status: 200, body: { items: [{ id: `o${page}`, created_at: "2026-10-01T00:00:00Z", total_amount: 100, currency: "usd", status: "paid" }], pagination: { total_count: 2, max_page: 2 } } };
      return { status: 200, body: { items: [], pagination: { total_count: 0, max_page: 1 } } };
    });
    const r = fetchPolarResultSync("polar_oat_sandbox");
    assert.equal(r.incomplete, false);
    assert.deepEqual(r.bundle.orders.map((o) => o.id), ["polar_order_o1", "polar_order_o2"]);
    assert.ok(urls.some((u) => u.startsWith(POLAR_SANDBOX_BASE)));
    assert.ok(urls.every((u) => /limit=100/.test(u)));
    // deadline mid-orders → resumes at page 2 on the same base
    clearDeadline();
    mockFetch((url) => {
      setDeadline(-1);
      const page = Number(/page=(\d+)/.exec(url)?.[1] || 1);
      return { status: 200, body: { items: [{ id: `o${page}`, created_at: "2026-10-01T00:00:00Z", total_amount: 100, currency: "usd" }], pagination: { max_page: 3 } } };
    });
    const a = fetchPolarResultSync("polar_oat_live");
    assert.equal(a.incomplete, true);
    assert.match(String(a.cursor.pageToken), /^https:\/\/api\.polar\.sh\/v1\/orders\/\?page=2/);
    clearDeadline();
    const b = fetchPolarResultSync("polar_oat_live", a.cursor, 1);
    assert.equal(b.bundle.orders[0].id, "polar_order_o2");
  });
});

// ---------- Gumroad (fixtures follow the v2 sales / products / subscribers docs) ----------
describe("Gumroad audit", () => {
  it("subscriber status mapping and price from sale", () => {
    const base = { id: "sub_1", product_name: "Monthly Membership", user_email: "s@x.com", created_at: past, recurrence: "monthly" };
    assert.equal(mapGumroadSubscriber({ ...base, status: "alive" }, { priceCents: 1000 }).mrr, 10);
    assert.equal(mapGumroadSubscriber({ ...base, status: "alive", free_trial_ends_at: future }).status, "trialing");
    assert.equal(mapGumroadSubscriber({ ...base, status: "pending_cancellation", cancelled_at: future }).status, "active");
    assert.equal(mapGumroadSubscriber({ ...base, status: "pending_failure" }).status, "past_due");
    const failed = mapGumroadSubscriber({ ...base, status: "failed_payment", failed_at: "2026-09-01T00:00:00Z" });
    assert.equal(failed.status, "canceled");
    assert.equal(Date.parse(String(failed.cancelledAt)), Date.parse("2026-09-01T00:00:00Z"));
    assert.equal(mapGumroadSubscriber({ ...base, recurrence: "every_two_years" }, { priceCents: 24000 }).mrr, 10);
  });

  it("partial refunds, chargebacks, country", () => {
    const sale = { id: "s", created_at: "2026-10-03T00:00:00Z", product_name: "Kit", email: "b@x.com", price: 2000, partially_refunded: true, amount_refundable_in_currency: "15.00", country_iso2: "us" };
    assert.equal(mapGumroadSaleStrict(sale).status, "partially_refunded");
    assert.equal(mapGumroadSaleStrict(sale).country, "US");
    assert.equal(mapGumroadRefundFromSale(sale)!.amount, 5);
    const t0 = Date.parse("2026-10-01"), t1 = Date.parse("2026-11-01");
    assert.equal(netRevenueBetween([mapGumroadSaleStrict(sale)], [mapGumroadRefundFromSale(sale)!], t0, t1), 15);
    const cb = { ...sale, partially_refunded: false, chargedback: true };
    assert.equal(netRevenueBetween([mapGumroadSaleStrict(cb)], [mapGumroadRefundFromSale(cb)!], t0, t1), 0);
  });

  it("fetch: subscribers use paginated=true + page_key (old code re-read the same list up to 50×), price from latest sale / product tier", () => {
    const subs = Array.from({ length: 12 }, (_, i) => ({ id: `sub_${i}`, status: "alive", recurrence: "monthly", created_at: past, user_email: `u${i}@x.com` }));
    const urls = mockFetch((url) => {
      if (url.includes("/sales?")) {
        return { status: 200, body: { success: true, sales: [{ id: "sale_a", subscription_id: "sub_0", price: 1500, created_at: "2026-10-01T00:00:00Z", product_name: "Club", email: "u0@x.com" }] } };
      }
      if (url.includes("/products?")) {
        return { status: 200, body: { success: true, products: [{ id: "p1", name: "Club", currency: "usd", price: 500, variants: [{ title: "Tier", options: [{ name: "Basic", recurrence_prices: { monthly: { price_cents: 900 } } }] }] }, { id: "p2", name: "Ebook", price: 1000 }] } };
      }
      if (url.includes("/products/p1/subscribers")) {
        if (url.includes("page_key=K2")) return { status: 200, body: { success: true, subscribers: subs.slice(10) } };
        return { status: 200, body: { success: true, subscribers: subs.slice(0, 10), next_page_key: "K2" } };
      }
      if (url.includes("/products/p2/subscribers")) return { status: 200, body: { success: true, subscribers: [] } };
      return { status: 404, body: {} };
    });
    const r = fetchGumroadResultSync("tok");
    assert.equal(r.subscriptionsSnapshot, true);
    assert.equal(r.bundle.subscriptions.length, 12);
    assert.equal(new Set(r.bundle.subscriptions.map((s) => s.id)).size, 12);
    assert.equal(r.bundle.subscriptions.find((s) => s.id === "gumroad_sub_sub_0")!.mrr, 15);
    assert.equal(r.bundle.subscriptions.find((s) => s.id === "gumroad_sub_sub_5")!.mrr, 9);
    assert.ok(urls.filter((u) => u.includes("/subscribers")).every((u) => u.includes("paginated=true")));
  });

  it("vanished subscribers are marked cancelled for that account only", () => {
    const mk = (id: string, label: string) => ({ id, source: "gumroad" as const, storeLabel: label, created: past, product: "Club", customerEmail: "", mrr: 10, currency: "USD", status: "active", cancelledAt: null, interval: "month" as const, rawId: id });
    const out = vanishedSubscriptions([mk("a", "Main"), mk("b", "Main"), mk("c", "Other")], [mk("a", "Main")], "gumroad", "Main", new Date("2026-10-11T00:00:00Z"));
    assert.deepEqual(out.map((s) => [s.id, s.status, s.cancelledAt]), [["b", "canceled", "2026-10-11T00:00:00.000Z"]]);
  });
});

// ---------- Multi-account ----------
describe("multiple accounts per provider", () => {
  it("rows from two Stripe accounts stay distinct and the dashboard splits per account", () => {
    const order = (id: string, amount: number) => ({ id, source: "stripe" as const, created: new Date(Date.now() - 86400000).toISOString(), product: "P", customerEmail: "", amount, currency: "USD", status: "succeeded", rawId: id });
    const a = tagBundleWithStore({ orders: [order("stripe_ch_1", 10)], subscriptions: [], customers: [], refunds: [] }, { id: "default", label: "US" });
    const b = tagBundleWithStore({ orders: [order("stripe_ch_1", 20)], subscriptions: [], customers: [], refunds: [] }, { id: "eu", label: "EU" });
    assert.notEqual(a.orders[0].id, b.orders[0].id);
    const rows = revenueBySource30d([...a.orders, ...b.orders], []);
    assert.deepEqual(rows.map((r) => [r.source, r.revenue]), [["Stripe · EU", 20], ["Stripe · US", 10]]);
    // single account → plain provider row
    assert.deepEqual(revenueBySource30d(a.orders, []).map((r) => r.source), ["Stripe"]);
  });

  it("account ids are unique and keys are masked", () => {
    assert.equal(newAccountId([], "Main"), "default");
    const existing = [{ id: "default", label: "Main", apiKey: "x" }, { id: "eu", label: "EU", apiKey: "y" }];
    assert.equal(newAccountId(existing, "EU"), "eu-2");
    assert.equal(maskKey("rk_live_51abcdefghijkWXYZ"), "rk_live_••••WXYZ");
  });
});

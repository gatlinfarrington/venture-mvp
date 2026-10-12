import { test } from "node:test";
import assert from "node:assert/strict";
import { mapStripeCharge, mapStripeRefund, mapStripeSubscription, stripeToMajor } from "../src/importers/stripe";
import { computeMrr } from "../src/metrics/mrr";
import { netRevenueBetween } from "../src/metrics/netRevenue";

const price = (unit: number, interval: string, count = 1, extra: Record<string, unknown> = {}) => ({
  id: `price_${unit}_${interval}`,
  object: "price",
  currency: "usd",
  billing_scheme: "per_unit",
  unit_amount: unit,
  unit_amount_decimal: String(unit),
  product: "prod_A",
  recurring: { interval, interval_count: count, usage_type: "licensed" },
  ...extra,
});
const sub = (items: unknown[], extra: Record<string, unknown> = {}) => ({
  id: "sub_1",
  object: "subscription",
  created: 1791755969,
  start_date: 1791755969,
  status: "active",
  currency: "usd",
  customer: { id: "cus_1", object: "customer", email: "a@b.co", address: { country: "us" } },
  items: { object: "list", data: items },
  discounts: [],
  ...extra,
});

test("stripe sub: multiple items, quantity, interval_count, product names, expanded customer", () => {
  const s = mapStripeSubscription(
    sub([
      { quantity: 3, price: price(1000, "month") }, // 30/mo
      { quantity: 1, price: price(12000, "month", 3, { product: "prod_B" }) }, // 120/qtr = 40/mo
    ]),
    { prod_A: "Seats", prod_B: "Support" },
  );
  assert.equal(s.mrr, 70);
  assert.equal(s.product, "Seats + Support");
  assert.equal(s.customerEmail, "a@b.co");
  assert.equal(s.country, "US");
});

test("stripe sub: year, week, day normalization and unit_amount_decimal", () => {
  assert.equal(mapStripeSubscription(sub([{ quantity: 1, price: price(12000, "year") }])).mrr, 10);
  assert.equal(mapStripeSubscription(sub([{ quantity: 1, price: price(1000, "week") }])).mrr, 43.33);
  assert.equal(
    mapStripeSubscription(sub([{ quantity: 1, price: { ...price(0, "month"), unit_amount: null, unit_amount_decimal: "999.5" } }])).mrr,
    10,
  );
});

test("stripe sub: metered prices contribute 0, tiered graduated uses tiers when present", () => {
  const metered = price(5, "month");
  (metered.recurring as Record<string, unknown>).usage_type = "metered";
  assert.equal(mapStripeSubscription(sub([{ price: metered }])).mrr, 0);
  const tiered = {
    ...price(0, "month"),
    billing_scheme: "tiered",
    tiers_mode: "graduated",
    unit_amount: null,
    unit_amount_decimal: null,
    tiers: [
      { up_to: 5, unit_amount: 1000, flat_amount: null },
      { up_to: null, unit_amount: 500, flat_amount: null },
    ],
  };
  assert.equal(mapStripeSubscription(sub([{ quantity: 7, price: tiered }])).mrr, 60);
});

test("stripe sub: discounts (percent forever, amount_off, once ignored, ended ignored)", () => {
  const items = [{ quantity: 1, price: price(10000, "month") }];
  const pct = { id: "di_1", end: null, source: { coupon: { id: "c1", percent_off: 25, duration: "forever" } } };
  assert.equal(mapStripeSubscription(sub(items, { discounts: [pct] })).mrr, 75);
  const amt = { id: "di_2", end: null, coupon: { id: "c2", amount_off: 1000, currency: "usd", duration: "repeating" } };
  assert.equal(mapStripeSubscription(sub(items, { discounts: [amt] })).mrr, 90);
  const once = { id: "di_3", end: null, coupon: { id: "c3", percent_off: 50, duration: "once" } };
  assert.equal(mapStripeSubscription(sub(items, { discounts: [once] })).mrr, 100);
  const ended = { id: "di_4", end: 1000, coupon: { id: "c4", percent_off: 50, duration: "repeating" } };
  assert.equal(mapStripeSubscription(sub(items, { discounts: [ended] })).mrr, 100);
});

test("stripe sub: trialing / canceled / cancel_at_period_end statuses", () => {
  const items = [{ quantity: 1, price: price(900, "month") }];
  const subs = [
    mapStripeSubscription(sub(items, { id: "a" })),
    mapStripeSubscription(sub(items, { id: "b", cancel_at_period_end: true })),
    mapStripeSubscription(sub(items, { id: "c", status: "trialing" })),
    mapStripeSubscription(sub(items, { id: "d", status: "canceled", canceled_at: 1791800000, ended_at: 1791800000 })),
    mapStripeSubscription(sub(items, { id: "e", status: "incomplete_expired" })),
  ];
  const m = computeMrr(subs);
  assert.equal(m.total, 18);
  assert.equal(m.activeCount, 2);
  assert.equal(m.trialingCount, 1);
  assert.ok(subs[3].cancelledAt);
});

test("stripe amounts: zero-decimal currencies", () => {
  assert.equal(stripeToMajor(500, "jpy"), 500);
  assert.equal(stripeToMajor(957, "usd"), 9.57);
});

test("stripe charges + refunds: failed excluded, partial refunds, no double-subtract", () => {
  const base = { object: "charge", created: Math.floor(Date.now() / 1000) - 3600, currency: "usd", paid: true, status: "succeeded", billing_details: {} };
  const orders = [
    mapStripeCharge({ ...base, id: "ch_full", amount: 957, amount_refunded: 957, refunded: true }),
    mapStripeCharge({ ...base, id: "ch_part", amount: 2000, amount_refunded: 500, refunded: false }),
    mapStripeCharge({ ...base, id: "ch_ok", amount: 1000, amount_refunded: 0 }),
    mapStripeCharge({ ...base, id: "ch_fail", amount: 5000, paid: false, status: "failed" }),
  ];
  assert.deepEqual(orders.map((o) => o.status), ["refunded", "partially_refunded", "paid", "failed"]);
  const refunds = [
    mapStripeRefund({ id: "re_1", object: "refund", amount: 957, charge: "ch_full", currency: "usd", created: base.created, status: "succeeded" }),
    mapStripeRefund({ id: "re_2", object: "refund", amount: 500, charge: "ch_part", currency: "usd", created: base.created, status: "succeeded" }),
  ];
  const now = Date.now();
  // 9.57 + 20 + 10 - 9.57 - 5 = 25
  assert.equal(netRevenueBetween(orders, refunds, now - 30 * 86400000, now + 1), 25);
});

test("stripe subscriptions request: status=all, expand customer, no created filter", async () => {
  const g = globalThis as Record<string, unknown>;
  const urls: string[] = [];
  g.UrlFetchApp = {
    fetch: (url: string) => {
      urls.push(url);
      return { getResponseCode: () => 200, getAllHeaders: () => ({}), getContentText: () => JSON.stringify({ data: [], has_more: false }) };
    },
  };
  const { fetchStripeResultSync } = await import("../src/importers/stripe");
  fetchStripeResultSync("rk_live_x", { lastSyncedAt: "2026-10-01T00:00:00Z", backfillComplete: true }, 40);
  delete g.UrlFetchApp;
  const subUrl = urls.find((u) => u.includes("/v1/subscriptions?"))!;
  assert.match(subUrl, /status=all/);
  assert.match(subUrl, /expand%5B%5D=data.customer/);
  assert.doesNotMatch(subUrl, /created/);
  assert.doesNotMatch(urls.find((u) => u.includes("/v1/customers?"))!, /created/);
  assert.match(urls.find((u) => u.includes("/v1/charges?"))!, /created%5Bgte%5D/);
});

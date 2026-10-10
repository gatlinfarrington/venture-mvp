import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeBillingInterval, toMonthlyAmount } from "../src/lib/intervals";
import { mapGumroadSubscriber } from "../src/importers/gumroad";
import { mapLemonSubscription } from "../src/importers/lemonSqueezy";
import { mapPolarSubscription } from "../src/importers/polar";

describe("normalizeBillingInterval", () => {
  it("maps quarterly and biannual (not monthly)", () => {
    assert.equal(normalizeBillingInterval("quarterly"), "quarter");
    assert.equal(normalizeBillingInterval("every 3 months"), "quarter");
    assert.equal(normalizeBillingInterval("biannual"), "biannual");
    assert.equal(normalizeBillingInterval("semi-annual"), "biannual");
    assert.equal(normalizeBillingInterval("6 months"), "biannual");
  });

  it("maps year / month / week / day", () => {
    assert.equal(normalizeBillingInterval("yearly"), "year");
    assert.equal(normalizeBillingInterval("annual"), "year");
    assert.equal(normalizeBillingInterval("monthly"), "month");
    assert.equal(normalizeBillingInterval("weekly"), "week");
    assert.equal(normalizeBillingInterval("daily"), "day");
  });
});

describe("toMonthlyAmount", () => {
  it("divides quarterly by 3 and biannual by 6", () => {
    assert.equal(toMonthlyAmount(90, "quarter"), 30);
    assert.equal(toMonthlyAmount(120, "biannual"), 20);
    assert.equal(toMonthlyAmount(120, "year"), 10);
  });
});

describe("importer interval → MRR", () => {
  it("Gumroad quarterly / biannual / yearly normalize to monthly MRR", () => {
    const q = mapGumroadSubscriber({
      id: "1",
      recurrence: "quarterly",
      price: 9000,
      created_at: "2026-01-01T00:00:00Z",
      product_name: "Q",
    });
    assert.equal(q.interval, "quarter");
    assert.equal(q.mrr, 30);

    const b = mapGumroadSubscriber({
      id: "2",
      recurrence: "biannual",
      price: 12000,
      created_at: "2026-01-01T00:00:00Z",
    });
    assert.equal(b.interval, "biannual");
    assert.equal(b.mrr, 20);

    const y = mapGumroadSubscriber({
      id: "3",
      recurrence: "yearly",
      price: 12000,
      created_at: "2026-01-01T00:00:00Z",
    });
    assert.equal(y.interval, "year");
    assert.equal(y.mrr, 10);
  });

  it("Lemon Squeezy quarterly maps correctly", () => {
    const sub = mapLemonSubscription({
      id: "7",
      type: "subscriptions",
      attributes: {
        created_at: "2026-01-01T00:00:00Z",
        product_name: "Pro",
        user_email: "a@example.com",
        recurring_price: 9000,
        billing_interval: "quarter",
        currency: "USD",
        status: "active",
      },
    });
    assert.equal(sub.interval, "quarter");
    assert.equal(sub.mrr, 30);
  });

  it("Polar yearly still monthly-normalized", () => {
    const sub = mapPolarSubscription({
      id: "p",
      created_at: "2026-01-01T00:00:00Z",
      status: "active",
      price: { price_amount: 12000, price_currency: "usd", recurring_interval: "year" },
      product: { name: "Pro" },
      customer: { email: "a@x.com" },
    });
    assert.equal(sub.interval, "year");
    assert.equal(sub.mrr, 10);
  });
});

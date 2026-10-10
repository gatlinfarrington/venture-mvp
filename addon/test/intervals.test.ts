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

  it("maps every_two_years / biennial before yearly (not /12)", () => {
    assert.equal(normalizeBillingInterval("every_two_years"), "biennial");
    assert.equal(normalizeBillingInterval("every-two-years"), "biennial");
    assert.equal(normalizeBillingInterval("every two years"), "biennial");
    assert.equal(normalizeBillingInterval("biennial"), "biennial");
    assert.equal(normalizeBillingInterval("2 years"), "biennial");
    // Must not collapse into yearly:
    assert.notEqual(normalizeBillingInterval("every_two_years"), "year");
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

  it("divides every_two_years / biennial by 24 (not 12)", () => {
    assert.equal(toMonthlyAmount(240, "biennial"), 10);
    assert.equal(toMonthlyAmount(240, "every_two_years"), 10);
    assert.equal(toMonthlyAmount(240, "every two years"), 10);
    // Regression: if misclassified as year, this would be 20.
    assert.notEqual(toMonthlyAmount(240, "every_two_years"), 20);
  });
});

describe("importer interval → MRR", () => {
  it("Gumroad quarterly / biannual / yearly / every_two_years normalize to monthly MRR", () => {
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

    const two = mapGumroadSubscriber({
      id: "4",
      recurrence: "every_two_years",
      price: 24000,
      created_at: "2026-01-01T00:00:00Z",
      product_name: "Lifetime-ish",
    });
    assert.equal(two.interval, "biennial");
    assert.equal(two.mrr, 10);
  });

  it("Lemon Squeezy quarterly and every_two_years map correctly", () => {
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

    const two = mapLemonSubscription({
      id: "8",
      type: "subscriptions",
      attributes: {
        created_at: "2026-01-01T00:00:00Z",
        product_name: "Biennial",
        user_email: "a@example.com",
        recurring_price: 24000,
        billing_interval: "every_two_years",
        currency: "USD",
        status: "active",
      },
    });
    assert.equal(two.interval, "biennial");
    assert.equal(two.mrr, 10);
  });

  it("Polar yearly and biennial monthly-normalized", () => {
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

    const two = mapPolarSubscription({
      id: "p2",
      created_at: "2026-01-01T00:00:00Z",
      status: "active",
      price: {
        price_amount: 24000,
        price_currency: "usd",
        recurring_interval: "every_two_years",
      },
      product: { name: "Biennial" },
      customer: { email: "b@x.com" },
    });
    assert.equal(two.interval, "biennial");
    assert.equal(two.mrr, 10);
  });
});

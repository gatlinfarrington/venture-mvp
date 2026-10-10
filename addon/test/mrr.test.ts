import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NormalizedSubscription } from "../src/importers/types";
import { computeMrr, computeMrrTrend, toMonthlyAmount } from "../src/metrics/mrr";

function sub(partial: Partial<NormalizedSubscription>): NormalizedSubscription {
  return {
    id: "1",
    source: "polar",
    created: "2025-01-01",
    product: "Pro",
    customerEmail: "a@example.com",
    mrr: 29,
    currency: "USD",
    status: "active",
    cancelledAt: null,
    interval: "month",
    rawId: "1",
    ...partial,
  };
}

describe("toMonthlyAmount", () => {
  it("converts yearly to monthly", () => {
    assert.equal(toMonthlyAmount(120, "year"), 10);
  });
  it("leaves monthly alone", () => {
    assert.equal(toMonthlyAmount(29, "month"), 29);
  });
  it("converts quarterly and biannual", () => {
    assert.equal(toMonthlyAmount(90, "quarter"), 30);
    assert.equal(toMonthlyAmount(60, "biannual"), 10);
  });
});

describe("computeMrr", () => {
  it("sums active subscription MRR only by default", () => {
    const result = computeMrr([
      sub({ mrr: 29, status: "active" }),
      sub({ id: "2", mrr: 79, status: "active", source: "lemon_squeezy" }),
      sub({ id: "3", mrr: 19, status: "cancelled" }),
    ]);
    assert.equal(result.total, 108);
    assert.equal(result.activeCount, 2);
    assert.equal(result.bySource.polar, 29);
    assert.equal(result.bySource.lemon_squeezy, 79);
  });

  it("excludes past_due and trialing from headline MRR by default", () => {
    const result = computeMrr([
      sub({ mrr: 50, status: "past_due" }),
      sub({ id: "t", mrr: 29, status: "trialing" }),
      sub({ id: "a", mrr: 10, status: "active" }),
    ]);
    assert.equal(result.total, 10);
    assert.equal(result.activeCount, 1);
    assert.equal(result.pastDueCount, 1);
    assert.equal(result.pastDueMrr, 50);
    assert.equal(result.trialingCount, 1);
    assert.equal(result.trialingMrr, 29);
  });

  it("includes trial + past_due when opted in", () => {
    const result = computeMrr(
      [
        sub({ mrr: 50, status: "past_due" }),
        sub({ id: "t", mrr: 29, status: "trialing" }),
        sub({ id: "a", mrr: 10, status: "active" }),
      ],
      { includeTrialingPastDue: true },
    );
    assert.equal(result.total, 89);
    assert.equal(result.activeCount, 3);
    assert.equal(result.trialingMrr, 29);
    assert.equal(result.pastDueMrr, 50);
  });
});

describe("computeMrrTrend", () => {
  it("builds month-end series", () => {
    const asOf = new Date(Date.UTC(2026, 9, 10)); // Oct 10 2026
    const trend = computeMrrTrend(
      [
        sub({ created: "2026-01-15T00:00:00Z", mrr: 100, status: "active" }),
        sub({
          id: "2",
          created: "2026-03-01T00:00:00Z",
          mrr: 50,
          status: "cancelled",
          cancelledAt: "2026-06-15T00:00:00Z",
        }),
      ],
      12,
      asOf,
    );
    assert.equal(trend.length, 12);
    const oct = trend[trend.length - 1];
    assert.equal(oct.month, "2026-10");
    assert.equal(oct.mrr, 100);
    const jun = trend.find((t) => t.month === "2026-06");
    assert.ok(jun);
    assert.equal(jun!.mrr, 100);
  });

  it("excludes trialing from trend by default", () => {
    const asOf = new Date(Date.UTC(2026, 9, 10));
    const trend = computeMrrTrend(
      [sub({ created: "2026-01-01T00:00:00Z", mrr: 40, status: "trialing" })],
      3,
      asOf,
    );
    assert.equal(trend[trend.length - 1].mrr, 0);
  });
});

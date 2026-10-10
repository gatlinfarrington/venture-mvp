import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NormalizedOrder, NormalizedRefund, NormalizedSubscription } from "../src/importers/types";
import { computeArr } from "../src/metrics/arr";
import { computeCohortRetention } from "../src/metrics/cohorts";
import { revenueByCountry } from "../src/metrics/country";
import { computeGoalProgress, progressBarSlots } from "../src/metrics/goals";
import { computeLtv } from "../src/metrics/ltv";
import { computeRefundSummary } from "../src/metrics/refunds";
import { computeTopProducts } from "../src/metrics/topProducts";

function sub(partial: Partial<NormalizedSubscription>): NormalizedSubscription {
  return {
    id: "1",
    source: "polar",
    created: "2026-01-01T00:00:00Z",
    product: "Pro",
    customerEmail: "a@example.com",
    mrr: 100,
    currency: "USD",
    status: "active",
    cancelledAt: null,
    interval: "month",
    rawId: "1",
    ...partial,
  };
}

function order(partial: Partial<NormalizedOrder>): NormalizedOrder {
  return {
    id: "o1",
    source: "polar",
    created: "2026-10-01T00:00:00Z",
    product: "Pro",
    customerEmail: "a@example.com",
    amount: 100,
    currency: "USD",
    status: "paid",
    rawId: "o1",
    country: "US",
    ...partial,
  };
}

describe("computeArr", () => {
  it("is MRR × 12", () => {
    const result = computeArr([sub({ mrr: 100 }), sub({ id: "2", mrr: 50 })]);
    assert.equal(result.mrr, 150);
    assert.equal(result.arr, 1800);
  });
});

describe("computeLtv", () => {
  it("divides ARPU by monthly churn", () => {
    const asOf = new Date("2026-10-10T00:00:00Z");
    const subs = [
      sub({ id: "a", mrr: 100, created: "2026-01-01T00:00:00Z", status: "active" }),
      sub({ id: "b", mrr: 100, created: "2026-01-01T00:00:00Z", status: "active" }),
      sub({
        id: "c",
        mrr: 100,
        created: "2026-01-01T00:00:00Z",
        status: "cancelled",
        cancelledAt: "2026-10-05T00:00:00Z",
      }),
    ];
    const ltv = computeLtv(subs, 30, asOf);
    assert.ok(ltv.arpu > 0);
    assert.ok(ltv.ltv > 0);
  });
});

describe("computeCohortRetention", () => {
  it("builds a retention triangle", () => {
    const asOf = new Date("2026-10-15T00:00:00Z");
    const rows = computeCohortRetention(
      [
        sub({ id: "1", created: "2026-08-01T00:00:00Z", status: "active" }),
        sub({ id: "2", created: "2026-08-05T00:00:00Z", status: "active" }),
        sub({
          id: "3",
          created: "2026-08-10T00:00:00Z",
          status: "cancelled",
          cancelledAt: "2026-09-15T00:00:00Z",
        }),
        sub({ id: "4", created: "2026-09-01T00:00:00Z", status: "active" }),
      ],
      6,
      3,
      asOf,
    );
    assert.ok(rows.length >= 2);
    const aug = rows.find((r) => r.cohortMonth === "2026-08");
    assert.ok(aug);
    assert.equal(aug!.starting, 3);
    assert.equal(aug!.cells[0].rate, 1);
  });
});

describe("revenueByCountry / topProducts / refunds / goals", () => {
  const asOf = new Date("2026-10-10T12:00:00Z");

  it("aggregates country revenue", () => {
    const rows = revenueByCountry(
      [
        order({ country: "US", amount: 100 }),
        order({ id: "o2", country: "US", amount: 50 }),
        order({ id: "o3", country: "DE", amount: 80 }),
      ],
      30,
      8,
      asOf,
    );
    assert.equal(rows[0].country, "US");
    assert.equal(rows[0].revenue, 150);
  });

  it("ranks top products", () => {
    const rows = computeTopProducts(
      [
        order({ product: "A", amount: 10 }),
        order({ id: "o2", product: "B", amount: 90 }),
        order({ id: "o3", product: "A", amount: 20 }),
      ],
      30,
      5,
      asOf,
    );
    assert.equal(rows[0].product, "B");
  });

  it("summarizes refunds", () => {
    const refunds: NormalizedRefund[] = [
      {
        id: "r1",
        source: "polar",
        created: "2026-10-05T00:00:00Z",
        orderId: "o1",
        amount: 25,
        currency: "USD",
        status: "refunded",
        rawId: "r1",
      },
    ];
    const summary = computeRefundSummary([order({ amount: 100 })], refunds, 30, asOf);
    assert.equal(summary.refundAmount, 25);
    assert.equal(summary.refundRate, 0.25);
  });

  it("computes goal progress and bar slots", () => {
    const g = computeGoalProgress(7500, 10000);
    assert.equal(g.pct, 0.75);
    assert.equal(g.met, false);
    assert.equal(progressBarSlots(0.75, 20), 15);
    assert.equal(progressBarSlots(1.2, 20), 20);
  });
});

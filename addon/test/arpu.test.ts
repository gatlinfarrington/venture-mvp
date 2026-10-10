import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NormalizedOrder, NormalizedSubscription } from "../src/importers/types";
import { computeArpu, computeRevenuePeriods, revenueByProduct } from "../src/metrics/arpu";

describe("computeArpu", () => {
  it("divides MRR by active subscribers", () => {
    const subs: NormalizedSubscription[] = [
      {
        id: "1",
        source: "polar",
        created: "2025-01-01",
        product: "A",
        customerEmail: "a@x.com",
        mrr: 100,
        currency: "USD",
        status: "active",
        cancelledAt: null,
        interval: "month",
        rawId: "1",
      },
      {
        id: "2",
        source: "polar",
        created: "2025-01-01",
        product: "B",
        customerEmail: "b@x.com",
        mrr: 50,
        currency: "USD",
        status: "active",
        cancelledAt: null,
        interval: "month",
        rawId: "2",
      },
    ];
    const result = computeArpu(subs);
    assert.equal(result.mrr, 150);
    assert.equal(result.activeSubscribers, 2);
    assert.equal(result.arpu, 75);
  });

  it("returns 0 when no active subs", () => {
    assert.equal(computeArpu([]).arpu, 0);
  });
});

describe("computeRevenuePeriods", () => {
  it("compares this month vs last month", () => {
    const asOf = new Date(Date.UTC(2026, 9, 10)); // Oct
    const orders: NormalizedOrder[] = [
      {
        id: "1",
        source: "gumroad",
        created: "2026-10-05T00:00:00Z",
        product: "X",
        customerEmail: "a@x.com",
        amount: 100,
        currency: "USD",
        status: "paid",
        rawId: "1",
      },
      {
        id: "2",
        source: "gumroad",
        created: "2026-09-15T00:00:00Z",
        product: "X",
        customerEmail: "a@x.com",
        amount: 50,
        currency: "USD",
        status: "paid",
        rawId: "2",
      },
      {
        id: "3",
        source: "gumroad",
        created: "2026-10-06T00:00:00Z",
        product: "X",
        customerEmail: "a@x.com",
        amount: 20,
        currency: "USD",
        status: "refunded",
        rawId: "3",
      },
    ];
    const result = computeRevenuePeriods(orders, asOf);
    assert.equal(result.thisMonth, 100);
    assert.equal(result.lastMonth, 50);
    assert.equal(result.deltaPct, 1);
  });
});

describe("revenueByProduct", () => {
  it("aggregates and sorts", () => {
    const rows = revenueByProduct(
      [
        {
          id: "1",
          source: "polar",
          created: "2026-10-01",
          product: "Pro",
          customerEmail: "a@x.com",
          amount: 30,
          currency: "USD",
          status: "paid",
          rawId: "1",
        },
        {
          id: "2",
          source: "polar",
          created: "2026-10-01",
          product: "Pro",
          customerEmail: "b@x.com",
          amount: 30,
          currency: "USD",
          status: "paid",
          rawId: "2",
        },
        {
          id: "3",
          source: "polar",
          created: "2026-10-01",
          product: "Lite",
          customerEmail: "c@x.com",
          amount: 10,
          currency: "USD",
          status: "paid",
          rawId: "3",
        },
      ],
      5,
    );
    assert.equal(rows[0].product, "Pro");
    assert.equal(rows[0].revenue, 60);
    assert.equal(rows[1].product, "Lite");
  });
});

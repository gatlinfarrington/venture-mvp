import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NormalizedSubscription } from "../src/importers/types";
import { computeChurn, computeNewVsChurnedSeries } from "../src/metrics/churn";

function sub(partial: Partial<NormalizedSubscription>): NormalizedSubscription {
  return {
    id: "1",
    source: "polar",
    created: "2025-01-01T00:00:00Z",
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

describe("computeChurn", () => {
  it("computes logo churn over 30d window", () => {
    const asOf = new Date("2026-10-10T12:00:00Z");
    const result = computeChurn(
      [
        sub({ id: "1", created: "2026-01-01T00:00:00Z", status: "active" }),
        sub({ id: "2", created: "2026-01-01T00:00:00Z", status: "active" }),
        sub({ id: "3", created: "2026-01-01T00:00:00Z", status: "active" }),
        sub({ id: "4", created: "2026-01-01T00:00:00Z", status: "active" }),
        sub({
          id: "5",
          created: "2026-01-01T00:00:00Z",
          status: "cancelled",
          cancelledAt: "2026-10-01T00:00:00Z",
        }),
        sub({
          id: "6",
          created: "2026-01-01T00:00:00Z",
          status: "cancelled",
          cancelledAt: "2026-10-05T00:00:00Z",
        }),
      ],
      30,
      asOf,
    );
    // 6 starting active at window start (all created Jan, two cancelled in window)
    assert.equal(result.startingActive, 6);
    assert.equal(result.cancelled, 2);
    assert.equal(result.rate, 0.3333);
  });
});

describe("computeNewVsChurnedSeries", () => {
  it("counts new and churned per month", () => {
    const asOf = new Date(Date.UTC(2026, 9, 10));
    const series = computeNewVsChurnedSeries(
      [
        sub({ id: "1", created: "2026-10-02T00:00:00Z" }),
        sub({ id: "2", created: "2026-09-02T00:00:00Z", cancelledAt: "2026-10-03T00:00:00Z" }),
      ],
      2,
      asOf,
    );
    assert.equal(series.length, 2);
    const oct = series.find((s) => s.month === "2026-10")!;
    assert.equal(oct.newSubs, 1);
    assert.equal(oct.churned, 1);
  });
});

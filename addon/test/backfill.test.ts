import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  completedCursor,
  isBackfillIncomplete,
  resolveFetchCursor,
} from "../src/lib/backfill";
import { paginateWithBudget, nextResource } from "../src/importers/paginate";

describe("isBackfillIncomplete / resolveFetchCursor", () => {
  it("detects mid-pagination checkpoint", () => {
    assert.equal(isBackfillIncomplete({ pageToken: "abc", resource: "sales" }), true);
    assert.equal(isBackfillIncomplete({ resource: "orders" }), true);
    assert.equal(isBackfillIncomplete({ backfillComplete: true, lastSyncedAt: "2026-01-01" }), false);
    assert.equal(isBackfillIncomplete({ resource: "done", backfillComplete: true }), false);
    assert.equal(isBackfillIncomplete({}), false);
  });

  it("resumes incomplete backfill even on incremental sync", () => {
    const stored = { pageToken: "key-2", resource: "sales" as const, backfillComplete: false };
    const resolved = resolveFetchCursor(stored, false);
    assert.equal(resolved.mode, "backfill");
    assert.equal(resolved.cursor.pageToken, "key-2");
    assert.equal(resolved.cursor.lastSyncedAt, undefined);
  });

  it("starts fresh backfill when complete and full=true", () => {
    const stored = completedCursor("2026-01-01T00:00:00Z");
    const resolved = resolveFetchCursor(stored, true);
    assert.equal(resolved.mode, "backfill");
    assert.equal(resolved.cursor.pageToken, undefined);
    assert.equal(resolved.cursor.backfillComplete, false);
  });

  it("uses lastSyncedAt for incremental when complete", () => {
    const stored = completedCursor("2026-05-01T00:00:00Z");
    const resolved = resolveFetchCursor(stored, false);
    assert.equal(resolved.mode, "incremental");
    assert.equal(resolved.cursor.lastSyncedAt, "2026-05-01T00:00:00Z");
  });
});

describe("paginateWithBudget", () => {
  it("stops at maxPages and returns next token for resume", () => {
    const pages: Record<string, { items: number[]; nextToken?: string }> = {
      "": { items: [1, 2], nextToken: "p2" },
      p2: { items: [3, 4], nextToken: "p3" },
      p3: { items: [5], nextToken: undefined },
    };
    const first = paginateWithBudget((token) => pages[token || ""], undefined, 2);
    assert.deepEqual(first.items, [1, 2, 3, 4]);
    assert.equal(first.incomplete, true);
    assert.equal(first.nextToken, "p3");

    const second = paginateWithBudget((token) => pages[token || ""], first.nextToken, 2);
    assert.deepEqual(second.items, [5]);
    assert.equal(second.incomplete, false);
  });
});

describe("nextResource", () => {
  it("walks orders → subscriptions → customers → refunds → done", () => {
    assert.equal(nextResource(undefined), "orders");
    assert.equal(nextResource("orders"), "subscriptions");
    assert.equal(nextResource("subscriptions"), "customers");
    assert.equal(nextResource("customers"), "refunds");
    assert.equal(nextResource("refunds"), "done");
  });
});


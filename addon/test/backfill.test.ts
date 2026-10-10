import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  completedCursor,
  isBackfillIncomplete,
  resolveFetchCursor,
} from "../src/lib/backfill";
import { paginateWithBudget, nextResource } from "../src/importers/paginate";
import { fetchGumroadResult } from "../src/importers/gumroad";

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

describe("Gumroad page_key resume", () => {
  it("uses page_key (not page=) and resumes from next_page_key", async () => {
    const requested: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      requested.push(url);
      if (url.includes("/products?") && !url.includes("/subscribers")) {
        return new Response(JSON.stringify({ products: [] }), { status: 200 });
      }
      if (url.includes("/sales")) {
        assert.ok(!/[?&]page=\d/.test(url), "must not use deprecated page= offset");
        if (url.includes("page_key=NEXT1")) {
          return new Response(
            JSON.stringify({
              success: true,
              sales: [
                {
                  id: "g2",
                  created_at: "2026-01-02T00:00:00Z",
                  product_name: "Kit",
                  email: "b@x.com",
                  price: 1000,
                  currency: "usd",
                },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            success: true,
            sales: [
              {
                id: "g1",
                created_at: "2026-01-01T00:00:00Z",
                product_name: "Kit",
                email: "a@x.com",
                price: 2000,
                currency: "usd",
              },
            ],
            next_page_key: "NEXT1",
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    };

    const chunk1 = await fetchGumroadResult("gum-key", undefined, fetchImpl, 1);
    assert.equal(chunk1.incomplete, true);
    assert.equal(chunk1.cursor.pageToken, "NEXT1");
    assert.equal(chunk1.cursor.resource, "sales");
    assert.equal(chunk1.bundle.orders.length, 1);

    const chunk2 = await fetchGumroadResult("gum-key", chunk1.cursor, fetchImpl, 1);
    assert.equal(chunk2.incomplete, false);
    assert.equal(chunk2.cursor.backfillComplete, true);
    assert.equal(chunk2.bundle.orders.length, 1);
    assert.equal(chunk2.bundle.orders[0].id, "gumroad_sale_g2");
    assert.ok(requested.some((u) => u.includes("page_key=NEXT1")));
  });
});

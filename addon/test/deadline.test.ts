import { test } from "node:test";
import assert from "node:assert/strict";
import { clearDeadline, setDeadline } from "../src/lib/deadline";

test("stripe: time budget stops paging and returns a resumable cursor", async () => {
  const g = globalThis as Record<string, unknown>;
  let calls = 0;
  const urls: string[] = [];
  g.UrlFetchApp = {
    fetch: (url: string) => {
      calls += 1;
      setDeadline(-1); // time runs out during the first page
      urls.push(url);
      return {
        getResponseCode: () => 200,
        getAllHeaders: () => ({}),
        getContentText: () =>
          JSON.stringify({ data: [{ id: `ch_${calls}`, created: 1700000000, amount: 100, currency: "usd" }], has_more: true }),
      };
    },
  };
  const { fetchStripeResultSync } = await import("../src/importers/stripe");
  clearDeadline();
  const r = fetchStripeResultSync("rk_live_x", undefined, 40);
  clearDeadline();
  assert.equal(calls, 1);
  assert.equal(r.incomplete, true);
  assert.equal(r.cursor.resource, "orders");
  assert.equal(r.cursor.pageToken, "ch_1");
  assert.match(urls[0], /limit=100/);
  assert.match(urls[0], /created%5Bgte%5D=\d+/);
  delete g.UrlFetchApp;
});

import { test } from "node:test";
import assert from "node:assert/strict";

test("stripe: 403 on one resource skips it and names the missing permission", async () => {
  const g = globalThis as Record<string, unknown>;
  g.UrlFetchApp = {
    fetch: (url: string) => {
      const forbidden = url.includes("/customers");
      const body = forbidden
        ? { error: { message: "The provided key does not have the required permissions" } }
        : { data: [{ id: "x1", created: 1700000000, amount: 900, currency: "usd", status: "active" }], has_more: false };
      return {
        getResponseCode: () => (forbidden ? 403 : 200),
        getAllHeaders: () => ({}),
        getContentText: () => JSON.stringify(body),
      };
    },
  };
  const { fetchStripeResultSync } = await import("../src/importers/stripe");
  const r = fetchStripeResultSync("rk_live_test", undefined, 20);
  assert.equal(r.incomplete, false);
  assert.equal(r.bundle.orders.length, 1);
  assert.equal(r.bundle.subscriptions.length, 1);
  assert.equal(r.bundle.customers.length, 0);
  assert.match((r.warnings || []).join(" "), /Customers: Read/);
  delete g.UrlFetchApp;
});

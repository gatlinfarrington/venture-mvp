import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeMrr } from "../src/metrics/mrr";
import type { ImportBundle, NormalizedSubscription } from "../src/importers/types";
import {
  countConnectedStores,
  DEFAULT_STORE_ID,
  enforceStoreLimit,
  listConnectedStores,
  migrateLegacyKeys,
  storeScopedRowId,
  tagBundleWithStore,
  upsertStoresForSource,
} from "../src/lib/stores";

function emptyBundle(): ImportBundle {
  return { orders: [], subscriptions: [], customers: [], refunds: [] };
}

describe("migrateLegacyKeys", () => {
  it("promotes single API keys into a Default store", () => {
    const migrated = migrateLegacyKeys({
      lemon_squeezy: "ls_key_1",
      stripe: "rk_test_1",
    });
    assert.equal(migrated.lemon_squeezy!.length, 1);
    assert.equal(migrated.lemon_squeezy![0].id, DEFAULT_STORE_ID);
    assert.equal(migrated.lemon_squeezy![0].label, "Default");
    assert.equal(migrated.lemon_squeezy![0].apiKey, "ls_key_1");
    assert.equal(migrated.stripe![0].apiKey, "rk_test_1");
    assert.equal(migrated.polar, undefined);
  });

  it("does not overwrite existing multi-store config with legacy keys", () => {
    const existing = {
      lemon_squeezy: [
        { id: "us", label: "US", apiKey: "ls_us" },
        { id: "eu", label: "EU", apiKey: "ls_eu" },
      ],
    };
    const migrated = migrateLegacyKeys({ lemon_squeezy: "ls_legacy" }, existing);
    assert.equal(migrated.lemon_squeezy!.length, 2);
    assert.equal(migrated.lemon_squeezy![0].apiKey, "ls_us");
    assert.equal(migrated.lemon_squeezy![1].apiKey, "ls_eu");
  });
});

describe("enforceStoreLimit / maxStores", () => {
  it("allows one store on free/pro (maxStores=1)", () => {
    const stores = migrateLegacyKeys({
      lemon_squeezy: "a",
      polar: "b",
    });
    const limited = enforceStoreLimit(stores, 1);
    assert.equal(limited.allowed.length, 1);
    assert.equal(limited.blocked.length, 1);
    assert.ok(limited.message?.includes("Business"));
    assert.ok(limited.message?.includes("/pricing"));
  });

  it("allows up to 20 stores on business", () => {
    const stores = {
      lemon_squeezy: Array.from({ length: 12 }, (_, i) => ({
        id: `ls-${i}`,
        label: `LS ${i}`,
        apiKey: `key-ls-${i}`,
      })),
      stripe: Array.from({ length: 10 }, (_, i) => ({
        id: `st-${i}`,
        label: `Stripe ${i}`,
        apiKey: `key-st-${i}`,
      })),
    };
    assert.equal(countConnectedStores(stores), 22);
    const limited = enforceStoreLimit(stores, 20);
    assert.equal(limited.allowed.length, 20);
    assert.equal(limited.blocked.length, 2);
    assert.ok(limited.message?.includes("/pricing"));
  });
});

describe("tagBundleWithStore", () => {
  it("tags rows and keeps Default store ids stable", () => {
    const bundle: ImportBundle = {
      ...emptyBundle(),
      orders: [
        {
          id: "ls_order_1",
          source: "lemon_squeezy",
          created: "2026-01-01",
          product: "P",
          customerEmail: "a@x.com",
          amount: 10,
          currency: "USD",
          status: "paid",
          rawId: "1",
        },
      ],
      subscriptions: [
        {
          id: "ls_sub_1",
          source: "lemon_squeezy",
          created: "2026-01-01",
          product: "P",
          customerEmail: "a@x.com",
          mrr: 10,
          currency: "USD",
          status: "active",
          cancelledAt: null,
          interval: "month",
          rawId: "1",
        },
      ],
    };
    const def = tagBundleWithStore(bundle, { id: "default", label: "Default" });
    assert.equal(def.orders[0].id, "ls_order_1");
    assert.equal(def.orders[0].storeLabel, "Default");

    const us = tagBundleWithStore(bundle, { id: "us", label: "US" });
    assert.equal(us.orders[0].id, "ls_order_1__us");
    assert.equal(us.subscriptions[0].storeLabel, "US");
    assert.equal(storeScopedRowId("ls_order_1", "us"), "ls_order_1__us");
  });
});

describe("upsertStoresForSource", () => {
  it("keeps prior key when mask/blank is sent", () => {
    const current = [{ id: "us", label: "US", apiKey: "secret" }];
    const next = upsertStoresForSource(current, [
      { id: "us", label: "US West", apiKey: "••••••••" },
    ]);
    assert.equal(next[0].apiKey, "secret");
    assert.equal(next[0].label, "US West");
  });

  it("clears a store", () => {
    const current = [
      { id: "us", label: "US", apiKey: "a" },
      { id: "eu", label: "EU", apiKey: "b" },
    ];
    const next = upsertStoresForSource(current, [
      { id: "us", label: "US", apiKey: "a" },
      { id: "eu", label: "EU", clear: true },
    ]);
    assert.equal(next.length, 1);
    assert.equal(next[0].id, "us");
  });
});

describe("combined MRR across stores", () => {
  it("sums subscriptions from every store under the same source", () => {
    const subs: NormalizedSubscription[] = [
      {
        id: "ls_sub_1",
        source: "lemon_squeezy",
        created: "2026-01-01",
        product: "Pro",
        customerEmail: "a@x.com",
        mrr: 100,
        currency: "USD",
        status: "active",
        cancelledAt: null,
        interval: "month",
        rawId: "1",
        storeId: "us",
        storeLabel: "US",
      },
      {
        id: "ls_sub_2__eu",
        source: "lemon_squeezy",
        created: "2026-01-01",
        product: "Pro",
        customerEmail: "b@x.com",
        mrr: 50,
        currency: "USD",
        status: "active",
        cancelledAt: null,
        interval: "month",
        rawId: "2",
        storeId: "eu",
        storeLabel: "EU",
      },
      {
        id: "stripe_sub_1",
        source: "stripe",
        created: "2026-01-01",
        product: "Team",
        customerEmail: "c@x.com",
        mrr: 25,
        currency: "USD",
        status: "active",
        cancelledAt: null,
        interval: "month",
        rawId: "1",
        storeId: "default",
        storeLabel: "Default",
      },
    ];
    const mrr = computeMrr(subs);
    assert.equal(mrr.total, 175);
    assert.equal(mrr.bySource.lemon_squeezy, 150);
    assert.equal(mrr.bySource.stripe, 25);
    assert.equal(mrr.activeCount, 3);
  });
});

describe("listConnectedStores", () => {
  it("skips empty keys", () => {
    const list = listConnectedStores({
      gumroad: [
        { id: "a", label: "A", apiKey: "x" },
        { id: "b", label: "B", apiKey: "" },
      ],
    });
    assert.equal(list.length, 1);
    assert.equal(list[0].store.id, "a");
  });
});

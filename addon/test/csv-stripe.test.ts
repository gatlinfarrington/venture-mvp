import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapCsvToBundle, parseCsv } from "../src/importers/csv";
import {
  mapStripeCharge,
  mapStripeCustomer,
  mapStripeRefund,
  mapStripeSubscription,
} from "../src/importers/stripe";

describe("CSV import", () => {
  it("parses quoted fields", () => {
    const rows = parseCsv('id,product\n1,"Kit, Pro"\n');
    assert.equal(rows[1][1], "Kit, Pro");
  });

  it("maps columns into orders and subscriptions", () => {
    const csv = [
      "id,created,product,email,amount,currency,status,country,kind,mrr",
      "1,2026-10-01,Course,a@x.com,49,USD,paid,US,order,",
      "2,2026-09-01,Pro,b@x.com,0,USD,active,GB,subscription,29",
      "3,2026-10-02,Course,a@x.com,49,USD,refunded,US,refund,",
    ].join("\n");
    const bundle = mapCsvToBundle(csv, {
      id: "id",
      created: "created",
      product: "product",
      email: "email",
      amount: "amount",
      currency: "currency",
      status: "status",
      country: "country",
      kind: "kind",
      mrr: "mrr",
    });
    assert.equal(bundle.orders.length, 1);
    assert.equal(bundle.orders[0].country, "US");
    assert.equal(bundle.subscriptions.length, 1);
    assert.equal(bundle.subscriptions[0].mrr, 29);
    assert.equal(bundle.refunds.length, 1);
  });
});

describe("Stripe mappers", () => {
  it("maps charge / subscription / customer / refund", () => {
    const order = mapStripeCharge({
      id: "ch_1",
      created: 1696867200,
      amount: 4900,
      currency: "usd",
      status: "succeeded",
      billing_details: { email: "a@x.com", address: { country: "US" } },
      description: "Pro",
    });
    assert.equal(order.amount, 49);
    assert.equal(order.country, "US");
    assert.equal(order.source, "stripe");

    const sub = mapStripeSubscription({
      id: "sub_1",
      created: 1696867200,
      status: "active",
      currency: "usd",
      items: {
        data: [
          {
            price: {
              unit_amount: 12000,
              currency: "usd",
              nickname: "Yearly",
              recurring: { interval: "year" },
            },
          },
        ],
      },
    });
    assert.equal(sub.interval, "year");
    assert.equal(sub.mrr, 10);

    const cust = mapStripeCustomer({
      id: "cus_1",
      email: "a@x.com",
      name: "Ada",
      created: 1696867200,
      address: { country: "DE" },
    });
    assert.equal(cust.country, "DE");

    const refund = mapStripeRefund({
      id: "re_1",
      created: 1696867200,
      amount: 1000,
      currency: "usd",
      charge: "ch_1",
      status: "succeeded",
    });
    assert.equal(refund.amount, 10);
  });
});

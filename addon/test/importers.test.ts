import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapGumroadCustomerFromSale,
  mapGumroadRefundFromSale,
  mapGumroadSaleStrict,
  mapGumroadSubscriber,
} from "../src/importers/gumroad";
import {
  mapLemonCustomer,
  mapLemonOrder,
  mapLemonRefund,
  mapLemonSubscription,
} from "../src/importers/lemonSqueezy";
import {
  mapPolarCustomer,
  mapPolarOrder,
  mapPolarRefund,
  mapPolarSubscription,
} from "../src/importers/polar";

describe("Lemon Squeezy mappers", () => {
  it("maps orders from cents", () => {
    const order = mapLemonOrder({
      id: "99",
      type: "orders",
      attributes: {
        created_at: "2026-10-01T12:00:00Z",
        first_order_item: { product_name: "Course" },
        user_email: "a@example.com",
        total: 4900,
        currency: "USD",
        status: "paid",
      },
    });
    assert.equal(order.amount, 49);
    assert.equal(order.product, "Course");
    assert.equal(order.source, "lemon_squeezy");
  });

  it("maps yearly subscription to monthly MRR via related variant", () => {
    const sub = mapLemonSubscription(
      {
        id: "7",
        type: "subscriptions",
        attributes: {
          created_at: "2026-01-01T00:00:00Z",
          product_name: "Pro",
          user_email: "a@example.com",
          variant_id: 3,
          status: "active",
        },
      },
      { variant: { interval: "year", interval_count: 1, price: 12000 } },
    );
    assert.equal(sub.mrr, 10);
    assert.equal(sub.interval, "year");
  });

  it("maps quarterly (month × 3) subscription to monthly MRR", () => {
    const sub = mapLemonSubscription(
      {
        id: "8",
        type: "subscriptions",
        attributes: {
          created_at: "2026-01-01T00:00:00Z",
          product_name: "Pro Quarterly",
          user_email: "a@example.com",
          variant_id: 4,
          status: "active",
        },
      },
      { variant: { interval: "month", interval_count: 3, price: 9000 } },
    );
    assert.equal(sub.interval, "quarter");
    assert.equal(sub.mrr, 30);
  });

  it("maps customer and refund", () => {
    const cust = mapLemonCustomer({
      id: "1",
      type: "customers",
      attributes: { email: "a@x.com", name: "Ada", created_at: "2026-01-01" },
    });
    assert.equal(cust.email, "a@x.com");
    const refund = mapLemonRefund({
      id: "2",
      type: "refunds",
      attributes: { amount: 500, currency: "USD", order_id: "9", created_at: "2026-02-01" },
    });
    assert.equal(refund.amount, 5);
  });
});

describe("Polar mappers", () => {
  it("maps order / subscription / customer / refund", () => {
    const order = mapPolarOrder({
      id: "o1",
      created_at: "2026-10-01T00:00:00Z",
      amount: 2900,
      currency: "usd",
      status: "paid",
      product: { name: "Polar Pro" },
      customer: { email: "p@x.com" },
    });
    assert.equal(order.amount, 29);
    assert.equal(order.product, "Polar Pro");

    const sub = mapPolarSubscription({
      id: "s1",
      created_at: "2026-01-01T00:00:00Z",
      status: "active",
      price: { price_amount: 7900, recurring_interval: "month", price_currency: "usd" },
      product: { name: "Team" },
      customer: { email: "p@x.com" },
    });
    assert.equal(sub.mrr, 79);

    const cust = mapPolarCustomer({
      id: "c1",
      email: "p@x.com",
      name: "Pat",
      created_at: "2026-01-01",
    });
    assert.equal(cust.email, "p@x.com");

    const refund = mapPolarRefund({
      id: "r1",
      amount: 1000,
      currency: "usd",
      order_id: "o1",
      created_at: "2026-02-01",
      status: "succeeded",
    });
    assert.equal(refund.amount, 10);
  });
});

describe("Gumroad mappers", () => {
  it("maps sale, subscriber, customer, refund", () => {
    const sale = mapGumroadSaleStrict({
      id: "sale1",
      created_at: "2026-10-01T00:00:00Z",
      product_name: "Template Kit",
      email: "g@x.com",
      price: 1900,
      currency: "usd",
      refunded: false,
    });
    assert.equal(sale.amount, 19);
    assert.equal(sale.status, "paid");

    const sub = mapGumroadSubscriber({
      id: "sub1",
      created_at: "2026-01-01T00:00:00Z",
      product_name: "Membership",
      user_email: "g@x.com",
      price: 1200,
      recurrence: "monthly",
      cancelled: false,
    });
    assert.equal(sub.mrr, 12);

    const cust = mapGumroadCustomerFromSale({
      id: "sale1",
      email: "g@x.com",
      full_name: "Gum",
      created_at: "2026-10-01",
    });
    assert.equal(cust.email, "g@x.com");

    const refund = mapGumroadRefundFromSale({
      id: "sale2",
      price: 1900,
      refunded: true,
      created_at: "2026-10-02",
      currency: "usd",
    });
    assert.ok(refund);
    assert.equal(refund!.amount, 19);
  });
});


import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapGumroadCustomerFromSale,
  mapGumroadRefundFromSale,
  mapGumroadSaleStrict,
  mapGumroadSubscriber,
  fetchGumroad,
} from "../src/importers/gumroad";
import {
  mapLemonCustomer,
  mapLemonOrder,
  mapLemonRefund,
  mapLemonSubscription,
  fetchLemonSqueezy,
} from "../src/importers/lemonSqueezy";
import {
  mapPolarCustomer,
  mapPolarOrder,
  mapPolarRefund,
  mapPolarSubscription,
  fetchPolar,
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

describe("importer pagination with mocked fetch", () => {
  it("pages Lemon Squeezy orders", async () => {
    const pages = [
      {
        data: [
          {
            id: "1",
            type: "orders",
            attributes: {
              created_at: "2026-01-01T00:00:00Z",
              first_order_item: { product_name: "A" },
              user_email: "a@x.com",
              total: 1000,
              currency: "USD",
              status: "paid",
            },
          },
        ],
        links: { next: "https://api.lemonsqueezy.com/v1/orders?page=2" },
      },
      {
        data: [
          {
            id: "2",
            type: "orders",
            attributes: {
              created_at: "2026-01-02T00:00:00Z",
              first_order_item: { product_name: "B" },
              user_email: "b@x.com",
              total: 2000,
              currency: "USD",
              status: "paid",
            },
          },
        ],
        links: { next: null },
      },
    ];
    let calls = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      calls += 1;
      if (url.includes("/subscriptions") || url.includes("/customers") || url.includes("/refunds")) {
        return new Response(JSON.stringify({ data: [], links: {} }), { status: 200 });
      }
      const body = url.includes("page=2") ? pages[1] : pages[0];
      return new Response(JSON.stringify(body), { status: 200 });
    };
    const bundle = await fetchLemonSqueezy("test-key", undefined, fetchImpl);
    assert.equal(bundle.orders.length, 2);
    assert.equal(bundle.orders[0].amount, 10);
    assert.equal(bundle.orders[1].amount, 20);
    assert.ok(calls >= 2);
  });

  it("normalizes LS yearly/quarterly MRR from included variant", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/subscriptions")) {
        assert.ok(url.includes("include=variant"), "subscriptions request must include=variant");
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "s-year",
                type: "subscriptions",
                attributes: {
                  created_at: "2026-01-01T00:00:00Z",
                  product_name: "Pro Yearly",
                  user_email: "y@x.com",
                  variant_id: 101,
                  status: "active",
                },
              },
              {
                id: "s-q",
                type: "subscriptions",
                attributes: {
                  created_at: "2026-01-01T00:00:00Z",
                  product_name: "Pro Quarterly",
                  user_email: "q@x.com",
                  variant_id: 102,
                  status: "active",
                },
              },
            ],
            included: [
              {
                id: "101",
                type: "variants",
                attributes: { interval: "year", interval_count: 1, price: 12000 },
              },
              {
                id: "102",
                type: "variants",
                attributes: { interval: "month", interval_count: 3, price: 9000 },
              },
            ],
            links: {},
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ data: [], links: {} }), { status: 200 });
    };
    const bundle = await fetchLemonSqueezy("test-key", undefined, fetchImpl);
    assert.equal(bundle.subscriptions.length, 2);
    const yearly = bundle.subscriptions.find((s) => s.rawId === "s-year")!;
    const quarterly = bundle.subscriptions.find((s) => s.rawId === "s-q")!;
    assert.equal(yearly.interval, "year");
    assert.equal(yearly.mrr, 10);
    assert.equal(quarterly.interval, "quarter");
    assert.equal(quarterly.mrr, 30);
  });

  it("pages Polar orders", async () => {
    let n = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (!url.includes("/orders")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }
      n += 1;
      if (n === 1) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "p1",
                created_at: "2026-01-01T00:00:00Z",
                amount: 5000,
                currency: "usd",
                status: "paid",
                product: { name: "P" },
                customer: { email: "p@x.com" },
              },
            ],
            pagination: { next_page: "/v1/orders?page=2" },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ items: [], pagination: {} }), { status: 200 });
    };
    const bundle = await fetchPolar("polar-key", undefined, fetchImpl);
    assert.equal(bundle.orders.length, 1);
    assert.equal(bundle.orders[0].amount, 50);
  });

  it("pages Gumroad sales", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/products?") && !url.includes("/subscribers")) {
        return new Response(JSON.stringify({ products: [] }), { status: 200 });
      }
      if (url.includes("/sales")) {
        return new Response(
          JSON.stringify({
            success: true,
            sales: [
              {
                id: "g1",
                created_at: "2026-01-01T00:00:00Z",
                product_name: "Kit",
                email: "g@x.com",
                price: 2500,
                currency: "usd",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    };
    const bundle = await fetchGumroad("gum-key", undefined, fetchImpl);
    assert.equal(bundle.orders.length, 1);
    assert.equal(bundle.orders[0].amount, 25);
    assert.equal(bundle.customers.length, 1);
  });
});

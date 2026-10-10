import type {
  ImportBundle,
  NormalizedCustomer,
  NormalizedOrder,
  NormalizedRefund,
  NormalizedSubscription,
} from "../importers/types";

/** Realistic SAMPLE dataset labeled for screenshots (matches launch template). Not live customer data. */
export function buildSampleBundle(asOf: Date = new Date()): ImportBundle {
  const products = [
    { name: "Demo SaaS · Pro", source: "polar" as const, mrr: 29 },
    { name: "Demo SaaS · Team", source: "polar" as const, mrr: 79 },
    { name: "Example Course Bundle", source: "lemon_squeezy" as const, mrr: 49 },
    { name: "Template Kit (example)", source: "gumroad" as const, mrr: 19 },
    { name: "Sample Icon Pack", source: "gumroad" as const, mrr: 12 },
    { name: "Sample E-book", source: "lemon_squeezy" as const, mrr: 9 },
  ];

  const subscriptions: NormalizedSubscription[] = [];
  const orders: NormalizedOrder[] = [];
  const customers: NormalizedCustomer[] = [];
  const refunds: NormalizedRefund[] = [];

  let subId = 1;
  let orderId = 1;

  // Seed ~418 active-ish subs across 12 months of history
  for (let m = 14; m >= 0; m--) {
    const monthStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - m, 1));
    const newCount = 18 + ((14 - m) % 5) * 3;
    for (let i = 0; i < newCount; i++) {
      const product = products[i % products.length];
      const day = 1 + (i % 27);
      const created = new Date(
        Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day, 12, 0, 0),
      );
      const email = `sample.user${subId}@example.com`;
      const cancel = m < 3 && i % 17 === 0;
      const cancelledAt = cancel
        ? new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 2 + (i % 10)))
        : null;

      subscriptions.push({
        id: `sample_sub_${subId}`,
        source: product.source,
        created: created.toISOString(),
        product: product.name,
        customerEmail: email,
        mrr: product.mrr,
        currency: "USD",
        status: cancel ? "cancelled" : i % 41 === 0 ? "past_due" : "active",
        cancelledAt: cancelledAt ? cancelledAt.toISOString() : null,
        interval: "month",
        rawId: String(subId),
      });

      customers.push({
        id: `sample_cust_${subId}`,
        source: product.source,
        email,
        name: `Sample User ${subId}`,
        created: created.toISOString().slice(0, 10),
        rawId: String(subId),
      });

      // Monthly renewal / purchase order
      orders.push({
        id: `sample_order_${orderId++}`,
        source: product.source,
        created: created.toISOString(),
        product: product.name,
        customerEmail: email,
        amount: product.mrr,
        currency: "USD",
        status: "paid",
        rawId: String(orderId),
      });

      subId += 1;
    }
  }

  // Extra one-time sales in last 30d for net revenue
  for (let i = 0; i < 40; i++) {
    const product = products[i % products.length];
    const daysAgo = i % 28;
    const created = new Date(asOf.getTime() - daysAgo * 86400000);
    orders.push({
      id: `sample_order_${orderId++}`,
      source: product.source,
      created: created.toISOString(),
      product: product.name,
      customerEmail: `buyer${i}@example.com`,
      amount: product.mrr * (1 + (i % 3)),
      currency: "USD",
      status: i % 19 === 0 ? "refunded" : "paid",
      rawId: String(orderId),
    });
    if (i % 19 === 0) {
      refunds.push({
        id: `sample_refund_${i}`,
        source: product.source,
        created: created.toISOString(),
        orderId: `sample_order_${orderId - 1}`,
        amount: product.mrr,
        currency: "USD",
        status: "refunded",
        rawId: String(i),
      });
    }
  }

  return { orders, subscriptions, customers, refunds };
}

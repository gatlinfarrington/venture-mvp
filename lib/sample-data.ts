/** Hardcoded example rows for /sample. No fetch, no Google embed. */

export const SAMPLE_TAB_NAMES = ["Dashboard", "Orders", "Subscriptions"] as const;

export const ORDER_HEADERS = [
  "Order ID",
  "Created",
  "Source",
  "Product",
  "Customer email",
  "Amount (USD)",
  "Status",
  "Country",
] as const;

export const SUB_HEADERS = [
  "Subscription ID",
  "Created",
  "Source",
  "Product",
  "Customer email",
  "MRR (USD)",
  "Status",
  "Cancelled",
  "Interval",
  "Country",
] as const;

export type SampleOrder = {
  id: string;
  created: string;
  source: string;
  product: string;
  email: string;
  amount: number;
  status: "paid" | "refunded";
  country: string;
};

export type SampleSub = {
  id: string;
  created: string;
  source: string;
  product: string;
  email: string;
  mrr: number;
  status: "active" | "past_due" | "canceled" | "trialing";
  cancelled: string;
  interval: string;
  country: string;
};

const SOURCES = ["Lemon Squeezy", "Polar", "Gumroad", "Stripe"] as const;
const PRODUCTS = [
  "Demo SaaS · Pro",
  "Demo SaaS · Team",
  "Template Kit",
  "Example Course",
  "Sample Icon Pack",
] as const;
const COUNTRIES = ["US", "GB", "DE", "CA", "AU", "NL", "FR", "SE"] as const;

type OrderSeed = {
  source: (typeof SOURCES)[number];
  product: (typeof PRODUCTS)[number];
  amount: number;
};

/**
 * 14 landings in time order (first → last). Amounts sum to 251.
 * Stored in ORDERS[13]…ORDERS[0] so HERO_LANDINGS = ORDERS.slice(0,14).reverse().
 */
const LANDING_SEEDS: OrderSeed[] = [
  { source: "Lemon Squeezy", product: "Demo SaaS · Pro", amount: 29 },
  { source: "Polar", product: "Example Course", amount: 19 },
  { source: "Gumroad", product: "Sample Icon Pack", amount: 12 },
  { source: "Stripe", product: "Demo SaaS · Team", amount: 9 },
  { source: "Polar", product: "Template Kit", amount: 29 },
  { source: "Gumroad", product: "Demo SaaS · Pro", amount: 19 },
  { source: "Lemon Squeezy", product: "Sample Icon Pack", amount: 12 },
  { source: "Stripe", product: "Example Course", amount: 9 },
  { source: "Gumroad", product: "Demo SaaS · Team", amount: 29 },
  { source: "Lemon Squeezy", product: "Template Kit", amount: 19 },
  { source: "Polar", product: "Sample Icon Pack", amount: 12 },
  { source: "Stripe", product: "Demo SaaS · Pro", amount: 9 },
  { source: "Lemon Squeezy", product: "Example Course", amount: 29 },
  { source: "Polar", product: "Demo SaaS · Team", amount: 15 },
];

/** 9 seed rows + 1 older filler for the 24-order continuum. */
const SEED_AND_TAIL: OrderSeed[] = [
  { source: "Lemon Squeezy", product: "Sample Icon Pack", amount: 12 },
  { source: "Gumroad", product: "Demo SaaS · Pro", amount: 19 },
  { source: "Polar", product: "Demo SaaS · Team", amount: 29 },
  { source: "Stripe", product: "Template Kit", amount: 9 },
  { source: "Lemon Squeezy", product: "Example Course", amount: 49 },
  { source: "Gumroad", product: "Sample Icon Pack", amount: 12 },
  { source: "Polar", product: "Demo SaaS · Pro", amount: 29 },
  { source: "Stripe", product: "Demo SaaS · Team", amount: 79 },
  { source: "Lemon Squeezy", product: "Template Kit", amount: 19 },
  { source: "Gumroad", product: "Example Course", amount: 49 },
];

function orderFromSeed(seed: OrderSeed, idNum: number, i: number): SampleOrder {
  const day = 9 - Math.floor(i / 3);
  const hour = 16 - (i % 8);
  const min = (i * 7) % 60;
  return {
    id: `EX-${idNum}`,
    created: `2026-10-${String(Math.max(1, day)).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
    source: seed.source,
    product: seed.product,
    email: `customer${100 + i}@example.com`,
    amount: seed.amount,
    status: (i === 11 || i === 19 ? "refunded" : "paid") as SampleOrder["status"],
    country: COUNTRIES[i % COUNTRIES.length]!,
  };
}

/**
 * One shared continuum: EX-10470…EX-10447 (24 unique IDs).
 * - HERO_SEED = ORDERS.slice(14, 23) → EX-10456…EX-10448
 * - HERO_LANDINGS = ORDERS.slice(0, 14).reverse() → EX-10457…EX-10470 in time order
 * - Final hero = ORDERS.slice(0, 9) → EX-10470…EX-10462
 * - /sample Orders = ORDERS in full (excerpt of 24)
 */
export const ORDERS: SampleOrder[] = (() => {
  const seeds: OrderSeed[] = [];
  for (let i = LANDING_SEEDS.length - 1; i >= 0; i--) {
    seeds.push(LANDING_SEEDS[i]!);
  }
  for (const s of SEED_AND_TAIL) seeds.push(s);
  return seeds.map((seed, i) => orderFromSeed(seed, 10470 - i, i));
})();

export const HERO_SEED = ORDERS.slice(14, 23);
export const HERO_LANDINGS = ORDERS.slice(0, 14).reverse();
export const HERO_FINAL = ORDERS.slice(0, 9);

/** @deprecated Prefer HERO_FINAL; kept for any lingering imports. */
export const HERO_ORDERS = HERO_FINAL;

export const SAMPLE_ORDERS = ORDERS;

export const LANDING_TOTAL = HERO_LANDINGS.reduce((s, o) => s + o.amount, 0);

/**
 * Stacked MRR chart (full-sheet example). Oct total is the shared hero FINAL_MRR.
 * Sep → Oct MoM = (11700 - 11500) / 11500 = 1.7%.
 */
export const MRR_STACK = [
  { month: "Nov", polar: 2800, ls: 2100, gum: 1200 },
  { month: "Dec", polar: 3100, ls: 2300, gum: 1300 },
  { month: "Jan", polar: 3450, ls: 2450, gum: 1350 },
  { month: "Feb", polar: 3800, ls: 2600, gum: 1400 },
  { month: "Mar", polar: 4200, ls: 2800, gum: 1450 },
  { month: "Apr", polar: 4600, ls: 3000, gum: 1500 },
  { month: "May", polar: 5000, ls: 3200, gum: 1550 },
  { month: "Jun", polar: 5400, ls: 3400, gum: 1600 },
  { month: "Jul", polar: 5800, ls: 3600, gum: 1650 },
  { month: "Aug", polar: 6000, ls: 3600, gum: 1650 },
  { month: "Sep", polar: 6400, ls: 3400, gum: 1700 },
  { month: "Oct", polar: 6900, ls: 3000, gum: 1800 },
] as const;

export const SAMPLE_MRR_OCT = MRR_STACK[11]!.polar + MRR_STACK[11]!.ls + MRR_STACK[11]!.gum;
export const SAMPLE_MRR_SEP = MRR_STACK[10]!.polar + MRR_STACK[10]!.ls + MRR_STACK[10]!.gum;
export const SAMPLE_MRR_MOM =
  Math.round(((SAMPLE_MRR_OCT - SAMPLE_MRR_SEP) / SAMPLE_MRR_SEP) * 1000) / 10;

function buildSubs(): SampleSub[] {
  const rows: SampleSub[] = [];
  for (let i = 0; i < 24; i++) {
    const id = `EXS-${2241 - i}`;
    const source = SOURCES[i % 3]!;
    const product = PRODUCTS[i % PRODUCTS.length]!;
    const mrr = [29, 79, 19, 49, 12][i % 5]!;
    const canceled = i % 9 === 0;
    const pastDue = i % 11 === 0;
    // Created always before the Oct 2 cancel date used for canceled rows.
    const created = canceled
      ? `2026-09-${String(1 + (i % 20)).padStart(2, "0")}`
      : `2026-${String((((i * 3) % 12) + 1)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`;
    rows.push({
      id,
      created,
      source,
      product,
      email: `customer${200 + i}@example.com`,
      mrr,
      status: canceled ? "canceled" : pastDue ? "past_due" : i % 13 === 0 ? "trialing" : "active",
      cancelled: canceled ? "2026-10-02" : "",
      interval: "month",
      country: COUNTRIES[i % COUNTRIES.length]!,
    });
  }
  return rows;
}

export const SAMPLE_SUBS = buildSubs();

const SAMPLE_PAID_NET = SAMPLE_ORDERS.filter((o) => o.status === "paid").reduce(
  (sum, o) => sum + o.amount,
  0,
);

const ACTIVE_SUBS = SAMPLE_SUBS.filter((s) => s.status === "active");
const PAST_DUE_SUBS = SAMPLE_SUBS.filter((s) => s.status === "past_due");
const PAST_DUE_MRR = PAST_DUE_SUBS.reduce((s, x) => s + x.mrr, 0);

function countOrders(source: string) {
  return SAMPLE_ORDERS.filter((o) => o.source === source).length;
}

export const DASHBOARD = {
  mrr: `$${(SAMPLE_MRR_OCT / 1000).toFixed(1)}k`,
  mrrDelta: `▲ ${SAMPLE_MRR_MOM}% MoM`,
  /** Sum of paid Orders in this excerpt. */
  netRevenue: `$${SAMPLE_PAID_NET.toLocaleString("en-US")}`,
  netDelta: "30D · excerpt",
  activeSubs: String(ACTIVE_SUBS.length),
  activeDelta: `of ${SAMPLE_SUBS.length} in excerpt`,
  churn: "1.9%",
  churnDelta: "▼ 0.3 pts",
  pastDueLine: `Past due ${PAST_DUE_SUBS.length} · $${PAST_DUE_MRR} · MRR counts active subscriptions only`,
  statusLine: "● SYNCED · LAST RUN 10:02 · NEXT 11:02 · EXAMPLE DATA",
  sources: [
    { name: "Polar", detail: `${countOrders("Polar")} in excerpt`, state: "Synced" as const },
    {
      name: "Lemon Squeezy",
      detail: `${countOrders("Lemon Squeezy")} in excerpt`,
      state: "Synced" as const,
    },
    { name: "Gumroad", detail: `${countOrders("Gumroad")} in excerpt`, state: "Synced" as const },
    {
      name: "Stripe",
      detail: `${countOrders("Stripe")} in excerpt`,
      state: "Synced" as const,
    },
    { name: "CSV import", detail: "", state: "Not connected" as const },
  ],
  mrrStack: MRR_STACK,
} as const;

export const SAMPLE_ORDERS_CAPTION = `Excerpt · ${SAMPLE_ORDERS.length} example orders`;
export const SAMPLE_SUBS_CAPTION = `Excerpt · ${SAMPLE_SUBS.length} example subscriptions`;

export const SAMPLE_CAPTION =
  "Example data. Fake stores and customers (alex@example.com), not real revenue.";

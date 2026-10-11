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

/** First nine match hero/Marketplace table, IDs EX-10456 downward. */
const HERO_FIRST_NINE: Array<{
  source: (typeof SOURCES)[number];
  product: (typeof PRODUCTS)[number];
  amount: number;
}> = [
  { source: "Lemon Squeezy", product: "Sample Icon Pack", amount: 12 },
  { source: "Gumroad", product: "Demo SaaS · Pro", amount: 19 },
  { source: "Polar", product: "Demo SaaS · Team", amount: 29 },
  { source: "Stripe", product: "Template Kit", amount: 9 },
  { source: "Lemon Squeezy", product: "Example Course", amount: 49 },
  { source: "Gumroad", product: "Sample Icon Pack", amount: 12 },
  { source: "Polar", product: "Demo SaaS · Pro", amount: 29 },
  { source: "Stripe", product: "Demo SaaS · Team", amount: 79 },
  { source: "Lemon Squeezy", product: "Template Kit", amount: 19 },
];

function buildOrders(): SampleOrder[] {
  const rows: SampleOrder[] = [];
  for (let i = 0; i < 24; i++) {
    const id = `EX-${10456 - i}`;
    const seed = i < HERO_FIRST_NINE.length ? HERO_FIRST_NINE[i]! : null;
    const source = seed?.source ?? SOURCES[i % SOURCES.length]!;
    const product = seed?.product ?? PRODUCTS[i % PRODUCTS.length]!;
    const amount = seed?.amount ?? [29, 19, 12, 49, 9, 79][i % 6]!;
    const day = 9 - Math.floor(i / 3);
    const hour = 16 - (i % 8);
    const min = (i * 7) % 60;
    rows.push({
      id,
      created: `2026-10-${String(Math.max(1, day)).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
      source,
      product,
      email: `customer${100 + i}@example.com`,
      amount,
      status: i === 11 || i === 19 ? "refunded" : "paid",
      country: COUNTRIES[i % COUNTRIES.length]!,
    });
  }
  return rows;
}

function buildSubs(): SampleSub[] {
  const rows: SampleSub[] = [];
  for (let i = 0; i < 24; i++) {
    const id = `EXS-${2241 - i}`;
    const source = SOURCES[i % 3]!; // Polar / LS / Gumroad heavy
    const product = PRODUCTS[i % PRODUCTS.length]!;
    const mrr = [29, 79, 19, 49, 12][i % 5]!;
    const canceled = i % 9 === 0;
    const pastDue = i % 11 === 0;
    const month = ((i * 3) % 12) + 1;
    rows.push({
      id,
      created: `2026-${String(month).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`,
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

export const SAMPLE_ORDERS = buildOrders();
export const SAMPLE_SUBS = buildSubs();

export const DASHBOARD = {
  mrr: "$11.7k",
  mrrDelta: "▲ 4.2% MoM",
  netRevenue: "$3,624",
  netDelta: "▲ 6.1%",
  activeSubs: "342",
  activeDelta: "▲ 24 net new",
  churn: "1.9%",
  churnDelta: "▼ 0.3 pts",
  pastDueLine: "Past due 12 · $348 · MRR counts active subscriptions only",
  statusLine: "● SYNCED · LAST RUN 10:02 · NEXT 11:02 · EXAMPLE DATA",
  sources: [
    { name: "Polar", detail: "412 orders", state: "Synced" as const },
    { name: "Lemon Squeezy", detail: "1,284 orders", state: "Synced" as const },
    { name: "Gumroad", detail: "903 sales", state: "Synced" as const },
    { name: "Stripe", detail: "Restricted key", state: "Backfilling 62%" as const },
    { name: "CSV import", detail: "", state: "Not connected" as const },
  ],
  /** Stacked totals rise ~6.1k → 11.7k (Polar / LS / Gumroad). */
  mrrStack: [
    { month: "Nov", polar: 2800, ls: 2100, gum: 1200 },
    { month: "Dec", polar: 3100, ls: 2300, gum: 1300 },
    { month: "Jan", polar: 3400, ls: 2500, gum: 1400 },
    { month: "Feb", polar: 3700, ls: 2700, gum: 1450 },
    { month: "Mar", polar: 4100, ls: 2900, gum: 1500 },
    { month: "Apr", polar: 4500, ls: 3100, gum: 1550 },
    { month: "May", polar: 4900, ls: 3300, gum: 1600 },
    { month: "Jun", polar: 5300, ls: 3500, gum: 1650 },
    { month: "Jul", polar: 5700, ls: 3700, gum: 1700 },
    { month: "Aug", polar: 6100, ls: 3900, gum: 1750 },
    { month: "Sep", polar: 6500, ls: 4100, gum: 1800 },
    { month: "Oct", polar: 6900, ls: 3000, gum: 1800 },
  ],
} as const;

export const SAMPLE_CAPTION =
  "Example data. Fake stores and customers (customer###@example.com), not real revenue. Numbers match the Marketplace screenshots.";

/** Read-only example rows for /sample. IDs use EX-104xx; no real customers. */

export const SAMPLE_STUDIO = "EXAMPLE STUDIO";
export const SAMPLE_CURRENCY = "USD";

export type SampleOrder = {
  id: string;
  created: string;
  source: string;
  store: string;
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
  store: string;
  product: string;
  email: string;
  mrr: number;
  status: "active" | "past_due" | "cancelled" | "trialing";
  cancelled: string;
  interval: string;
  country: string;
};

export const ORDER_HEADERS = [
  "Order ID",
  "Created",
  "Source",
  "Store",
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
  "Store",
  "Product",
  "Customer email",
  "MRR (USD)",
  "Status",
  "Cancelled",
  "Interval",
  "Country",
] as const;

/** Contiguous with hero demo EX-10441…EX-10450 range. */
export const SAMPLE_ORDERS: SampleOrder[] = [
  {
    id: "EX-10450",
    created: "2026-10-09",
    source: "Lemon Squeezy",
    store: "example-store",
    product: "Demo SaaS · Pro",
    email: "sample.user1@example.com",
    amount: 29,
    status: "paid",
    country: "US",
  },
  {
    id: "EX-10449",
    created: "2026-10-09",
    source: "Polar",
    store: "example-org",
    product: "Example Course Bundle",
    email: "sample.user2@example.com",
    amount: 49,
    status: "paid",
    country: "GB",
  },
  {
    id: "EX-10448",
    created: "2026-10-08",
    source: "Gumroad",
    store: "example-seller",
    product: "Sample Icon Pack",
    email: "sample.user3@example.com",
    amount: 12,
    status: "paid",
    country: "DE",
  },
  {
    id: "EX-10447",
    created: "2026-10-08",
    source: "Polar",
    store: "example-org",
    product: "Demo SaaS · Team",
    email: "sample.user4@example.com",
    amount: 79,
    status: "paid",
    country: "CA",
  },
  {
    id: "EX-10446",
    created: "2026-10-07",
    source: "Lemon Squeezy",
    store: "example-store",
    product: "Sample E-book",
    email: "sample.user5@example.com",
    amount: 9,
    status: "paid",
    country: "AU",
  },
  {
    id: "EX-10445",
    created: "2026-10-07",
    source: "Gumroad",
    store: "example-seller",
    product: "Template Kit (example)",
    email: "sample.user6@example.com",
    amount: 19,
    status: "refunded",
    country: "NL",
  },
  {
    id: "EX-10444",
    created: "2026-10-06",
    source: "Polar",
    store: "example-org",
    product: "Demo SaaS · Pro",
    email: "sample.user7@example.com",
    amount: 29,
    status: "paid",
    country: "FR",
  },
  {
    id: "EX-10443",
    created: "2026-10-06",
    source: "Lemon Squeezy",
    store: "example-store",
    product: "Example Course Bundle",
    email: "sample.user8@example.com",
    amount: 49,
    status: "paid",
    country: "SE",
  },
  {
    id: "EX-10442",
    created: "2026-10-05",
    source: "Gumroad",
    store: "example-seller",
    product: "Sample Icon Pack",
    email: "sample.user9@example.com",
    amount: 12,
    status: "paid",
    country: "US",
  },
  {
    id: "EX-10441",
    created: "2026-10-05",
    source: "Polar",
    store: "example-org",
    product: "Demo SaaS · Team",
    email: "sample.user10@example.com",
    amount: 79,
    status: "paid",
    country: "GB",
  },
];

export const SAMPLE_SUBS: SampleSub[] = [
  {
    id: "EX-SUB-10450",
    created: "2026-01-12",
    source: "Polar",
    store: "example-org",
    product: "Demo SaaS · Pro",
    email: "sample.user1@example.com",
    mrr: 29,
    status: "active",
    cancelled: "",
    interval: "month",
    country: "US",
  },
  {
    id: "EX-SUB-10449",
    created: "2026-02-03",
    source: "Lemon Squeezy",
    store: "example-store",
    product: "Example Course Bundle",
    email: "sample.user2@example.com",
    mrr: 49,
    status: "active",
    cancelled: "",
    interval: "month",
    country: "GB",
  },
  {
    id: "EX-SUB-10448",
    created: "2026-03-18",
    source: "Gumroad",
    store: "example-seller",
    product: "Template Kit (example)",
    email: "sample.user3@example.com",
    mrr: 19,
    status: "active",
    cancelled: "",
    interval: "month",
    country: "DE",
  },
  {
    id: "EX-SUB-10447",
    created: "2026-04-09",
    source: "Polar",
    store: "example-org",
    product: "Demo SaaS · Team",
    email: "sample.user4@example.com",
    mrr: 79,
    status: "past_due",
    cancelled: "",
    interval: "month",
    country: "CA",
  },
  {
    id: "EX-SUB-10446",
    created: "2026-05-22",
    source: "Lemon Squeezy",
    store: "example-store",
    product: "Sample E-book",
    email: "sample.user5@example.com",
    mrr: 9,
    status: "trialing",
    cancelled: "",
    interval: "month",
    country: "AU",
  },
  {
    id: "EX-SUB-10445",
    created: "2025-11-14",
    source: "Gumroad",
    store: "example-seller",
    product: "Sample Icon Pack",
    email: "sample.user6@example.com",
    mrr: 12,
    status: "cancelled",
    cancelled: "2026-10-02",
    interval: "month",
    country: "NL",
  },
  {
    id: "EX-SUB-10444",
    created: "2026-06-01",
    source: "Polar",
    store: "example-org",
    product: "Demo SaaS · Pro",
    email: "sample.user7@example.com",
    mrr: 29,
    status: "active",
    cancelled: "",
    interval: "month",
    country: "FR",
  },
  {
    id: "EX-SUB-10443",
    created: "2026-07-15",
    source: "Lemon Squeezy",
    store: "example-store",
    product: "Example Course Bundle",
    email: "sample.user8@example.com",
    mrr: 49,
    status: "active",
    cancelled: "",
    interval: "month",
    country: "SE",
  },
];

export const DASHBOARD_KPIS = [
  { label: "MRR", value: "$4,566", delta: "▲ 8.4%", positive: true },
  { label: "NET REVENUE · 30D", value: "$6,912", delta: "▲ 5.1%", positive: true },
  { label: "ACTIVE SUBSCRIPTIONS", value: "418", delta: "▲ 23 net new", positive: true },
  { label: "CHURN · 30D", value: "2.9%", delta: "▲ 0.3 pts", positive: false, inverse: true },
] as const;

/** Stacked MRR by source (LS / Polar / Gumroad), Nov→Oct. */
export const MRR_STACK = [
  { month: "Nov", ls: 860, polar: 300, gum: 510 },
  { month: "Dec", ls: 1000, polar: 420, gum: 540 },
  { month: "Jan", ls: 1090, polar: 530, gum: 550 },
  { month: "Feb", ls: 1130, polar: 645, gum: 600 },
  { month: "Mar", ls: 1255, polar: 795, gum: 630 },
  { month: "Apr", ls: 1380, polar: 905, gum: 715 },
  { month: "May", ls: 1460, polar: 1030, gum: 740 },
  { month: "Jun", ls: 1575, polar: 1195, gum: 730 },
  { month: "Jul", ls: 1665, polar: 1310, gum: 780 },
  { month: "Aug", ls: 1690, polar: 1445, gum: 830 },
  { month: "Sep", ls: 1855, polar: 1590, gum: 925 },
  { month: "Oct", ls: 1875, polar: 1705, gum: 986 },
] as const;

export const CHURN_SERIES = [3.5, 3.2, 3.7, 2.9, 2.7, 3.0, 2.8, 2.5, 2.9, 2.7, 2.7, 2.9] as const;

export const PRODUCT_REVENUE = [
  { product: "Demo SaaS · Pro", source: "Polar", revenue: 2140, vs: 12.4 },
  { product: "Example Course Bundle", source: "Lemon Squeezy", revenue: 1890, vs: 6.2 },
  { product: "Demo SaaS · Team", source: "Polar", revenue: 1320, vs: 18.0 },
  { product: "Template Kit (example)", source: "Gumroad", revenue: 860, vs: -3.1 },
  { product: "Sample Icon Pack", source: "Gumroad", revenue: 512, vs: -8.6 },
  { product: "Sample E-book", source: "Lemon Squeezy", revenue: 190, vs: 2.0 },
] as const;

export const SOURCE_REVENUE = [
  { source: "Lemon Squeezy", revenue: 2080, share: 30.1, vs: 4.2 },
  { source: "Polar", revenue: 3460, share: 50.1, vs: 14.9 },
  { source: "Gumroad", revenue: 1372, share: 19.8, vs: -4.8 },
] as const;

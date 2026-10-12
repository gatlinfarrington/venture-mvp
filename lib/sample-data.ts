/** Hardcoded example rows for /sample and the home hero. Sourced from sample-dataset.json. */

import raw from "@/lib/sample-dataset/sample-dataset.json";

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
  kind?: string;
  mrrDelta: number;
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
  price?: number;
};

type Dataset = typeof raw;

const data = raw as Dataset;

const EXCERPT_N = 24;

/** Full 30-day order continuum (newest first). */
export const ORDERS: SampleOrder[] = data.orders.map((o) => ({
  id: o.id,
  created: o.created,
  source: o.source,
  product: o.product,
  email: o.email,
  amount: o.amount,
  status: o.status as SampleOrder["status"],
  country: o.country,
  kind: o.kind,
  mrrDelta: o.mrrDelta,
}));

export const SAMPLE_ORDERS = ORDERS.slice(0, EXCERPT_N);

const byId = new Map(ORDERS.map((o) => [o.id, o]));

function ordersByIds(ids: string[]): SampleOrder[] {
  return ids.map((id) => {
    const o = byId.get(id);
    if (!o) throw new Error(`sample-dataset missing order ${id}`);
    return o;
  });
}

export const HERO_SEED = ordersByIds(data.hero.seedIds);
/** Landings in time order (first → last). */
export const HERO_LANDINGS: SampleOrder[] = data.hero.landings.map((l) => {
  const o = byId.get(l.id);
  if (!o) throw new Error(`sample-dataset missing landing ${l.id}`);
  return { ...o, mrrDelta: l.mrrDelta, kind: l.kind };
});
export const HERO_FINAL = ordersByIds(data.hero.finalIds);

/** @deprecated Prefer HERO_FINAL; kept for any lingering imports. */
export const HERO_ORDERS = HERO_FINAL;

/** Sum of landing mrrDelta (only new-sub ticks move MRR). */
export const LANDING_MRR_DELTA = HERO_LANDINGS.reduce((s, o) => s + o.mrrDelta, 0);
/** @deprecated Prefer LANDING_MRR_DELTA; amount sum is not the MRR tick. */
export const LANDING_TOTAL = LANDING_MRR_DELTA;

export const SAMPLE_SUBS: SampleSub[] = data.subscriptions.slice(0, EXCERPT_N).map((s) => ({
  id: s.id,
  created: s.created,
  source: s.source,
  product: s.product,
  email: s.email,
  mrr: s.mrr,
  status: s.status as SampleSub["status"],
  cancelled: s.cancelled,
  interval: s.interval,
  country: s.country,
  price: s.price,
}));

export const ALL_SAMPLE_SUBS: SampleSub[] = data.subscriptions.map((s) => ({
  id: s.id,
  created: s.created,
  source: s.source,
  product: s.product,
  email: s.email,
  mrr: s.mrr,
  status: s.status as SampleSub["status"],
  cancelled: s.cancelled,
  interval: s.interval,
  country: s.country,
  price: s.price,
}));

/** Chart rows: polar / ls / gum / stripe + total. Month label is short (Nov, Dec, …). */
export const MRR_STACK = data.mrrByMonth.map((m) => ({
  month: m.month.split(" ")[0]!,
  polar: m.Polar,
  ls: m["Lemon Squeezy"],
  gum: m.Gumroad,
  stripe: m.Stripe,
  total: m.total,
}));

export const SAMPLE_MRR_OCT = data.headline.mrr;
export const SAMPLE_MRR_MOM = data.headline.mrrMoMPct;
export const HERO_START_MRR = data.hero.startMrr;
export const HERO_FINAL_MRR = data.hero.finalMrr;

const h = data.headline;
const bySource = data.bySource;

function fmtMoney(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export const DASHBOARD = {
  mrr: fmtMoney(h.mrr),
  mrrDelta: `▲ ${h.mrrMoMPct}% MoM`,
  netRevenue: fmtMoney(h.net30d),
  netDelta: `30D net · ${h.orders30d} orders across sources`,
  activeSubs: String(h.activeSubs),
  activeDelta: `${h.trialingSubs} trialing`,
  churn: `${h.churn30dPct}%`,
  churnDelta: "30D cancelled ÷ active at start",
  pastDueLine: `Past due ${h.pastDueCount} · $${h.pastDueMrr} · MRR counts active subscriptions only`,
  statusLine: "● SYNCED · LAST RUN 10:02 · NEXT 11:02 · EXAMPLE DATA",
  sources: [
    {
      name: "Polar",
      detail: `${bySource.Polar.orders30d} orders · 30D`,
      state: "Synced" as const,
    },
    {
      name: "Lemon Squeezy",
      detail: `${bySource["Lemon Squeezy"].orders30d} orders · 30D`,
      state: "Synced" as const,
    },
    {
      name: "Gumroad",
      detail: `${bySource.Gumroad.orders30d} orders · 30D`,
      state: "Synced" as const,
    },
    {
      name: "Stripe",
      detail: `${bySource.Stripe.orders30d} orders · 30D`,
      state: "Synced" as const,
    },
    { name: "CSV import", detail: "", state: "Not connected" as const },
  ],
  mrrStack: MRR_STACK,
  chartAriaLabel: (() => {
    const first = MRR_STACK[0]!;
    const last = MRR_STACK[MRR_STACK.length - 1]!;
    const from = `$${(first.total / 1000).toFixed(1)}k`;
    const to = fmtMoney(last.total);
    return `Stacked MRR by source from ${from} in ${first.month} to ${to} in ${last.month}. Polar, Lemon Squeezy, Stripe, Gumroad. Example data.`;
  })(),
} as const;

export const SAMPLE_ORDERS_CAPTION = `Excerpt: ${SAMPLE_ORDERS.length} of ${h.orders30d} orders (30D)`;
export const SAMPLE_SUBS_CAPTION = `Excerpt: ${SAMPLE_SUBS.length} example subscriptions`;

export const SAMPLE_CAPTION =
  "Example data. Fake stores and customers (alex@example.com), not real revenue.";

export const SAMPLE_AS_OF = data.asOf;
export const SAMPLE_HEADLINE = h;

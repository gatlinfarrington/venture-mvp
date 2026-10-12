import { HERO_ORDERS } from "@/lib/sample-data";

export const SOURCES = ["Lemon Squeezy", "Polar", "Gumroad", "Stripe"] as const;

export const BASE_MRR = 4180;
export const START_MRR = BASE_MRR;
export const MAX_DELTA = 0.06;
export const ROW_COUNT = 9;

/** Seed IDs sit well below landing IDs so React keys never collide mid-loop. */
export const SEED_ID_START = 10398;
/** Landing inserts use EX-10500… — never overlaps seed or final HERO_ORDERS. */
export const LANDING_ID_START = 10500;

export type HeroRow = {
  id: string;
  source: string;
  product: string;
  amount: number;
  fresh: boolean;
};

export type OrderSpec = {
  source: 0 | 1 | 2 | 3;
  product: string;
  amount: number;
};

/** 14 landings; amounts sum to 251 → final MRR $4,431 (+6.0%). */
export const LANDING_SPECS: OrderSpec[] = [
  { source: 0, product: "Demo SaaS · Pro", amount: 29 },
  { source: 1, product: "Example Course", amount: 19 },
  { source: 2, product: "Sample Icon Pack", amount: 12 },
  { source: 3, product: "Demo SaaS · Team", amount: 9 },
  { source: 1, product: "Template Kit", amount: 29 },
  { source: 2, product: "Demo SaaS · Pro", amount: 19 },
  { source: 0, product: "Sample Icon Pack", amount: 12 },
  { source: 3, product: "Example Course", amount: 9 },
  { source: 2, product: "Demo SaaS · Team", amount: 29 },
  { source: 0, product: "Template Kit", amount: 19 },
  { source: 1, product: "Sample Icon Pack", amount: 12 },
  { source: 3, product: "Demo SaaS · Pro", amount: 9 },
  { source: 0, product: "Example Course", amount: 29 },
  { source: 1, product: "Demo SaaS · Team", amount: 15 },
];

export const LANDING_TOTAL = LANDING_SPECS.reduce((s, o) => s + o.amount, 0);
export const FINAL_MRR = START_MRR + LANDING_TOTAL;

export const FINAL_ROWS: HeroRow[] = HERO_ORDERS.map((o) => ({
  id: o.id,
  source: o.source,
  product: o.product,
  amount: o.amount,
  fresh: false,
}));

const SEED_CONTENT: OrderSpec[] = [
  { source: 0, product: "Demo SaaS · Pro", amount: 29 },
  { source: 1, product: "Example Course", amount: 49 },
  { source: 2, product: "Sample Icon Pack", amount: 12 },
  { source: 3, product: "Demo SaaS · Team", amount: 19 },
  { source: 1, product: "Template Kit", amount: 9 },
  { source: 2, product: "Demo SaaS · Pro", amount: 29 },
  { source: 0, product: "Sample Icon Pack", amount: 12 },
  { source: 3, product: "Example Course", amount: 19 },
  { source: 2, product: "Demo SaaS · Team", amount: 9 },
];

export function rowFromSpec(spec: OrderSpec, id: string, fresh: boolean): HeroRow {
  return {
    id,
    source: SOURCES[spec.source]!,
    product: spec.product,
    amount: spec.amount,
    fresh,
  };
}

/** Initial 9 rows — IDs EX-10398…EX-10390, disjoint from landings and finals. */
export function buildSeedRows(): HeroRow[] {
  return SEED_CONTENT.map((spec, i) =>
    rowFromSpec(spec, `EX-${SEED_ID_START - i}`, false),
  );
}

/** Insert landing at top; drop the last row. Always unique IDs. */
export function applyLanding(rows: HeroRow[], landingIndex: number): HeroRow[] {
  const spec = LANDING_SPECS[landingIndex];
  if (!spec) return rows;
  const id = `EX-${LANDING_ID_START + landingIndex}`;
  return [rowFromSpec(spec, id, true), ...rows.map((r) => ({ ...r, fresh: false }))].slice(
    0,
    ROW_COUNT,
  );
}

/** Every table state across a full loop (seed + each landing + final settle). */
export function heroLoopFrames(): HeroRow[][] {
  const frames: HeroRow[][] = [buildSeedRows()];
  let cur = buildSeedRows();
  for (let i = 0; i < LANDING_SPECS.length; i++) {
    cur = applyLanding(cur, i);
    frames.push(cur);
  }
  frames.push(FINAL_ROWS);
  return frames;
}

export function assertUniqueIds(rows: HeroRow[]): string[] {
  const ids = rows.map((r) => r.id);
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) dupes.push(id);
    seen.add(id);
  }
  return dupes;
}

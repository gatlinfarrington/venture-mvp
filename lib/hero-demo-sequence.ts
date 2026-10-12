import {
  HERO_FINAL,
  HERO_LANDINGS,
  HERO_SEED,
  LANDING_TOTAL,
  type SampleOrder,
} from "@/lib/sample-data";

export const BASE_MRR = 4180;
export const START_MRR = BASE_MRR;
export const MAX_DELTA = 0.06;
export const ROW_COUNT = 9;
export const FINAL_MRR = START_MRR + LANDING_TOTAL;

export type HeroRow = {
  id: string;
  source: string;
  product: string;
  amount: number;
  fresh: boolean;
};

export function toHeroRow(o: SampleOrder, fresh = false): HeroRow {
  return {
    id: o.id,
    source: o.source,
    product: o.product,
    amount: o.amount,
    fresh,
  };
}

export function buildSeedRows(): HeroRow[] {
  return HERO_SEED.map((o) => toHeroRow(o));
}

export function buildFinalRows(): HeroRow[] {
  return HERO_FINAL.map((o) => toHeroRow(o));
}

/** Insert landing at top; keep up to 10 (9 visible + outgoing). */
export function applyLanding(rows: HeroRow[], landingIndex: number): HeroRow[] {
  const order = HERO_LANDINGS[landingIndex];
  if (!order) return rows;
  return [toHeroRow(order, true), ...rows.map((r) => ({ ...r, fresh: false }))].slice(0, 10);
}

export function trimOutgoing(rows: HeroRow[]): HeroRow[] {
  return rows.slice(0, ROW_COUNT);
}

export function heroLoopFrames(): HeroRow[][] {
  const frames: HeroRow[][] = [buildSeedRows()];
  let cur = buildSeedRows();
  for (let i = 0; i < HERO_LANDINGS.length; i++) {
    cur = trimOutgoing(applyLanding(cur, i));
    frames.push(cur);
  }
  frames.push(buildFinalRows());
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

export { HERO_LANDINGS, HERO_SEED, HERO_FINAL, LANDING_TOTAL };

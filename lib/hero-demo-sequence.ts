import {
  HERO_FINAL,
  HERO_FINAL_MRR,
  HERO_LANDINGS,
  HERO_SEED,
  HERO_START_MRR,
  LANDING_MRR_DELTA,
  SAMPLE_MRR_MOM,
  SAMPLE_MRR_OCT,
  type SampleOrder,
} from "@/lib/sample-data";

/** Final hero MRR matches /sample headline MRR. */
export const FINAL_MRR = HERO_FINAL_MRR;
export const START_MRR = HERO_START_MRR;
export const BASE_MRR = START_MRR;
/** Delta pill shows the 30-day MoM figure, not the loop's narrower climb. */
export const MAX_DELTA = SAMPLE_MRR_MOM / 100;
export const MOM_DELTA_LABEL = `+${SAMPLE_MRR_MOM.toFixed(1)}%`;
export const ROW_COUNT = 9;

export type HeroRow = {
  id: string;
  source: string;
  product: string;
  amount: number;
  mrrDelta: number;
  fresh: boolean;
};

export function toHeroRow(o: SampleOrder, fresh = false): HeroRow {
  return {
    id: o.id,
    source: o.source,
    product: o.product,
    amount: o.amount,
    mrrDelta: o.mrrDelta ?? 0,
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

/** Assert start + Σ mrrDelta = final = sample Oct headline. */
export function assertMrrContinuum(): boolean {
  const sum = HERO_LANDINGS.reduce((s, o) => s + o.mrrDelta, 0);
  return (
    Math.abs(START_MRR + sum - FINAL_MRR) < 0.01 &&
    Math.abs(FINAL_MRR - SAMPLE_MRR_OCT) < 0.01 &&
    Math.abs(sum - LANDING_MRR_DELTA) < 0.01
  );
}

export { HERO_LANDINGS, HERO_SEED, HERO_FINAL, LANDING_MRR_DELTA as LANDING_TOTAL };

import type { NormalizedSubscription } from "../importers/types";
import { computeMrr, type MrrOptions } from "./mrr";

export interface ArrResult {
  arr: number;
  mrr: number;
  activeCount: number;
}

/** ARR = MRR × 12 from eligible subscriptions. */
export function computeArr(
  subscriptions: NormalizedSubscription[],
  opts: MrrOptions = {},
): ArrResult {
  const mrr = computeMrr(subscriptions, opts);
  return {
    arr: Math.round(mrr.total * 12 * 100) / 100,
    mrr: mrr.total,
    activeCount: mrr.activeCount,
  };
}

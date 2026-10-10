import type { NormalizedSubscription } from "../importers/types";
import { computeArpu } from "./arpu";
import { computeChurn } from "./churn";
import type { MrrOptions } from "./mrr";

export interface LtvResult {
  /** Simple SaaS LTV ≈ ARPU / monthly logo churn. */
  ltv: number;
  arpu: number;
  monthlyChurnRate: number;
}

/**
 * LTV = ARPU / monthly_churn_rate.
 * When churn ≈ 0, returns ARPU × 36 as a conservative 3-year ceiling.
 */
export function computeLtv(
  subscriptions: NormalizedSubscription[],
  windowDays = 30,
  asOf: Date = new Date(),
  _opts: MrrOptions = {},
): LtvResult {
  const arpu = computeArpu(subscriptions);
  const churn = computeChurn(subscriptions, windowDays, asOf);
  const monthlyRate =
    windowDays === 30 ? churn.rate : churn.rate * (30 / Math.max(windowDays, 1));

  let ltv = 0;
  if (monthlyRate > 0.0001) {
    ltv = arpu.arpu / monthlyRate;
  } else if (arpu.arpu > 0) {
    ltv = arpu.arpu * 36;
  }

  return {
    ltv: Math.round(ltv * 100) / 100,
    arpu: arpu.arpu,
    monthlyChurnRate: Math.round(monthlyRate * 10000) / 10000,
  };
}

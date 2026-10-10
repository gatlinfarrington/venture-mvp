import type { NormalizedSubscription } from "../importers/types";

export interface CohortCell {
  age: number;
  retained: number;
  starting: number;
  rate: number;
}

export interface CohortRow {
  cohortMonth: string;
  starting: number;
  cells: CohortCell[];
}

/** Logo retention cohort grid by signup month. */
export function computeCohortRetention(
  subscriptions: NormalizedSubscription[],
  maxCohorts = 6,
  maxAge = 6,
  asOf: Date = new Date(),
): CohortRow[] {
  const cohorts = new Map<string, NormalizedSubscription[]>();
  for (const sub of subscriptions) {
    const created = Date.parse(sub.created);
    if (Number.isNaN(created)) continue;
    const d = new Date(created);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const list = cohorts.get(key) || [];
    list.push(sub);
    cohorts.set(key, list);
  }

  const sorted = [...cohorts.keys()].sort().reverse().slice(0, maxCohorts).reverse();
  const rows: CohortRow[] = [];

  for (const cohortMonth of sorted) {
    const members = cohorts.get(cohortMonth) || [];
    const starting = members.length;
    const [y, m] = cohortMonth.split("-").map(Number);
    const cells: CohortCell[] = [];
    for (let age = 0; age <= maxAge; age++) {
      const end = new Date(Date.UTC(y, m - 1 + age + 1, 0, 23, 59, 59, 999));
      if (end > asOf) break;
      let retained = 0;
      for (const sub of members) {
        const created = Date.parse(sub.created);
        if (Number.isNaN(created) || created > end.getTime()) continue;
        const cancelledAt = sub.cancelledAt ? Date.parse(sub.cancelledAt) : NaN;
        if (!Number.isNaN(cancelledAt) && cancelledAt <= end.getTime()) continue;
        retained += 1;
      }
      cells.push({
        age,
        retained,
        starting,
        rate: starting > 0 ? Math.round((retained / starting) * 1000) / 1000 : 0,
      });
    }
    rows.push({ cohortMonth, starting, cells });
  }
  return rows;
}

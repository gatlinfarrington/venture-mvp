export interface GoalProgress {
  goal: number;
  current: number;
  pct: number;
  remaining: number;
  met: boolean;
}

export function computeGoalProgress(current: number, goal: number): GoalProgress {
  const g = Math.max(0, Number(goal) || 0);
  const c = Math.max(0, Number(current) || 0);
  if (g <= 0) {
    return { goal: 0, current: c, pct: 0, remaining: 0, met: false };
  }
  const pct = Math.round((c / g) * 1000) / 1000;
  return {
    goal: g,
    current: c,
    pct,
    remaining: Math.max(0, Math.round((g - c) * 100) / 100),
    met: c >= g,
  };
}

/** How many of `slots` cells should be filled for a cell-based progress bar. */
export function progressBarSlots(pct: number, slots = 20): number {
  if (pct <= 0) return 0;
  if (pct >= 1) return slots;
  return Math.max(1, Math.round(pct * slots));
}

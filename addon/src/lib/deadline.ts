/**
 * Soft time budget for one Apps Script execution. Paginators check it between pages
 * and stop early (persisting a cursor) so card actions stay under ~30s and trigger
 * slices under the 6-minute limit. No deadline set = unlimited (tests, menu backfill).
 */
let deadlineAt = 0;

export function setDeadline(msFromNow: number): void {
  deadlineAt = Date.now() + msFromNow;
}

export function clearDeadline(): void {
  deadlineAt = 0;
}

export function deadlinePassed(): boolean {
  return deadlineAt > 0 && Date.now() >= deadlineAt;
}

import type { SyncCursor } from "../importers/types";

/** True when a prior run stopped mid-pagination and must resume. */
export function isBackfillIncomplete(cursor: SyncCursor | null | undefined): boolean {
  if (!cursor) return false;
  if (cursor.backfillComplete === true) return false;
  if (cursor.resource === "done") return false;
  return Boolean(cursor.pageToken) || Boolean(cursor.resource);
}

/**
 * Choose the cursor for this run.
 * Incomplete backfills always resume (even on incremental sync) so the schedule finishes them.
 * Explicit full + complete/empty starts a fresh backfill from page 1.
 */
export function resolveFetchCursor(
  stored: SyncCursor,
  full: boolean,
): { cursor: SyncCursor; mode: "backfill" | "incremental" } {
  if (isBackfillIncomplete(stored)) {
    return {
      cursor: {
        pageToken: stored.pageToken,
        resource: stored.resource,
        backfillComplete: false,
        // Do not pass lastSyncedAt during resume — backfill must walk all pages.
      },
      mode: "backfill",
    };
  }
  if (full) {
    return { cursor: { backfillComplete: false }, mode: "backfill" };
  }
  return {
    cursor: stored.lastSyncedAt ? { lastSyncedAt: stored.lastSyncedAt, backfillComplete: true } : { backfillComplete: true },
    mode: "incremental",
  };
}

export function completedCursor(nowIso: string): SyncCursor {
  return {
    lastSyncedAt: nowIso,
    pageToken: undefined,
    resource: "done",
    backfillComplete: true,
  };
}

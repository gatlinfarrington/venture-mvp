import { deadlinePassed } from "../lib/deadline";
import { CONFIG } from "../lib/config";
import { completedCursor } from "../lib/backfill";
import type { ImportBundle, ImportResult, SyncCursor, SyncResource } from "./types";

export interface PageFetchResult<T> {
  items: T[];
  /** Opaque next-page token (URL or key). Undefined when finished. */
  nextToken?: string;
  incomplete: boolean;
}

/**
 * Walk `fetchPage` until maxPages, starting from cursor.pageToken when set.
 * Pure control-flow helper — unit-tested without live HTTP.
 */
export function paginateWithBudget<T>(
  fetchPage: (pageToken: string | undefined) => { items: T[]; nextToken?: string },
  startToken: string | undefined,
  maxPages: number,
): PageFetchResult<T> {
  const items: T[] = [];
  let token = startToken;
  let pages = 0;
  while (pages < maxPages && (pages === 0 || !deadlinePassed())) {
    pages += 1;
    const page = fetchPage(token);
    for (const item of page.items) items.push(item);
    if (!page.nextToken || !page.items.length) {
      return { items, nextToken: undefined, incomplete: false };
    }
    token = page.nextToken;
  }
  return { items, nextToken: token, incomplete: Boolean(token) };
}

const BACKFILL_ORDER: SyncResource[] = ["orders", "subscriptions", "customers", "refunds"];

export function nextResource(current: SyncResource | undefined): SyncResource | "done" {
  if (!current) return BACKFILL_ORDER[0];
  const idx = BACKFILL_ORDER.indexOf(current);
  if (idx < 0 || idx >= BACKFILL_ORDER.length - 1) return "done";
  return BACKFILL_ORDER[idx + 1];
}

export function buildChunkedResult(
  resource: SyncResource,
  partial: ImportBundle,
  page: PageFetchResult<unknown>,
): ImportResult {
  if (page.incomplete) {
    return {
      bundle: partial,
      cursor: {
        pageToken: page.nextToken,
        resource,
        backfillComplete: false,
      },
      incomplete: true,
    };
  }
  const following = nextResource(resource);
  if (following === "done") {
    return {
      bundle: partial,
      cursor: completedCursor(new Date().toISOString()),
      incomplete: false,
    };
  }
  // Resource finished early in this run — signal caller to continue next resource
  // by leaving incomplete with empty pageToken on the next resource.
  return {
    bundle: partial,
    cursor: {
      pageToken: undefined,
      resource: following,
      backfillComplete: false,
    },
    incomplete: true,
  };
}

export function emptyBundle(): ImportBundle {
  return { orders: [], subscriptions: [], customers: [], refunds: [] };
}

export function defaultMaxPages(): number {
  return CONFIG.MAX_PAGES_PER_RUN;
}

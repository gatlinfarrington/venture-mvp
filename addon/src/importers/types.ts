import type { SourceId } from "../lib/config";

export interface NormalizedOrder {
  id: string;
  source: SourceId;
  created: string;
  product: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: string;
  rawId: string;
  /** ISO 3166-1 alpha-2 when known */
  country?: string;
}

export interface NormalizedSubscription {
  id: string;
  source: SourceId;
  created: string;
  product: string;
  customerEmail: string;
  /** Always monthly-normalized recurring revenue. */
  mrr: number;
  currency: string;
  status: string;
  cancelledAt: string | null;
  interval:
    | "month"
    | "year"
    | "week"
    | "day"
    | "quarter"
    | "biannual"
    | "biennial"
    | "unknown";
  rawId: string;
  country?: string;
}

export interface NormalizedCustomer {
  id: string;
  source: SourceId;
  email: string;
  name: string;
  created: string;
  rawId: string;
  country?: string;
}

export interface NormalizedRefund {
  id: string;
  source: SourceId;
  created: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  rawId: string;
  country?: string;
}

export interface CsvColumnMap {
  id?: string;
  created?: string;
  product?: string;
  email?: string;
  amount?: string;
  currency?: string;
  status?: string;
  country?: string;
  source?: string;
  kind?: string;
  mrr?: string;
}

export interface ImportBundle {
  orders: NormalizedOrder[];
  subscriptions: NormalizedSubscription[];
  customers: NormalizedCustomer[];
  refunds: NormalizedRefund[];
}

export type SyncResource =
  | "orders"
  | "subscriptions"
  | "customers"
  | "refunds"
  | "sales"
  /** Terminal marker stored on completed cursors. */
  | "done";

/**
 * Persisted checkpoint for incremental sync AND chunked backfills.
 * `pageToken` lets a run that hits Apps Script time/page budget resume mid-pagination.
 */
export interface SyncCursor {
  /** ISO timestamp of last fully completed sync (incremental watermark). */
  lastSyncedAt?: string;
  /** Opaque pagination cursor (Gumroad page_key, Stripe starting_after, next URL, etc.). */
  pageToken?: string;
  /** Resource currently being paginated during a chunked backfill. */
  resource?: SyncResource;
  /** True when the current backfill finished all pages for all resources. */
  backfillComplete?: boolean;
}

export interface ImportResult {
  bundle: ImportBundle;
  cursor: SyncCursor;
  /** True when more pages remain — caller should persist cursor and continue next run. */
  incomplete: boolean;
  /** Absolute total when the API reports one (powers "~N" in the syncing status band). */
  totalCount?: number;
}

export interface Importer {
  id: SourceId;
  label: string;
  fetchAll(apiKey: string, cursor?: SyncCursor): Promise<ImportBundle>;
}

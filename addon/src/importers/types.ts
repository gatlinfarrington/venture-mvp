import type { SourceId } from "../lib/config";

export interface NormalizedOrder {
  id: string;
  source: SourceId;
  created: string; // ISO date or yyyy-mm-dd
  product: string;
  customerEmail: string;
  amount: number; // major units
  currency: string;
  status: string;
  rawId: string;
}

export interface NormalizedSubscription {
  id: string;
  source: SourceId;
  created: string;
  product: string;
  customerEmail: string;
  mrr: number; // monthly recurring in major units
  currency: string;
  status: string; // active | cancelled | past_due | paused | trial | expired
  cancelledAt: string | null;
  interval: "month" | "year" | "week" | "day" | "unknown";
  rawId: string;
}

export interface NormalizedCustomer {
  id: string;
  source: SourceId;
  email: string;
  name: string;
  created: string;
  rawId: string;
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
}

export interface ImportBundle {
  orders: NormalizedOrder[];
  subscriptions: NormalizedSubscription[];
  customers: NormalizedCustomer[];
  refunds: NormalizedRefund[];
}

export interface SyncCursor {
  /** ISO timestamp of last successful incremental sync */
  lastSyncedAt?: string;
  /** Opaque cursor / page token if the API needs it */
  pageToken?: string;
}

export interface Importer {
  id: SourceId;
  label: string;
  fetchAll(apiKey: string, cursor?: SyncCursor): Promise<ImportBundle>;
}

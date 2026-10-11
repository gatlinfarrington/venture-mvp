import type { SourceId } from "./config";
import { SOURCES } from "./config";
import type { ImportBundle } from "../importers/types";
import { withPricingCta } from "./upgrade";

/** One API key + label for a merchant store under a source. */
export interface StoreCredential {
  /** Stable id (e.g. "default", "us", "eu-2"). */
  id: string;
  /** User-facing label shown in sheets / status. */
  label: string;
  apiKey: string;
}

export type StoresBySource = Partial<Record<SourceId, StoreCredential[]>>;

export const DEFAULT_STORE_ID = "default";
export const DEFAULT_STORE_LABEL = "Default";

/** Flatten all stores that have a non-empty API key. */
export function listConnectedStores(stores: StoresBySource): Array<{
  source: SourceId;
  store: StoreCredential;
}> {
  const out: Array<{ source: SourceId; store: StoreCredential }> = [];
  for (const meta of SOURCES) {
    for (const store of stores[meta.id] || []) {
      if (store.apiKey && store.apiKey.trim()) {
        out.push({ source: meta.id, store });
      }
    }
  }
  return out;
}

export function countConnectedStores(stores: StoresBySource): number {
  return listConnectedStores(stores).length;
}

/**
 * Migrate legacy single-key props into the stores map.
 * Existing stores for a source win; legacy key fills a Default store when absent.
 */
export function migrateLegacyKeys(
  legacyKeys: Partial<Record<SourceId, string>>,
  existing: StoresBySource = {},
): StoresBySource {
  const out: StoresBySource = {};
  for (const meta of SOURCES) {
    const current = (existing[meta.id] || [])
      .map(normalizeStore)
      .filter((s) => s.id);
    if (current.length) {
      out[meta.id] = current;
      continue;
    }
    const legacy = (legacyKeys[meta.id] || "").trim();
    if (legacy) {
      out[meta.id] = [
        {
          id: DEFAULT_STORE_ID,
          label: DEFAULT_STORE_LABEL,
          apiKey: legacy,
        },
      ];
    }
  }
  return out;
}

function normalizeStore(raw: Partial<StoreCredential> | null | undefined): StoreCredential {
  const id = String(raw?.id || DEFAULT_STORE_ID)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 64) || DEFAULT_STORE_ID;
  const label = String(raw?.label || (id === DEFAULT_STORE_ID ? DEFAULT_STORE_LABEL : id)).trim() || id;
  const apiKey = String(raw?.apiKey || "").trim();
  return { id, label, apiKey };
}

/**
 * Enforce total store slots (across all sources) from license `maxStores`.
 * Keeps earlier stores in source order (SOURCES order, then list order).
 */
export function enforceStoreLimit(
  stores: StoresBySource,
  maxStores: number,
): {
  allowed: Array<{ source: SourceId; store: StoreCredential }>;
  blocked: Array<{ source: SourceId; store: StoreCredential }>;
  message?: string;
} {
  const max = Math.max(1, Number(maxStores) || 1);
  const all = listConnectedStores(stores);
  if (all.length <= max) {
    return { allowed: all, blocked: [] };
  }
  const allowed = all.slice(0, max);
  const blocked = all.slice(max);
  const blockedLabels = blocked
    .map((b) => `${labelForSource(b.source)} · ${b.store.label}`)
    .join(", ");
  const reason =
    max <= 1
      ? `Multiple stores need Business. Not syncing: ${blockedLabels}`
      : `Your plan allows ${max} store(s). Not syncing: ${blockedLabels}`;
  return {
    allowed,
    blocked,
    message: withPricingCta(reason),
  };
}

function labelForSource(id: SourceId): string {
  return SOURCES.find((s) => s.id === id)?.label || id;
}

/**
 * Keep row ids stable for the Default store (legacy sheets).
 * Extra stores get a `__{storeId}` suffix so Order ID merge keys stay unique.
 */
export function storeScopedRowId(id: string, storeId: string): string {
  if (!storeId || storeId === DEFAULT_STORE_ID) return id;
  if (id.endsWith(`__${storeId}`)) return id;
  return `${id}__${storeId}`;
}

/** Tag every row in a bundle with store id/label and scoped ids. */
export function tagBundleWithStore(
  bundle: ImportBundle,
  store: Pick<StoreCredential, "id" | "label">,
): ImportBundle {
  const sid = store.id || DEFAULT_STORE_ID;
  const label = store.label || DEFAULT_STORE_LABEL;
  return {
    orders: bundle.orders.map((o) => ({
      ...o,
      id: storeScopedRowId(o.id, sid),
      storeId: sid,
      storeLabel: label,
    })),
    subscriptions: bundle.subscriptions.map((s) => ({
      ...s,
      id: storeScopedRowId(s.id, sid),
      storeId: sid,
      storeLabel: label,
    })),
    customers: bundle.customers.map((c) => ({
      ...c,
      id: storeScopedRowId(c.id, sid),
      storeId: sid,
      storeLabel: label,
    })),
    refunds: bundle.refunds.map((r) => ({
      ...r,
      id: storeScopedRowId(r.id, sid),
      orderId: storeScopedRowId(r.orderId, sid),
      storeId: sid,
      storeLabel: label,
    })),
  };
}

/**
 * Apply a replace-style store update for one source.
 * - Empty apiKey with mask/blank keeps the previous key when id matches.
 * - `clear: true` or apiKey "-" removes the store.
 */
export function upsertStoresForSource(
  current: StoreCredential[],
  updates: Array<Partial<StoreCredential> & { clear?: boolean }>,
): StoreCredential[] {
  if (!updates.length) return current.map(normalizeStore);

  const byId = new Map<string, StoreCredential>();
  for (const s of current) byId.set(s.id, normalizeStore(s));

  const order: string[] = [];
  for (const raw of updates) {
    const next = normalizeStore(raw);
    if (raw.clear || raw.apiKey === "-" || String(raw.apiKey || "").toLowerCase() === "clear") {
      byId.delete(next.id);
      continue;
    }
    const prev = byId.get(next.id);
    const key =
      !next.apiKey || next.apiKey.indexOf("••") === 0 ? prev?.apiKey || "" : next.apiKey;
    if (!key) {
      // Label-only update with no prior key → drop
      if (!prev?.apiKey) {
        byId.delete(next.id);
        continue;
      }
    }
    byId.set(next.id, {
      id: next.id,
      label: next.label,
      apiKey: key || prev?.apiKey || "",
    });
    if (!order.includes(next.id)) order.push(next.id);
  }

  // Preserve prior order for ids not in this update batch
  const finalOrder = [
    ...order,
    ...current.map((s) => s.id).filter((id) => byId.has(id) && !order.includes(id)),
  ];
  return finalOrder.map((id) => byId.get(id)!).filter(Boolean);
}

/** Sidebar-safe view (never returns raw API keys). */
export function storesForSidebar(stores: StoresBySource): Partial<
  Record<SourceId, Array<{ id: string; label: string; hasKey: boolean }>>
> {
  const out: Partial<Record<SourceId, Array<{ id: string; label: string; hasKey: boolean }>>> = {};
  for (const meta of SOURCES) {
    const list = stores[meta.id] || [];
    if (!list.length) continue;
    out[meta.id] = list.map((s) => ({
      id: s.id,
      label: s.label,
      hasKey: Boolean(s.apiKey),
    }));
  }
  return out;
}

export function parseStoresJson(raw: string | null | undefined): StoresBySource {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as StoresBySource;
    const out: StoresBySource = {};
    for (const meta of SOURCES) {
      const list = data[meta.id];
      if (!Array.isArray(list)) continue;
      out[meta.id] = list.map(normalizeStore).filter((s) => s.apiKey);
    }
    return out;
  } catch {
    return {};
  }
}

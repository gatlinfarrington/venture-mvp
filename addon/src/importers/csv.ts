import type {
  CsvColumnMap,
  ImportBundle,
  NormalizedCustomer,
  NormalizedOrder,
  NormalizedRefund,
  NormalizedSubscription,
} from "./types";

/** Minimal RFC4180-ish CSV parse (quoted fields, commas, newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, "");

  while (i < s.length) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function colIndex(headers: string[], name?: string): number {
  if (!name) return -1;
  const want = name.trim().toLowerCase();
  return headers.findIndex((h) => h.trim().toLowerCase() === want);
}

function cell(row: string[], idx: number): string {
  return idx >= 0 ? String(row[idx] ?? "").trim() : "";
}

function toAmount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Map CSV rows into an ImportBundle using a column map.
 * `kind` column (order|subscription|refund|customer) defaults to order.
 */
export function mapCsvToBundle(text: string, map: CsvColumnMap): ImportBundle {
  const table = parseCsv(text);
  if (table.length < 2) {
    return { orders: [], subscriptions: [], customers: [], refunds: [] };
  }
  const headers = table[0];
  const idx = {
    id: colIndex(headers, map.id),
    created: colIndex(headers, map.created),
    product: colIndex(headers, map.product),
    email: colIndex(headers, map.email),
    amount: colIndex(headers, map.amount),
    currency: colIndex(headers, map.currency),
    status: colIndex(headers, map.status),
    country: colIndex(headers, map.country),
    source: colIndex(headers, map.source),
    kind: colIndex(headers, map.kind),
    mrr: colIndex(headers, map.mrr),
  };

  const orders: NormalizedOrder[] = [];
  const subscriptions: NormalizedSubscription[] = [];
  const customers: NormalizedCustomer[] = [];
  const refunds: NormalizedRefund[] = [];

  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    const kind = (cell(row, idx.kind) || "order").toLowerCase();
    const id = cell(row, idx.id) || `csv_${r}`;
    const created = cell(row, idx.created);
    const product = cell(row, idx.product) || "CSV import";
    const email = cell(row, idx.email);
    const amount = toAmount(cell(row, idx.amount));
    const currency = (cell(row, idx.currency) || "USD").toUpperCase();
    const status = (cell(row, idx.status) || "paid").toLowerCase();
    const country = cell(row, idx.country).toUpperCase() || undefined;
    const mrr = toAmount(cell(row, idx.mrr)) || amount;

    if (kind === "subscription" || kind === "sub") {
      subscriptions.push({
        id: `csv_sub_${id}`,
        source: "csv",
        created,
        product,
        customerEmail: email,
        mrr,
        currency,
        status: status || "active",
        cancelledAt: status === "cancelled" || status === "canceled" ? created : null,
        interval: "month",
        rawId: id,
        country,
      });
    } else if (kind === "refund") {
      refunds.push({
        id: `csv_refund_${id}`,
        source: "csv",
        created,
        orderId: id,
        amount,
        currency,
        status: status || "refunded",
        rawId: id,
        country,
      });
    } else if (kind === "customer") {
      customers.push({
        id: `csv_cust_${id}`,
        source: "csv",
        email,
        name: product,
        created,
        rawId: id,
        country,
      });
    } else {
      orders.push({
        id: `csv_order_${id}`,
        source: "csv",
        created,
        product,
        customerEmail: email,
        amount,
        currency,
        status,
        rawId: id,
        country,
      });
      if (email) {
        customers.push({
          id: `csv_cust_${email}`,
          source: "csv",
          email,
          name: "",
          created,
          rawId: email,
          country,
        });
      }
    }
  }

  const byEmail = new Map<string, NormalizedCustomer>();
  for (const c of customers) {
    if (c.email) byEmail.set(c.email, c);
  }

  return {
    orders,
    subscriptions,
    customers: [...byEmail.values()],
    refunds,
  };
}

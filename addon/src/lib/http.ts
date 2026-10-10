import { CONFIG } from "./config";

export interface FetchJsonOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  sleep?: (ms: number) => void;
  /** Injected fetch for Node tests (async path). */
  fetchImpl?: typeof fetch;
}

function defaultSleep(ms: number): void {
  if (typeof Utilities !== "undefined" && Utilities.sleep) {
    Utilities.sleep(ms);
    return;
  }
  const end = Date.now() + Math.min(ms, 50);
  while (Date.now() < end) {
    /* spin briefly in tests */
  }
}

function headerMap(all: Record<string, string | string[]>): Record<string, string> {
  const headerObj: Record<string, string> = {};
  for (const [k, v] of Object.entries(all)) {
    headerObj[k.toLowerCase()] = Array.isArray(v) ? v.join(",") : String(v);
  }
  return headerObj;
}

/**
 * Synchronous JSON fetch for Apps Script (UrlFetchApp).
 * Retries on 429 / 5xx with exponential backoff.
 */
export function fetchJsonSync<T = unknown>(
  url: string,
  options: FetchJsonOptions = {},
): { status: number; data: T; headers: Record<string, string> } {
  if (typeof UrlFetchApp === "undefined") {
    throw new Error("fetchJsonSync requires UrlFetchApp (Apps Script runtime)");
  }
  const sleep = options.sleep ?? defaultSleep;
  const method = options.method ?? "get";
  const headers = options.headers ?? {};
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= CONFIG.RATE_LIMIT_RETRIES; attempt++) {
    try {
      const res = UrlFetchApp.fetch(url, {
        method: method as GoogleAppsScript.URL_Fetch.HttpMethod,
        headers,
        payload: options.body,
        muteHttpExceptions: true,
        followRedirects: true,
      });
      const status = res.getResponseCode();
      const headerObj = headerMap(res.getAllHeaders() as Record<string, string | string[]>);
      if (status === 429 || status >= 500) {
        const retryAfter = Number(headerObj["retry-after"] || 0);
        const wait =
          retryAfter > 0 ? retryAfter * 1000 : CONFIG.RATE_LIMIT_BASE_MS * Math.pow(2, attempt);
        sleep(wait);
        continue;
      }
      const text = res.getContentText() || "{}";
      return { status, data: JSON.parse(text) as T, headers: headerObj };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      sleep(CONFIG.RATE_LIMIT_BASE_MS * Math.pow(2, attempt));
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

/** Async JSON fetch for Node unit tests (injected fetchImpl). */
export async function fetchJson<T = unknown>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<{ status: number; data: T; headers: Record<string, string> }> {
  if (!options.fetchImpl && typeof UrlFetchApp !== "undefined") {
    return fetchJsonSync<T>(url, options);
  }
  const sleep = options.sleep ?? defaultSleep;
  const method = (options.method ?? "get").toUpperCase();
  const headers = options.headers ?? {};
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) throw new Error("No fetch implementation available");

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= CONFIG.RATE_LIMIT_RETRIES; attempt++) {
    try {
      const res = await fetchImpl(url, { method, headers, body: options.body });
      const headerObj: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headerObj[k.toLowerCase()] = v;
      });
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(headerObj["retry-after"] || 0);
        const wait =
          retryAfter > 0 ? retryAfter * 1000 : CONFIG.RATE_LIMIT_BASE_MS * Math.pow(2, attempt);
        sleep(wait);
        continue;
      }
      const data = (await res.json()) as T;
      return { status: res.status, data, headers: headerObj };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      sleep(CONFIG.RATE_LIMIT_BASE_MS * Math.pow(2, attempt));
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

export function centsToMajor(cents: number | string | null | undefined): number {
  if (cents == null || cents === "") return 0;
  const n = typeof cents === "string" ? Number(cents) : cents;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n) / 100;
}

export function toIsoDate(value: string | number | Date | null | undefined): string {
  if (value == null || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function toIsoTimestamp(value: string | number | Date | null | undefined): string {
  if (value == null || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

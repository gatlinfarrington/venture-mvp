import { CONFIG, getLicenseApiBase } from "./config";
import { fetchJson, fetchJsonSync } from "./http";
import { getConnectedSources, getLicenseKey } from "./properties";

/** Matches the Next.js site's Tier union. */
export type LicenseTier = "free" | "pro" | "business" | "unknown";

export interface LicenseStatus {
  tier: LicenseTier;
  ok: boolean;
  degraded: boolean;
  message: string;
  maxSources: number;
  /** Total store credentials across sources (Business 20; Pro/Free 1). */
  maxStores: number;
  allowSchedule: boolean;
}

const CACHE_TTL_SECONDS = 300;

function freeStatus(message: string): LicenseStatus {
  return {
    tier: "free",
    ok: true,
    degraded: false,
    message,
    maxSources: CONFIG.FREE_MAX_SOURCES,
    maxStores: 1,
    allowSchedule: false,
  };
}

function degrade(message: string): LicenseStatus {
  return {
    tier: "unknown",
    ok: true,
    degraded: true,
    message,
    maxSources: CONFIG.FREE_MAX_SOURCES,
    maxStores: 1,
    allowSchedule: false,
  };
}

function getLicenseApiSecret(): string {
  try {
    return PropertiesService.getScriptProperties().getProperty("LICENSE_API_SECRET") || "";
  } catch {
    return "";
  }
}

function fromPayload(data: {
  tier?: string | null;
  ok?: boolean;
  valid?: boolean;
  message?: string;
  error?: string;
  status?: string;
  limits?: { maxSources?: number; maxStores?: number; scheduledRefresh?: boolean };
}): LicenseStatus {
  const valid = data.valid === true || data.ok === true;
  if (!valid) {
    return freeStatus(data.error || data.message || "Invalid license · free tier limits apply.");
  }

  const tier = (data.tier || "free") as LicenseTier;
  const maxSources =
    data.limits?.maxSources ??
    (tier === "pro" || tier === "business" ? 4 : CONFIG.FREE_MAX_SOURCES);
  const maxStores =
    data.limits?.maxStores ?? (tier === "business" ? 20 : 1);
  const allowSchedule =
    data.limits?.scheduledRefresh ?? (tier === "pro" || tier === "business");

  return {
    tier: tier === "pro" || tier === "business" || tier === "free" ? tier : "unknown",
    ok: true,
    degraded: false,
    message: data.message || (allowSchedule ? "License active." : "Free tier."),
    maxSources,
    maxStores,
    allowSchedule,
  };
}

function readCache(): LicenseStatus | null {
  if (typeof CacheService === "undefined") return null;
  const cached = CacheService.getUserCache().get("rs_license");
  if (!cached) return null;
  try {
    return JSON.parse(cached) as LicenseStatus;
  } catch {
    return null;
  }
}

function writeCache(result: LicenseStatus): void {
  if (typeof CacheService === "undefined") return;
  CacheService.getUserCache().put("rs_license", JSON.stringify(result), CACHE_TTL_SECONDS);
}

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const secret = getLicenseApiSecret();
  if (secret) headers["x-license-secret"] = secret;
  return headers;
}

/** Sync license check for Apps Script. Degrades to free limits if unreachable. */
export function checkLicenseSync(opts: { skipCache?: boolean } = {}): LicenseStatus {
  const key = getLicenseKey();
  if (!key) return freeStatus("No license key · free tier limits apply.");
  if (!opts.skipCache) {
    const cached = readCache();
    if (cached) return cached;
  }

  const url = `${getLicenseApiBase()}${CONFIG.LICENSE_PATH}`;
  try {
    const { status, data } = fetchJsonSync<{
      tier?: string | null;
      ok?: boolean;
      valid?: boolean;
      message?: string;
      error?: string;
      limits?: { maxSources?: number; maxStores?: number; scheduledRefresh?: boolean };
    }>(url, {
      method: "post",
      headers: requestHeaders(),
      body: JSON.stringify({ key }),
      sleep: () => undefined,
    });
    if (status === 401) return degrade("License API unauthorized · check LICENSE_API_SECRET.");
    if (status >= 400) return degrade(`License API returned ${status}`);
    const result = fromPayload(data);
    writeCache(result);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return degrade(`License API unreachable (${msg}). Continuing with free-tier limits.`);
  }
}

export async function checkLicense(
  opts: { fetchImpl?: typeof fetch; skipCache?: boolean } = {},
): Promise<LicenseStatus> {
  if (!opts.fetchImpl) return checkLicenseSync({ skipCache: opts.skipCache });

  const key = getLicenseKey();
  if (!key) return freeStatus("No license key · free tier limits apply.");

  const url = `${getLicenseApiBase()}${CONFIG.LICENSE_PATH}`;
  try {
    const { status, data } = await fetchJson<{
      tier?: string | null;
      ok?: boolean;
      valid?: boolean;
      message?: string;
      error?: string;
      limits?: { maxSources?: number; maxStores?: number; scheduledRefresh?: boolean };
    }>(url, {
      method: "post",
      headers: requestHeaders(),
      body: JSON.stringify({ key }),
      fetchImpl: opts.fetchImpl,
      sleep: () => undefined,
    });
    if (status >= 400) return degrade(`License API returned ${status}`);
    return fromPayload(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return degrade(`License API unreachable (${msg}). Continuing with free-tier limits.`);
  }
}

export function enforceSourceLimit(
  license: LicenseStatus,
  requestedSources?: string[],
): { allowed: string[]; blocked: string[]; message?: string } {
  const connected = requestedSources ?? getConnectedSources();
  if (connected.length <= license.maxSources) {
    return { allowed: connected, blocked: [] };
  }
  const allowed = connected.slice(0, license.maxSources);
  const blocked = connected.slice(license.maxSources);
  return {
    allowed,
    blocked,
    message: `Free tier allows ${license.maxSources} source(s). Upgrade to sync: ${blocked.join(", ")}.`,
  };
}

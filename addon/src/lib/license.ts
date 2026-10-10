import { CONFIG, getLicenseApiBase } from "./config";
import { fetchJson, fetchJsonSync } from "./http";
import { getConnectedSources, getLicenseKey } from "./properties";

export type LicenseTier = "free" | "pro" | "multi" | "starter" | "growth" | "unknown";

export interface LicenseStatus {
  tier: LicenseTier;
  ok: boolean;
  degraded: boolean;
  message: string;
  maxSources: number;
  allowSchedule: boolean;
}

const CACHE_TTL_SECONDS = 300;

function isPaid(tier: string): boolean {
  return (CONFIG.PAID_TIERS as readonly string[]).includes(tier);
}

function freeStatus(message: string): LicenseStatus {
  return {
    tier: "free",
    ok: true,
    degraded: false,
    message,
    maxSources: CONFIG.FREE_MAX_SOURCES,
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
    allowSchedule: false,
  };
}

function fromPayload(data: {
  tier?: string;
  ok?: boolean;
  message?: string;
  valid?: boolean;
}): LicenseStatus {
  const tier = (data.tier || (data.valid || data.ok ? "pro" : "free")) as LicenseTier;
  return {
    tier,
    ok: data.ok !== false && data.valid !== false,
    degraded: false,
    message: data.message || (isPaid(tier) ? "License active." : "Free tier."),
    maxSources: tier === "multi" ? 99 : isPaid(tier) ? 3 : CONFIG.FREE_MAX_SOURCES,
    allowSchedule: isPaid(tier),
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

/** Sync license check for Apps Script. Degrades to free limits if unreachable. */
export function checkLicenseSync(opts: { skipCache?: boolean } = {}): LicenseStatus {
  const key = getLicenseKey();
  if (!key) return freeStatus("No license key — free tier limits apply.");
  if (!opts.skipCache) {
    const cached = readCache();
    if (cached) return cached;
  }

  const url = `${getLicenseApiBase()}${CONFIG.LICENSE_PATH}`;
  try {
    const { status, data } = fetchJsonSync<{
      tier?: string;
      ok?: boolean;
      message?: string;
      valid?: boolean;
    }>(url, {
      method: "post",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ key }),
      sleep: () => undefined,
    });
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
  if (!key) return freeStatus("No license key — free tier limits apply.");

  const url = `${getLicenseApiBase()}${CONFIG.LICENSE_PATH}`;
  try {
    const { status, data } = await fetchJson<{
      tier?: string;
      ok?: boolean;
      message?: string;
      valid?: boolean;
    }>(url, {
      method: "post",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
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

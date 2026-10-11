import { createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { BillingInterval, Tier } from "@/lib/site";
import {
  assertDurableStore,
  getRedis,
  redisConfigured,
} from "@/lib/redis-env";

export type LicenseRecord = {
  key: string;
  tier: Tier;
  email: string;
  interval: BillingInterval | "none";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
  status: "active" | "canceled" | "past_due";
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "licenses.json");

async function readFileStore(): Promise<Record<string, LicenseRecord>> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as Record<string, LicenseRecord>;
  } catch {
    return {};
  }
}

async function writeFileStore(store: Record<string, LicenseRecord>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export function generateLicenseKey(tier: Tier): string {
  const suffix = randomBytes(12).toString("hex");
  return `rs_${tier}_${suffix}`;
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function saveLicense(
  record: LicenseRecord,
): Promise<LicenseRecord> {
  assertDurableStore("licenses");
  const redis = getRedis();
  const now = new Date().toISOString();
  const next = { ...record, updatedAt: now };

  if (redis) {
    await redis.hset("licenses", { [record.key]: JSON.stringify(next) });
    if (record.stripeSubscriptionId) {
      await redis.set(`license:sub:${record.stripeSubscriptionId}`, record.key);
    }
    if (record.stripeCheckoutSessionId) {
      await redis.set(`license:session:${record.stripeCheckoutSessionId}`, record.key);
    }
    return next;
  }

  const store = await readFileStore();
  store[record.key] = next;
  await writeFileStore(store);
  return next;
}

/**
 * Persist a new license for a checkout session at most once.
 * Uses SET NX on the session→key index so webhook retries / success-page
 * recovery cannot mint a second key for the same session.
 */
export async function saveLicenseForCheckoutSession(
  record: LicenseRecord,
  checkoutSessionId: string,
): Promise<LicenseRecord> {
  assertDurableStore("licenses");
  const redis = getRedis();
  const withSession: LicenseRecord = {
    ...record,
    stripeCheckoutSessionId: checkoutSessionId,
  };

  if (redis) {
    const claimed = await redis.set(
      `license:session:${checkoutSessionId}`,
      withSession.key,
      { nx: true },
    );
    // Upstash returns null when NX loses; "OK" when it wins.
    if (claimed == null) {
      const existingKey = await redis.get<string>(`license:session:${checkoutSessionId}`);
      if (existingKey) {
        const existing = await getLicense(existingKey);
        if (existing) return existing;
      }
      // Rare: index exists but hash missing — wait briefly then re-read.
      await new Promise((r) => setTimeout(r, 50));
      const retryKey = await redis.get<string>(`license:session:${checkoutSessionId}`);
      if (retryKey) {
        const existing = await getLicense(retryKey);
        if (existing) return existing;
      }
    }
    return saveLicense(withSession);
  }

  const store = await readFileStore();
  const existing = Object.values(store).find(
    (r) => r.stripeCheckoutSessionId === checkoutSessionId,
  );
  if (existing) return existing;
  return saveLicense(withSession);
}

export async function getLicense(key: string): Promise<LicenseRecord | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.hget<string>("licenses", key);
    if (!raw) return null;
    return typeof raw === "string" ? (JSON.parse(raw) as LicenseRecord) : null;
  }

  const store = await readFileStore();
  return store[key] ?? null;
}

export async function getLicenseBySubscription(
  subscriptionId: string,
): Promise<LicenseRecord | null> {
  const redis = getRedis();
  if (redis) {
    const key = await redis.get<string>(`license:sub:${subscriptionId}`);
    if (!key) return null;
    return getLicense(key);
  }

  const store = await readFileStore();
  return (
    Object.values(store).find((r) => r.stripeSubscriptionId === subscriptionId) ??
    null
  );
}

export async function getLicenseByCheckoutSession(
  checkoutSessionId: string,
): Promise<LicenseRecord | null> {
  const redis = getRedis();
  if (redis) {
    const key = await redis.get<string>(`license:session:${checkoutSessionId}`);
    if (!key) return null;
    return getLicense(key);
  }

  const store = await readFileStore();
  return (
    Object.values(store).find((r) => r.stripeCheckoutSessionId === checkoutSessionId) ??
    null
  );
}

export async function linkCheckoutSession(
  checkoutSessionId: string,
  licenseKey: string,
): Promise<void> {
  assertDurableStore("licenses");
  const redis = getRedis();
  if (redis) {
    await redis.set(`license:session:${checkoutSessionId}`, licenseKey);
    const existing = await getLicense(licenseKey);
    if (existing && !existing.stripeCheckoutSessionId) {
      await saveLicense({ ...existing, stripeCheckoutSessionId: checkoutSessionId });
    }
    return;
  }
  const store = await readFileStore();
  const existing = store[licenseKey];
  if (existing) {
    store[licenseKey] = { ...existing, stripeCheckoutSessionId: checkoutSessionId };
    await writeFileStore(store);
  }
}

export async function updateLicenseStatus(
  key: string,
  status: LicenseRecord["status"],
  tier?: Tier,
): Promise<LicenseRecord | null> {
  const existing = await getLicense(key);
  if (!existing) return null;
  return saveLicense({
    ...existing,
    status,
    ...(tier ? { tier } : {}),
  });
}

export function storageBackend(): "upstash" | "filesystem" {
  return redisConfigured() ? "upstash" : "filesystem";
}

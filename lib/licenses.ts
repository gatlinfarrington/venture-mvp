import { createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import type { BillingInterval, Tier } from "@/lib/site";

export type LicenseRecord = {
  key: string;
  tier: Tier;
  email: string;
  interval: BillingInterval | "none";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status: "active" | "canceled" | "past_due";
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "licenses.json");

function redisConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedis() {
  if (!redisConfigured()) return null;
  return Redis.fromEnv();
}

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
  const redis = getRedis();
  const now = new Date().toISOString();
  const next = { ...record, updatedAt: now };

  if (redis) {
    await redis.hset("licenses", { [record.key]: JSON.stringify(next) });
    if (record.stripeSubscriptionId) {
      await redis.set(`license:sub:${record.stripeSubscriptionId}`, record.key);
    }
    return next;
  }

  const store = await readFileStore();
  store[record.key] = next;
  await writeFileStore(store);
  return next;
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

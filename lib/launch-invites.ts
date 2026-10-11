import { promises as fs } from "fs";
import path from "path";
import {
  assertDurableStore,
  getRedis,
  redisConfigured,
} from "@/lib/redis-env";

export type LaunchInvite = {
  email: string;
  createdAt: string;
  source?: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "launch-invites.json");
const REDIS_SET_KEY = "launch:invites";
const REDIS_META_PREFIX = "launch:invite:";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function readFileStore(): Promise<Record<string, LaunchInvite>> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as Record<string, LaunchInvite>;
  } catch {
    return {};
  }
}

async function writeFileStore(store: Record<string, LaunchInvite>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export type SaveInviteResult = { invite: LaunchInvite; created: boolean };

export async function saveLaunchInvite(
  emailRaw: string,
  source?: string,
): Promise<SaveInviteResult> {
  assertDurableStore("launch-invites");
  const email = normalizeEmail(emailRaw);
  const redis = getRedis();

  if (redis) {
    const added = await redis.sadd(REDIS_SET_KEY, email);
    const created = Number(added) > 0;
    if (created) {
      const invite: LaunchInvite = {
        email,
        createdAt: new Date().toISOString(),
        ...(source ? { source } : {}),
      };
      await redis.set(`${REDIS_META_PREFIX}${email}`, JSON.stringify(invite));
      return { invite, created: true };
    }
    const raw = await redis.get<string>(`${REDIS_META_PREFIX}${email}`);
    const invite =
      typeof raw === "string"
        ? (JSON.parse(raw) as LaunchInvite)
        : { email, createdAt: new Date().toISOString() };
    return { invite, created: false };
  }

  const store = await readFileStore();
  if (store[email]) return { invite: store[email], created: false };
  const invite: LaunchInvite = {
    email,
    createdAt: new Date().toISOString(),
    ...(source ? { source } : {}),
  };
  store[email] = invite;
  await writeFileStore(store);
  return { invite, created: true };
}

export async function listLaunchInvites(limit = 200): Promise<LaunchInvite[]> {
  const capped = Math.min(Math.max(limit, 1), 1000);
  const redis = getRedis();
  if (redis) {
    const emails = await redis.smembers(REDIS_SET_KEY);
    const rows: LaunchInvite[] = [];
    for (const email of emails.slice(0, capped)) {
      const raw = await redis.get<string>(`${REDIS_META_PREFIX}${email}`);
      if (typeof raw === "string") rows.push(JSON.parse(raw) as LaunchInvite);
      else rows.push({ email, createdAt: "" });
    }
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const store = await readFileStore();
  return Object.values(store)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, capped);
}

/** One-click / List-Unsubscribe removal. Idempotent. */
export async function removeLaunchInvite(emailRaw: string): Promise<boolean> {
  assertDurableStore("launch-invites");
  const email = normalizeEmail(emailRaw);
  const redis = getRedis();
  if (redis) {
    const removed = await redis.srem(REDIS_SET_KEY, email);
    await redis.del(`${REDIS_META_PREFIX}${email}`);
    return Number(removed) > 0;
  }
  const store = await readFileStore();
  if (!store[email]) return false;
  delete store[email];
  await writeFileStore(store);
  return true;
}

export function launchInviteStorageBackend(): "upstash" | "filesystem" {
  return redisConfigured() ? "upstash" : "filesystem";
}

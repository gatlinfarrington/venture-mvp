import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";

export type SupportSubmission = {
  id: string;
  email: string;
  name: string;
  subject: string;
  message: string;
  createdAt: string;
  userAgent?: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "support.json");
const REDIS_LIST_KEY = "support:submissions";

function redisConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedis() {
  if (!redisConfigured()) return null;
  return Redis.fromEnv();
}

async function readFileStore(): Promise<SupportSubmission[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as SupportSubmission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeFileStore(rows: SupportSubmission[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export function newSupportId(): string {
  return `sup_${randomBytes(10).toString("hex")}`;
}

export async function saveSupportSubmission(
  input: Omit<SupportSubmission, "id" | "createdAt"> & { id?: string },
): Promise<SupportSubmission> {
  const record: SupportSubmission = {
    id: input.id ?? newSupportId(),
    email: input.email,
    name: input.name,
    subject: input.subject,
    message: input.message,
    createdAt: new Date().toISOString(),
    ...(input.userAgent ? { userAgent: input.userAgent } : {}),
  };

  const redis = getRedis();
  if (redis) {
    await redis.lpush(REDIS_LIST_KEY, JSON.stringify(record));
    return record;
  }

  const store = await readFileStore();
  store.unshift(record);
  await writeFileStore(store);
  return record;
}

export async function listSupportSubmissions(limit = 100): Promise<SupportSubmission[]> {
  const capped = Math.min(Math.max(limit, 1), 500);
  const redis = getRedis();
  if (redis) {
    const raw = await redis.lrange<string>(REDIS_LIST_KEY, 0, capped - 1);
    return raw.map((row) =>
      typeof row === "string" ? (JSON.parse(row) as SupportSubmission) : (row as SupportSubmission),
    );
  }
  const store = await readFileStore();
  return store.slice(0, capped);
}

export function supportStorageBackend(): "upstash" | "filesystem" {
  return redisConfigured() ? "upstash" : "filesystem";
}

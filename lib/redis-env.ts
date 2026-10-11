import { Redis } from "@upstash/redis";

/**
 * Vercel Upstash / KV integration may set either naming scheme:
 * - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 * - KV_REST_API_URL / KV_REST_API_TOKEN
 *
 * @upstash/redis Redis.fromEnv() already accepts both; our gate must too.
 */
export function redisRestUrl(): string | undefined {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim() ||
    "";
  return url || undefined;
}

export function redisRestToken(): string | undefined {
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim() ||
    "";
  return token || undefined;
}

export function redisConfigured(): boolean {
  return Boolean(redisRestUrl() && redisRestToken());
}

/** True on Vercel or NODE_ENV=production — filesystem license writes are unsafe. */
export function isProductionRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

export function getRedis(): Redis | null {
  if (!redisConfigured()) return null;
  // Prefer fromEnv so URL/token resolution stays in sync with the SDK.
  return Redis.fromEnv();
}

export function missingRedisMessage(): string {
  return (
    "Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN " +
    "(or Vercel KV aliases KV_REST_API_URL and KV_REST_API_TOKEN). " +
    "Filesystem fallback is disabled in production."
  );
}

/** Refuse silent .data/ writes on Vercel/production when Redis is missing. */
export function assertDurableStore(storeLabel: string): void {
  if (redisConfigured()) return;
  if (!isProductionRuntime()) return;
  console.error(`[${storeLabel}] ${missingRedisMessage()}`);
  throw new Error(missingRedisMessage());
}

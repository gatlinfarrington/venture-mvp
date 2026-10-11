import { afterEach, describe, expect, it } from "vitest";
import {
  assertDurableStore,
  missingRedisMessage,
  redisConfigured,
  redisRestToken,
  redisRestUrl,
} from "@/lib/redis-env";

const KEYS = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "VERCEL",
] as const;

const saved: Record<string, string | undefined> = {};

function clearRedisEnv() {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
}

function restoreEnv() {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}

describe("redis-env", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("accepts UPSTASH_REDIS_REST_* names", () => {
    clearRedisEnv();
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    expect(redisConfigured()).toBe(true);
    expect(redisRestUrl()).toBe("https://example.upstash.io");
    expect(redisRestToken()).toBe("token");
  });

  it("accepts Vercel KV_REST_API_* aliases", () => {
    clearRedisEnv();
    process.env.KV_REST_API_URL = "https://kv.example.upstash.io";
    process.env.KV_REST_API_TOKEN = "kv-token";
    expect(redisConfigured()).toBe(true);
    expect(redisRestUrl()).toBe("https://kv.example.upstash.io");
    expect(redisRestToken()).toBe("kv-token");
  });

  it("throws a clear error in production when Redis is missing", () => {
    clearRedisEnv();
    process.env.VERCEL = "1";
    expect(redisConfigured()).toBe(false);
    expect(() => assertDurableStore("licenses")).toThrow(missingRedisMessage());
  });

  it("allows filesystem fallback outside production", () => {
    clearRedisEnv();
    delete process.env.VERCEL;
    expect(() => assertDurableStore("licenses")).not.toThrow();
  });
});

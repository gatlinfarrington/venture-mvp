import { afterEach, describe, expect, it } from "vitest";
import { generateLicenseKey, hashKey, saveLicense } from "@/lib/licenses";

describe("license keys", () => {
  it("generate keys with tier prefix", () => {
    const key = generateLicenseKey("pro");
    expect(key.startsWith("rs_pro_")).toBe(true);
    expect(key.length).toBeGreaterThan(20);
  });

  it("hashKey is stable and hex", () => {
    const a = hashKey("rs_pro_abc");
    const b = hashKey("rs_pro_abc");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("license storage gates", () => {
  const keys = [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
    "VERCEL",
  ] as const;
  const saved: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("refuses filesystem writes on Vercel when Redis env is missing", async () => {
    for (const k of keys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    process.env.VERCEL = "1";

    await expect(
      saveLicense({
        key: "rs_pro_x",
        tier: "pro",
        email: "a@b.com",
        interval: "month",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow(/Redis is not configured/);
  });
});

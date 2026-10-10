import { describe, expect, it } from "vitest";
import { generateLicenseKey, hashKey } from "@/lib/licenses";

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

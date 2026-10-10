import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { listSupportSubmissions, saveSupportSubmission } from "@/lib/support-store";

const DATA_FILE = path.join(process.cwd(), ".data", "support.json");

describe("support store", () => {
  afterEach(async () => {
    try {
      await fs.unlink(DATA_FILE);
    } catch {
      /* missing is fine */
    }
  });

  it("persists and lists submissions on the filesystem backend", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const saved = await saveSupportSubmission({
      email: "founder@example.com",
      name: "Founder",
      subject: "License help",
      message: "Verify call returns 401 after checkout.",
    });

    expect(saved.id).toMatch(/^sup_/);
    const listed = await listSupportSubmissions(10);
    expect(listed[0]?.id).toBe(saved.id);
  });
});

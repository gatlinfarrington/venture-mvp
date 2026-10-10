import { expect, test } from "@playwright/test";

test.describe("POST /api/license/verify", () => {
  // License API is viewport-agnostic — run once per worker project is fine;
  // skip duplicate mobile run to keep CI fast.
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile-390",
      "License API covered on desktop project only",
    );
  });

  test("valid free key returns valid:true", async ({ request }) => {
    const res = await request.post("/api/license/verify", {
      data: { key: "free" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.tier).toBe("free");
    expect(body.status).toBe("active");
    expect(body.limits).toMatchObject({
      maxSources: 1,
      maxStores: 1,
      scheduledRefresh: false,
    });
  });

  test("valid rs_free_* soft key returns valid:true", async ({ request }) => {
    const res = await request.post("/api/license/verify", {
      data: { licenseKey: "rs_free_e2e_probe" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.tier).toBe("free");
  });

  test("invalid key returns valid:false", async ({ request }) => {
    const res = await request.post("/api/license/verify", {
      data: { key: "rs_pro_definitely_not_a_real_key_zzzz" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toMatch(/not found|inactive/i);
  });

  test("malformed body (invalid JSON) returns 400", async ({ request }) => {
    const res = await request.fetch("/api/license/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: Buffer.from("not-json{{{", "utf8"),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toMatch(/invalid json/i);
  });

  test("missing key returns 400", async ({ request }) => {
    const res = await request.post("/api/license/verify", {
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toMatch(/missing license key/i);
  });
});

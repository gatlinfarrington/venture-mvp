import { expect, test, type APIRequestContext } from "@playwright/test";

function licenseHeaders(extra: Record<string, string> = {}) {
  const secret = process.env.LICENSE_API_SECRET;
  return {
    ...extra,
    ...(secret ? { "x-license-secret": secret } : {}),
  };
}

async function postLicense(
  request: APIRequestContext,
  data: unknown,
  headers: Record<string, string> = {},
) {
  return request.post("/api/license/verify", {
    headers: licenseHeaders(headers),
    data,
  });
}

async function assertNotBlockedBySecret(
  status: number,
  body: { error?: string },
  testInfo: { annotations: Array<{ type: string; description?: string }> },
) {
  if (status !== 401) return;
  if (process.env.LICENSE_API_SECRET) {
    throw new Error(
      `License API returned 401 with LICENSE_API_SECRET set — secret may not match the deployment. Body: ${JSON.stringify(body)}`,
    );
  }
  const msg =
    "BLOCKED (owner): License API requires x-license-secret, but LICENSE_API_SECRET is not available to this test run. Add the same value used in Vercel as a GitHub Actions secret named LICENSE_API_SECRET (and pass it into the Playwright job env).";
  console.warn(msg);
  testInfo.annotations.push({ type: "skip", description: msg });
  test.skip(true, msg);
}

test.describe("POST /api/license/verify", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile-390",
      "License API covered on desktop project only",
    );
  });

  test("valid free key returns valid:true", async ({ request }, testInfo) => {
    const res = await postLicense(request, { key: "free" });
    const body = await res.json();
    await assertNotBlockedBySecret(res.status(), body, testInfo);
    expect(res.status()).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.tier).toBe("free");
    expect(body.status).toBe("active");
    expect(body.limits).toMatchObject({
      maxSources: 1,
      maxStores: 1,
      scheduledRefresh: false,
    });
  });

  test("valid rs_free_* soft key returns valid:true", async ({ request }, testInfo) => {
    const res = await postLicense(request, { licenseKey: "rs_free_e2e_probe" });
    const body = await res.json();
    await assertNotBlockedBySecret(res.status(), body, testInfo);
    expect(res.status()).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.tier).toBe("free");
  });

  test("invalid key returns valid:false", async ({ request }, testInfo) => {
    const res = await postLicense(request, {
      key: "rs_pro_definitely_not_a_real_key_zzzz",
    });
    const body = await res.json();
    await assertNotBlockedBySecret(res.status(), body, testInfo);
    expect(res.status()).toBe(200);
    expect(body.valid).toBe(false);
    expect(body.error).toMatch(/not found|inactive/i);
  });

  test("malformed body (invalid JSON) returns 400", async ({ request }, testInfo) => {
    const res = await request.fetch("/api/license/verify", {
      method: "POST",
      headers: licenseHeaders({ "Content-Type": "application/json" }),
      data: Buffer.from("not-json{{{", "utf8"),
    });
    const body = await res.json();
    await assertNotBlockedBySecret(res.status(), body, testInfo);
    expect(res.status()).toBe(400);
    expect(body.valid).toBe(false);
    expect(body.error).toMatch(/invalid json/i);
  });

  test("missing key returns 400", async ({ request }, testInfo) => {
    const res = await postLicense(request, {});
    const body = await res.json();
    await assertNotBlockedBySecret(res.status(), body, testInfo);
    expect(res.status()).toBe(400);
    expect(body.valid).toBe(false);
    expect(body.error).toMatch(/missing license key/i);
  });
});

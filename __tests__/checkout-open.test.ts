import { afterEach, describe, expect, it, vi } from "vitest";

const KEYS = [
  "CHECKOUT_OPEN",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
] as const;

describe("CHECKOUT_OPEN gate", () => {
  const saved: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.resetModules();
  });

  function snapshotEnv() {
    for (const k of KEYS) saved[k] = process.env[k];
  }

  it("keeps checkoutEnabled false when CHECKOUT_OPEN is unset", async () => {
    snapshotEnv();
    delete process.env.CHECKOUT_OPEN;
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_real_looking_key";
    vi.resetModules();
    const { checkoutEnabled, checkoutOpen } = await import("@/lib/site");
    expect(checkoutOpen).toBe(false);
    expect(checkoutEnabled).toBe(false);
  });

  it("enables checkout only when CHECKOUT_OPEN is exactly true", async () => {
    snapshotEnv();
    process.env.CHECKOUT_OPEN = "true";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_real_looking_key";
    vi.resetModules();
    const { checkoutEnabled, checkoutOpen } = await import("@/lib/site");
    expect(checkoutOpen).toBe(true);
    expect(checkoutEnabled).toBe(true);
  });

  it("POST /api/checkout returns 403 with a friendly message when gated", async () => {
    snapshotEnv();
    delete process.env.CHECKOUT_OPEN;
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_x";
    vi.resetModules();
    const { POST } = await import("@/app/api/checkout/route");
    const res = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "pro", interval: "month" }),
      }),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/Checkout isn't open yet/i);
    expect(body.error).not.toMatch(/Stripe|env|secret|key/i);
  });

  it("POST /api/checkout does not 403 when CHECKOUT_OPEN is true", async () => {
    snapshotEnv();
    process.env.CHECKOUT_OPEN = "true";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_x";
    vi.resetModules();
    const { POST } = await import("@/app/api/checkout/route");
    const res = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "free", interval: "month" }),
      }),
    );
    // Invalid tier → 400; gated closed would have been 403.
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const mocks = vi.hoisted(() => ({
  saveLicenseForCheckoutSession: vi.fn(),
  getLicenseByCheckoutSession: vi.fn(),
  getLicenseBySubscription: vi.fn(),
  linkCheckoutSession: vi.fn(),
  generateLicenseKey: vi.fn(() => "rs_pro_testkey"),
  tierFromPriceId: vi.fn(async () => "pro" as const),
  intervalFromPriceId: vi.fn(async () => "month" as const),
  subscriptionsRetrieve: vi.fn(),
}));

vi.mock("@/lib/licenses", () => ({
  saveLicenseForCheckoutSession: mocks.saveLicenseForCheckoutSession,
  getLicenseByCheckoutSession: mocks.getLicenseByCheckoutSession,
  getLicenseBySubscription: mocks.getLicenseBySubscription,
  linkCheckoutSession: mocks.linkCheckoutSession,
  generateLicenseKey: mocks.generateLicenseKey,
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
  }),
  tierFromPriceId: mocks.tierFromPriceId,
  intervalFromPriceId: mocks.intervalFromPriceId,
}));

import { issueLicenseFromCheckoutSession } from "@/lib/issue-license";

function session(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_live_test",
    object: "checkout.session",
    mode: "subscription",
    payment_status: "paid",
    subscription: "sub_123",
    customer: "cus_123",
    customer_email: "buyer@example.com",
    customer_details: { email: "buyer@example.com" },
    metadata: { tier: "pro", interval: "month" },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe("issueLicenseFromCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLicenseByCheckoutSession.mockResolvedValue(null);
    mocks.getLicenseBySubscription.mockResolvedValue(null);
    mocks.linkCheckoutSession.mockResolvedValue(undefined);
    mocks.subscriptionsRetrieve.mockResolvedValue({
      items: { data: [{ price: { id: "price_pro_month" } }] },
    });
    mocks.saveLicenseForCheckoutSession.mockImplementation(async (record: unknown) => record);
    mocks.generateLicenseKey.mockReturnValue("rs_pro_testkey");
  });

  it("returns an existing license for the same checkout session (idempotent)", async () => {
    const existing = { key: "rs_pro_existing", tier: "pro" };
    mocks.getLicenseByCheckoutSession.mockResolvedValue(existing);
    const result = await issueLicenseFromCheckoutSession(session());
    expect(result).toBe(existing);
    expect(mocks.saveLicenseForCheckoutSession).not.toHaveBeenCalled();
  });

  it("links session when a license already exists for the subscription", async () => {
    const existing = { key: "rs_pro_sub", tier: "pro", stripeSubscriptionId: "sub_123" };
    mocks.getLicenseBySubscription.mockResolvedValue(existing);
    const result = await issueLicenseFromCheckoutSession(session());
    expect(mocks.linkCheckoutSession).toHaveBeenCalledWith("cs_live_test", "rs_pro_sub");
    expect(result).toBe(existing);
    expect(mocks.saveLicenseForCheckoutSession).not.toHaveBeenCalled();
  });

  it("mints one license for a paid session", async () => {
    const result = await issueLicenseFromCheckoutSession(session());
    expect(mocks.saveLicenseForCheckoutSession).toHaveBeenCalledTimes(1);
    expect(mocks.saveLicenseForCheckoutSession.mock.calls[0]?.[1]).toBe("cs_live_test");
    expect(result?.key).toBe("rs_pro_testkey");
    expect(result?.stripeSubscriptionId).toBe("sub_123");
  });

  it("skips unpaid sessions on the recovery path", async () => {
    const result = await issueLicenseFromCheckoutSession(
      session({ payment_status: "unpaid" }),
    );
    expect(result).toBeNull();
    expect(mocks.saveLicenseForCheckoutSession).not.toHaveBeenCalled();
  });
});

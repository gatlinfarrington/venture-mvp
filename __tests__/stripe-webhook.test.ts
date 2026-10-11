import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.fn();
const issueLicenseFromCheckoutSession = vi.fn();
const getLicenseBySubscription = vi.fn();
const updateLicenseStatus = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent },
  }),
  tierFromPriceId: vi.fn(async () => "pro"),
}));

vi.mock("@/lib/issue-license", () => ({
  issueLicenseFromCheckoutSession: (...args: unknown[]) =>
    issueLicenseFromCheckoutSession(...args),
}));

vi.mock("@/lib/licenses", () => ({
  getLicenseBySubscription: (...args: unknown[]) => getLicenseBySubscription(...args),
  updateLicenseStatus: (...args: unknown[]) => updateLicenseStatus(...args),
}));

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_live_b1pP2AJTA5D4QeKjLwQeEKRVXGN8zV0wCVjJpcd0EVkU5P9RviYpjbu0fO",
          mode: "subscription",
          payment_status: "paid",
          subscription: "sub_test",
        },
      },
    });
    issueLicenseFromCheckoutSession.mockResolvedValue({ key: "rs_pro_1" });
  });

  it("verifies the signature with the raw body and STRIPE_WEBHOOK_SECRET", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const raw = JSON.stringify({ id: "evt_test" });
    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=abc" },
      body: raw,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(constructEvent).toHaveBeenCalledWith(
      raw,
      "t=1,v1=abc",
      "whsec_test_secret",
    );
    expect(issueLicenseFromCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it("rejects missing signature without calling constructEvent", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(constructEvent).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.fn();
const issueLicenseFromCheckoutSession = vi.fn();
const getLicenseBySubscription = vi.fn();
const updateLicenseStatus = vi.fn();
const tierFromPriceId = vi.fn(async (_priceId?: string) => "pro" as const);

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent },
  }),
  tierFromPriceId: (priceId: string) => tierFromPriceId(priceId),
}));

vi.mock("@/lib/issue-license", () => ({
  issueLicenseFromCheckoutSession: (...args: unknown[]) =>
    issueLicenseFromCheckoutSession(...args),
}));

vi.mock("@/lib/licenses", () => ({
  getLicenseBySubscription: (...args: unknown[]) => getLicenseBySubscription(...args),
  updateLicenseStatus: (...args: unknown[]) => updateLicenseStatus(...args),
}));

function webhookRequest(raw = JSON.stringify({ id: "evt_test" })) {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=abc" },
    body: raw,
  });
}

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
    getLicenseBySubscription.mockResolvedValue({
      key: "rs_pro_existing",
      tier: "pro",
      status: "past_due",
    });
    updateLicenseStatus.mockResolvedValue({ key: "rs_pro_existing", status: "active" });
    tierFromPriceId.mockResolvedValue("pro");
  });

  it("verifies the signature with the raw body and STRIPE_WEBHOOK_SECRET", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const raw = JSON.stringify({ id: "evt_test" });
    const res = await POST(webhookRequest(raw));
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

  it("invoice.paid renews an existing license to active (does not mint)", async () => {
    constructEvent.mockReturnValue({
      type: "invoice.paid",
      data: {
        object: {
          id: "in_test_paid",
          parent: {
            type: "subscription_details",
            subscription_details: { subscription: "sub_renew" },
            quote_details: null,
          },
          lines: {
            data: [
              {
                pricing: {
                  type: "price_details",
                  price_details: { price: "price_pro_month", product: "prod_x" },
                  unit_amount_decimal: "900",
                },
              },
            ],
          },
        },
      },
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(issueLicenseFromCheckoutSession).not.toHaveBeenCalled();
    expect(getLicenseBySubscription).toHaveBeenCalledWith("sub_renew");
    expect(tierFromPriceId).toHaveBeenCalledWith("price_pro_month");
    expect(updateLicenseStatus).toHaveBeenCalledWith("rs_pro_existing", "active", "pro");
  });

  it("invoice.paid is a no-op when no license exists for the subscription", async () => {
    getLicenseBySubscription.mockResolvedValue(null);
    constructEvent.mockReturnValue({
      type: "invoice.paid",
      data: {
        object: {
          id: "in_orphan",
          parent: {
            type: "subscription_details",
            subscription_details: { subscription: "sub_unknown" },
            quote_details: null,
          },
          lines: { data: [] },
        },
      },
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(updateLicenseStatus).not.toHaveBeenCalled();
    expect(issueLicenseFromCheckoutSession).not.toHaveBeenCalled();
  });

  it("invoice.payment_failed marks the license past_due without canceling", async () => {
    constructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_test_failed",
          parent: {
            type: "subscription_details",
            subscription_details: { subscription: "sub_dunning" },
            quote_details: null,
          },
          lines: { data: [] },
        },
      },
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(getLicenseBySubscription).toHaveBeenCalledWith("sub_dunning");
    expect(updateLicenseStatus).toHaveBeenCalledWith("rs_pro_existing", "past_due");
    expect(updateLicenseStatus).not.toHaveBeenCalledWith(
      expect.anything(),
      "canceled",
      expect.anything(),
    );
  });

  it("resolves subscription id from legacy top-level invoice.subscription", async () => {
    const { subscriptionIdFromInvoice } = await import(
      "@/app/api/webhooks/stripe/route"
    );
    expect(
      subscriptionIdFromInvoice({
        subscription: "sub_legacy",
        parent: null,
      } as never),
    ).toBe("sub_legacy");
  });
});

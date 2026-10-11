import type Stripe from "stripe";
import {
  generateLicenseKey,
  getLicenseByCheckoutSession,
  getLicenseBySubscription,
  linkCheckoutSession,
  saveLicenseForCheckoutSession,
  type LicenseRecord,
} from "@/lib/licenses";
import {
  getStripe,
  intervalFromPriceId,
  tierFromPriceId,
} from "@/lib/stripe";
import type { Tier } from "@/lib/site";

/**
 * Issue exactly one license for a paid Checkout Session.
 * Safe to call from the Stripe webhook and from /api/checkout/session recovery.
 */
export async function issueLicenseFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<LicenseRecord | null> {
  if (session.mode && session.mode !== "subscription") return null;

  const sessionId = session.id;
  if (!sessionId) return null;

  const bySession = await getLicenseByCheckoutSession(sessionId);
  if (bySession) return bySession;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) return null;

  // Paid (or no_payment_required) before minting — recovery path may run while unpaid.
  if (
    session.payment_status &&
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return null;
  }

  const bySub = await getLicenseBySubscription(subscriptionId);
  if (bySub) {
    await linkCheckoutSession(sessionId, bySub.key);
    return bySub;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id ?? "";
  const tier =
    (await tierFromPriceId(priceId)) ??
    ((session.metadata?.tier as Exclude<Tier, "free"> | undefined) || "pro");
  const interval =
    (await intervalFromPriceId(priceId)) ||
    ((session.metadata?.interval as "month" | "year" | undefined) ?? "month");

  const email =
    session.customer_details?.email ||
    session.customer_email ||
    "unknown@example.com";

  const key = generateLicenseKey(tier);
  const now = new Date().toISOString();

  return saveLicenseForCheckoutSession(
    {
      key,
      tier,
      email,
      interval,
      stripeCustomerId:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id,
      stripeSubscriptionId: subscriptionId,
      stripeCheckoutSessionId: sessionId,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    sessionId,
  );
}

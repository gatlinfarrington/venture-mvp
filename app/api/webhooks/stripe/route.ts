import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { issueLicenseFromCheckoutSession } from "@/lib/issue-license";
import {
  getLicenseBySubscription,
  updateLicenseStatus,
} from "@/lib/licenses";
import { getStripe, tierFromPriceId } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook endpoint: POST /api/webhooks/stripe
 *
 * Uses the raw request body + STRIPE_WEBHOOK_SECRET for signature verification
 * (required for live whsec_… secrets).
 *
 * Subscribe to:
 * - checkout.session.completed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.includes("REPLACE_ME")) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Raw body required for constructEvent; do not parse JSON first.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") {
          await issueLicenseFromCheckoutSession(session);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const license = await getLicenseBySubscription(sub.id);
        if (license) {
          const priceId = sub.items.data[0]?.price.id ?? "";
          const tier = (await tierFromPriceId(priceId)) ?? license.tier;
          const status =
            sub.status === "active" || sub.status === "trialing"
              ? "active"
              : sub.status === "past_due"
                ? "past_due"
                : "canceled";
          await updateLicenseStatus(license.key, status, tier);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const license = await getLicenseBySubscription(sub.id);
        if (license) {
          await updateLicenseStatus(license.key, "canceled");
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    console.error("[webhooks/stripe]", event.type, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

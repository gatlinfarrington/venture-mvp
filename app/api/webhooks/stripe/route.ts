import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  generateLicenseKey,
  getLicenseBySubscription,
  saveLicense,
  updateLicenseStatus,
} from "@/lib/licenses";
import {
  getStripe,
  intervalFromPriceId,
  tierFromPriceId,
} from "@/lib/stripe";
import type { Tier } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Stripe webhook endpoint: POST /api/webhooks/stripe
 *
 * Subscribe to these events in the Stripe Dashboard (or CLI):
 * - checkout.session.completed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 */
async function issueFromSession(session: Stripe.Checkout.Session) {
  const stripe = getStripe();
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) return null;

  const existing = await getLicenseBySubscription(subscriptionId);
  if (existing) return existing;

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

  return saveLicense({
    key,
    tier,
    email,
    interval,
    stripeCustomerId:
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id,
    stripeSubscriptionId: subscriptionId,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

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
          await issueFromSession(session);
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
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

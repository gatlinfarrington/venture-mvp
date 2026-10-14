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
 * - invoice.paid
 * - invoice.payment_failed
 */

/** Subscription id on Invoice (API 2025-03-31.basil+ uses parent.subscription_details). */
export function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const fromParent = invoice.parent?.subscription_details?.subscription;
  if (typeof fromParent === "string" && fromParent) return fromParent;
  if (fromParent && typeof fromParent === "object" && "id" in fromParent) {
    return (fromParent as Stripe.Subscription).id;
  }
  // Older payloads / fixtures may still carry top-level subscription.
  const legacy = (invoice as { subscription?: string | Stripe.Subscription | null })
    .subscription;
  if (typeof legacy === "string" && legacy) return legacy;
  if (legacy && typeof legacy === "object" && legacy.id) return legacy.id;
  return null;
}

function priceIdFromInvoice(invoice: Stripe.Invoice): string {
  for (const line of invoice.lines?.data ?? []) {
    const price = line.pricing?.price_details?.price;
    if (typeof price === "string" && price) return price;
    if (price && typeof price === "object" && "id" in price) {
      return (price as Stripe.Price).id;
    }
  }
  return "";
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
      case "invoice.paid": {
        // Renewal (or recovery after past_due): keep / restore active. Does not mint
        // a new key; checkout.session.completed issues the license.
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = subscriptionIdFromInvoice(invoice);
        if (!subscriptionId) break;
        const license = await getLicenseBySubscription(subscriptionId);
        if (!license) break;
        const priceId = priceIdFromInvoice(invoice);
        const tier = priceId
          ? ((await tierFromPriceId(priceId)) ?? license.tier)
          : license.tier;
        await updateLicenseStatus(license.key, "active", tier);
        break;
      }
      case "invoice.payment_failed": {
        // Dunning: record past_due only. No separate grace window exists; do not
        // cancel/revoke here. Access continues to follow whatever verify already
        // does for past_due (same as customer.subscription.updated -> past_due).
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = subscriptionIdFromInvoice(invoice);
        if (!subscriptionId) break;
        const license = await getLicenseBySubscription(subscriptionId);
        if (!license) break;
        await updateLicenseStatus(license.key, "past_due");
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

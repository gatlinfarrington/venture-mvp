import { NextResponse } from "next/server";
import { getStripe, priceIdFor } from "@/lib/stripe";
import {
  CHECKOUT_CLOSED_MESSAGE,
  checkoutOpen,
  siteConfig,
  type BillingInterval,
  type Tier,
} from "@/lib/site";

export const runtime = "nodejs";

type Body = {
  tier?: Exclude<Tier, "free">;
  interval?: BillingInterval;
  email?: string;
};

const BUYER_CHECKOUT_ERROR = "Checkout could not start. Try again in a moment.";

export async function POST(request: Request) {
  if (!checkoutOpen) {
    return NextResponse.json({ error: CHECKOUT_CLOSED_MESSAGE }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tier = body.tier;
  const interval = body.interval ?? "month";

  if (tier !== "pro" && tier !== "business") {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  if (interval !== "month" && interval !== "year") {
    return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const price = await priceIdFor(tier, interval);
    const origin = siteConfig.url;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      customer_email: body.email || undefined,
      metadata: {
        tier,
        interval,
      },
      subscription_data: {
        metadata: {
          tier,
          interval,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (error) {
    console.error("[checkout] session create failed", error);
    return NextResponse.json({ error: BUYER_CHECKOUT_ERROR }, { status: 500 });
  }
}

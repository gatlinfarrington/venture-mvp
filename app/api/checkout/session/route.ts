import { NextResponse } from "next/server";
import { getLicenseBySubscription } from "@/lib/licenses";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/** Returns license info for a completed Checkout session (success page). */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      return NextResponse.json({
        status: session.status,
        license: null,
        message: "Subscription not ready yet. Refresh in a few seconds.",
      });
    }

    const license = await getLicenseBySubscription(subscriptionId);
    return NextResponse.json({
      status: session.status,
      email: session.customer_details?.email ?? session.customer_email,
      license: license
        ? {
            key: license.key,
            tier: license.tier,
            interval: license.interval,
          }
        : null,
    });
  } catch (error) {
    // Never surface raw Stripe messages to the client.
    console.error("checkout session lookup failed", error);
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getStripeEnvReport } from "@/lib/stripe-env";

export const runtime = "nodejs";

/**
 * Admin-only Stripe readiness JSON.
 * Auth: Authorization: Bearer <LICENSE_API_SECRET or STRIPE_ADMIN_TOKEN>
 */
export async function GET(request: Request) {
  const expected =
    process.env.STRIPE_ADMIN_TOKEN || process.env.LICENSE_API_SECRET || "";
  if (!expected || expected.includes("REPLACE")) {
    return NextResponse.json(
      { error: "Admin token not configured (set STRIPE_ADMIN_TOKEN or LICENSE_API_SECRET)" },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = getStripeEnvReport();
  return NextResponse.json({
    ...report,
    webhookPath: "/api/webhooks/stripe",
    webhookEvents: [
      "checkout.session.completed",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ],
    docs: "/docs/GO-LIVE.md",
  });
}

import { checkoutEnabled } from "@/lib/site";
import { PRICE_LOOKUP_KEYS } from "@/lib/stripe-catalog";

export type StripeEnvIssue = {
  level: "error" | "warn";
  code: string;
  message: string;
};

/** Server-side Stripe readiness report for go-live diagnostics. */
export function getStripeEnvReport(): {
  readyForCheckout: boolean;
  mode: "live" | "test" | "missing";
  issues: StripeEnvIssue[];
  lookupKeys: typeof PRICE_LOOKUP_KEYS;
} {
  const issues: StripeEnvIssue[] = [];
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const webhook = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let mode: "live" | "test" | "missing" = "missing";
  if (secret.startsWith("sk_live_")) mode = "live";
  else if (secret.startsWith("sk_test_")) mode = "test";

  if (!secret || secret.includes("REPLACE")) {
    issues.push({
      level: "error",
      code: "missing_secret",
      message: "STRIPE_SECRET_KEY is missing or still a REPLACE placeholder.",
    });
  }
  if (!publishable || publishable.includes("REPLACE")) {
    issues.push({
      level: "error",
      code: "missing_publishable",
      message:
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing or still a REPLACE placeholder. Paid buttons stay disabled until it is a real pk_test_/pk_live_ value.",
    });
  }
  if (!webhook || webhook.includes("REPLACE")) {
    issues.push({
      level: "warn",
      code: "missing_webhook",
      message:
        "STRIPE_WEBHOOK_SECRET is missing. Checkout can open, but licenses will not issue until the webhook is configured for /api/webhooks/stripe.",
    });
  }

  if (
    secret.startsWith("sk_live_") &&
    publishable.startsWith("pk_test_")
  ) {
    issues.push({
      level: "error",
      code: "mode_mismatch",
      message: "Live secret key paired with a test publishable key.",
    });
  }
  if (
    secret.startsWith("sk_test_") &&
    publishable.startsWith("pk_live_")
  ) {
    issues.push({
      level: "error",
      code: "mode_mismatch",
      message: "Test secret key paired with a live publishable key.",
    });
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    issues.push({
      level: "warn",
      code: "missing_redis",
      message:
        "Upstash Redis is not set — license storage falls back to local .data/ (not durable on Vercel).",
    });
  }

  return {
    readyForCheckout: checkoutEnabled && Boolean(secret && !secret.includes("REPLACE")),
    mode,
    issues,
    lookupKeys: PRICE_LOOKUP_KEYS,
  };
}

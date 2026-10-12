import { redisConfigured } from "@/lib/redis-env";
import { checkoutEnabled, checkoutOpen } from "@/lib/site";
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
  if (!checkoutOpen) {
    issues.push({
      level: "warn",
      code: "checkout_gated",
      message:
        "CHECKOUT_OPEN is not true. Get Pro / Get Business stay on the launch list; POST /api/checkout returns 403.",
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

  if (!redisConfigured()) {
    issues.push({
      level: "error",
      code: "missing_redis",
      message:
        "Redis is not set (need UPSTASH_REDIS_REST_URL/TOKEN or Vercel KV aliases KV_REST_API_URL/TOKEN). License writes fail on Vercel without them.",
    });
  }

  return {
    readyForCheckout: checkoutEnabled && Boolean(secret && !secret.includes("REPLACE")),
    mode,
    issues,
    lookupKeys: PRICE_LOOKUP_KEYS,
  };
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Reveal } from "@/components/Reveal";
import { checkoutEnabled, pricing, siteConfig, type BillingInterval } from "@/lib/site";

export function Pricing() {
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [pendingTier, setPendingTier] = useState<string | null>(null);

  const plans = [pricing.free, pricing.pro, pricing.business];

  async function startCheckout(
    tier: "pro" | "business",
    billing: BillingInterval,
  ) {
    if (!checkoutEnabled) {
      setCheckoutMessage("Checkout opens at launch — Stripe keys are not configured yet.");
      return;
    }
    setPendingTier(tier);
    setCheckoutMessage(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval: billing }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        const checkoutUrl = data.url;
        queueMicrotask(() => {
          window.location.assign(checkoutUrl);
        });
        return;
      }
      setCheckoutMessage(
        data.error ?? "Checkout could not start. Check Stripe env vars and try again.",
      );
    } catch {
      setCheckoutMessage("Checkout could not start. Try again in a moment.");
    } finally {
      setPendingTier(null);
    }
  }

  return (
    <section id="pricing" className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">Pricing</p>
          <h2 className="h2">Free to try. Pay when you schedule sync.</h2>
          <p className="muted body-lg">
            Free, $9, and $19. Annual billing is ten months of the monthly price —
            two months free.
          </p>
        </Reveal>

        <div className="billing-toggle" role="group" aria-label="Billing interval">
          <button
            type="button"
            aria-pressed={interval === "month"}
            onClick={() => setInterval("month")}
          >
            Monthly
          </button>
          <button
            type="button"
            aria-pressed={interval === "year"}
            onClick={() => setInterval("year")}
          >
            Annual · 2 months free
          </button>
        </div>

        <div className="pricing-grid">
          {plans.map((plan, i) => {
            const amount =
              plan.tier === "free"
                ? 0
                : interval === "month"
                  ? plan.monthly
                  : Math.round(plan.annual / 12);
            const featured = plan.tier === "pro";
            return (
              <Reveal key={plan.tier} className={`price-card${featured ? " is-featured" : ""}`} delay={Math.min(i, 4) * 60}>
                <div>
                  <p className="eyebrow">{plan.name}</p>
                  <p className="price-amount">
                    ${amount}
                    <span>
                      {plan.tier === "free"
                        ? " forever"
                        : interval === "month"
                          ? "/mo"
                          : "/mo billed yearly"}
                    </span>
                  </p>
                  {plan.tier !== "free" && interval === "year" ? (
                    <p className="mono muted price-annual">
                      ${plan.annual}/yr
                    </p>
                  ) : null}
                </div>
                <ul className="price-features">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {plan.tier === "free" ? (
                  <Link className="btn btn-secondary" href={siteConfig.installUrl}>
                    Start free
                  </Link>
                ) : checkoutEnabled ? (
                  <div className="price-cta-stack">
                    <button
                      type="button"
                      className={featured ? "btn btn-primary" : "btn btn-secondary"}
                      disabled={pendingTier === plan.tier}
                      onClick={() => startCheckout(plan.tier, interval)}
                    >
                      {pendingTier === plan.tier ? "Opening…" : `Get ${plan.name}`}
                    </button>
                  </div>
                ) : (
                  <div className="price-cta-stack">
                    <a
                      className={featured ? "btn btn-primary" : "btn btn-secondary"}
                      href={siteConfig.installUrl}
                    >
                      Start free, upgrade at launch
                    </a>
                    <p className="price-cta-caption mono muted">Checkout opens at launch</p>
                  </div>
                )}
              </Reveal>
            );
          })}
        </div>
        {checkoutMessage ? (
          <p role="status" className="checkout-status">
            {checkoutMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}

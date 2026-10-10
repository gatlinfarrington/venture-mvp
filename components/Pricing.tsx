"use client";

import Link from "next/link";
import { useState } from "react";
import { Reveal } from "@/components/Reveal";
import { pricing, type BillingInterval } from "@/lib/site";

async function startCheckout(
  tier: "pro" | "business",
  interval: BillingInterval,
) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier, interval }),
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (data.url) {
    window.location.href = data.url;
    return;
  }
  alert(data.error ?? "Checkout is not configured yet. Set Stripe test keys in env.");
}

export function Pricing() {
  const [interval, setInterval] = useState<BillingInterval>("month");

  const plans = [pricing.free, pricing.pro, pricing.business];

  return (
    <section id="pricing" className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">Pricing</p>
          <h2 className="h2">Free to try. Pay when you schedule sync.</h2>
          <p className="muted body-lg">
            Annual billing is ten months of the monthly price — two months free.
            Prices marked (est.) until launch.
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
                          ? "/mo (est.)"
                          : "/mo billed yearly (est.)"}
                    </span>
                  </p>
                  {plan.tier !== "free" && interval === "year" ? (
                    <p className="mono muted" style={{ marginTop: "var(--space-2)" }}>
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
                  <Link className="btn btn-secondary" href="/#how-it-works">
                    Start free
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={featured ? "btn btn-primary" : "btn btn-secondary"}
                    onClick={() => startCheckout(plan.tier, interval)}
                  >
                    Get {plan.name}
                  </button>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { InstallCta } from "@/components/InstallCta";
import { Reveal } from "@/components/Reveal";
import { SampleSheetLink } from "@/components/SampleSheetLink";
import { REFUND_LINE } from "@/lib/copy";
import { marketplaceUrlClient } from "@/lib/marketplace-client";
import {
  checkoutEnabled,
  everyPlanIncludes,
  pricing,
  type BillingInterval,
} from "@/lib/site";

type Props = {
  /** Dedicated /pricing page uses inner-page H1; homepage keeps section H2. */
  variant?: "section" | "page";
};

export function Pricing({ variant = "section" }: Props) {
  const interval: BillingInterval = "month";
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [pendingTier, setPendingTier] = useState<string | null>(null);

  const plans = [pricing.free, pricing.pro, pricing.business];
  const listing = marketplaceUrlClient();
  const paidCheckoutReady = checkoutEnabled;
  const launchHref = variant === "page" ? "#launch" : "/#launch";
  const showLaunchCaption = !listing && !paidCheckoutReady;

  async function startCheckout(tier: "pro" | "business", billing: BillingInterval) {
    if (!checkoutEnabled) return;
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
    <section id="pricing" className={`section${variant === "page" ? " pricing-section-page" : ""}`}>
      <div className="container">
        {variant === "page" ? (
          <header className="pricing-page-head">
            <p className="eyebrow">Pricing</p>
            <h1>Free to start. Paid plans open at launch.</h1>
          </header>
        ) : (
          <Reveal className="section-head">
            <p className="eyebrow">Pricing</p>
            <h2 className="h2">Free to start. Paid plans open at launch.</h2>
          </Reveal>
        )}

        <div className="pricing-grid">
          {plans.map((plan, i) => {
            const amount = plan.tier === "free" ? 0 : plan.monthly;
            const featured = plan.tier === "pro";
            const btnClass = featured ? "btn btn-primary" : "btn btn-secondary";
            const cardClass = `price-card${featured ? " is-featured" : ""}`;
            const lead = "lead" in plan ? plan.lead : null;
            const body = (
              <>
                <div className="price-card-top">
                  <p className="eyebrow">{plan.name}</p>
                  <p className="price-amount">
                    ${amount}
                    <span>{plan.tier === "free" ? " forever" : "/mo"}</span>
                  </p>
                </div>
                {lead ? (
                  <div className="price-pro-lead">
                    <p className="price-pro-lead-text">{lead}</p>
                  </div>
                ) : null}
                <ul className={`price-features${lead ? " has-lead" : ""}`}>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {plan.tier === "free" ? (
                  <div className="price-cta-stack">
                    <InstallCta
                      className={btnClass}
                      source="pricing-free"
                      launchHref={launchHref}
                    >
                      {listing ? "Install free" : "Join the launch list"}
                    </InstallCta>
                    <SampleSheetLink className="btn btn-secondary" source="pricing-free-sample" />
                  </div>
                ) : paidCheckoutReady ? (
                  <div className="price-cta-stack">
                    <button
                      type="button"
                      className={btnClass}
                      disabled={pendingTier === plan.tier}
                      onClick={() => startCheckout(plan.tier, interval)}
                    >
                      {pendingTier === plan.tier ? "Opening…" : `Get ${plan.name}`}
                    </button>
                    <p className="price-cta-caption mono muted">{REFUND_LINE}</p>
                  </div>
                ) : (
                  <div className="price-cta-stack">
                    <InstallCta
                      className={btnClass}
                      source={`pricing-${plan.tier}`}
                      launchHref={launchHref}
                    >
                      Join the launch list
                    </InstallCta>
                  </div>
                )}
              </>
            );
            if (variant === "page") {
              return (
                <div key={plan.tier} className={cardClass}>
                  {body}
                </div>
              );
            }
            return (
              <Reveal
                key={plan.tier}
                className={cardClass}
                delay={Math.min(i, 4) * 60}
              >
                {body}
              </Reveal>
            );
          })}
        </div>
        <p className="pricing-shared-note mono muted">
          {everyPlanIncludes.join(" · ")}
        </p>
        <p className="pricing-upgrade-note">
          Free covers one store with one-click refresh. Upgrade when you sell in two places or want
          it to run on its own.
        </p>
        {showLaunchCaption ? (
          <p className="pricing-grid-caption mono muted">
            Opens with the Marketplace listing
          </p>
        ) : null}
        {checkoutMessage ? (
          <p role="status" className="checkout-status">
            {checkoutMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}

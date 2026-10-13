"use client";

import { useState, type ReactNode } from "react";
import { InstallCta } from "@/components/InstallCta";
import { Reveal } from "@/components/Reveal";
import { REFUND_LINE } from "@/lib/copy";
import { marketplaceUrlClient } from "@/lib/marketplace-client";
import {
  CHECKOUT_CLOSED_MESSAGE,
  checkoutEnabled,
  pricing,
  type BillingInterval,
} from "@/lib/site";

type Props = {
  /** Dedicated /pricing page uses inner-page H1; homepage keeps section H2. */
  variant?: "section" | "page";
};

const BUYER_CHECKOUT_ERROR = "Checkout could not start. Try again in a moment.";

export function Pricing({ variant = "section" }: Props) {
  const interval: BillingInterval = "month";
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [pendingTier, setPendingTier] = useState<string | null>(null);

  const plans = [pricing.free, pricing.pro, pricing.business];
  const listing = marketplaceUrlClient();
  const paidCheckoutReady = checkoutEnabled;
  const launchHref = variant === "page" ? "#launch" : "/#launch";
  const showLaunchCaption = !listing && !paidCheckoutReady;
  const headline = paidCheckoutReady
    ? "Free to start. Buy Pro or Business here."
    : "Free to start. Paid plans open at launch.";

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
      if (res.status === 403) {
        setCheckoutMessage(data.error ?? CHECKOUT_CLOSED_MESSAGE);
        return;
      }
      if (data.error) console.error("[pricing] checkout failed", data.error);
      setCheckoutMessage(BUYER_CHECKOUT_ERROR);
    } catch (err) {
      console.error("[pricing] checkout request failed", err);
      setCheckoutMessage(BUYER_CHECKOUT_ERROR);
    } finally {
      setPendingTier(null);
    }
  }

  const cards = plans.map((plan, i) => {
    const amount = plan.tier === "free" ? 0 : plan.monthly;
    const featured = plan.tier === "pro";
    const btnClass = featured ? "btn btn-primary" : "btn btn-secondary";
    const lead = "lead" in plan ? plan.lead : null;
    const cardClass = `price-card${featured ? " is-featured" : ""}${
      variant === "section" ? " reveal-rise" : ""
    }`;
    const body: ReactNode = (
      <>
        <div className="price-card-top">
          <p className="eyebrow">
            {plan.name}
            {featured ? <span className="price-badge mono">Recommended</span> : null}
          </p>
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
        <ul
          className={`price-features${lead ? " has-lead" : ""}${
            plan.tier === "business" ? " is-business" : ""
          }`}
        >
          {plan.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        {plan.tier === "free" ? (
          <div className="price-cta-stack">
            <InstallCta className={btnClass} source="pricing-free" launchHref={launchHref}>
              {listing ? "Install free" : "Join the launch list"}
            </InstallCta>
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
    return (
      <div
        key={plan.tier}
        className={cardClass}
        style={
          variant === "section"
            ? { transitionDelay: `${Math.min(i, 2) * 40}ms` }
            : undefined
        }
      >
        {body}
      </div>
    );
  });

  return (
    <section id="pricing" className={`section${variant === "page" ? " pricing-section-page" : ""}`}>
      <div className="container">
        {variant === "page" ? (
          <header className="pricing-page-head">
            <p className="eyebrow">Pricing</p>
            <h1>{headline}</h1>
          </header>
        ) : (
          <Reveal className="section-head">
            <p className="eyebrow">Pricing</p>
            <h2 className="h2">{headline}</h2>
          </Reveal>
        )}

        {variant === "page" ? (
          <div className="pricing-grid">{cards}</div>
        ) : (
          <Reveal className="pricing-grid-reveal">
            <div className="pricing-grid">{cards}</div>
          </Reveal>
        )}
        <p className="pricing-shared-note muted">
          Every plan includes the help docs and the support form.
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

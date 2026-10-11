import { getLicenseApiBase } from "./config";

/** Configured site origin (Script Property LICENSE_API_BASE, else default). */
export function getSiteBaseUrl(): string {
  return getLicenseApiBase().replace(/\/$/, "");
}

/** Public pricing page on the configured site. */
export function getPricingUrl(): string {
  return `${getSiteBaseUrl()}/pricing`;
}

/** Append a pricing CTA to an upgrade reason (toast / status / Settings copy). */
export function withPricingCta(reason: string): string {
  const base = String(reason || "").trim().replace(/[.\s]+$/, "");
  return `${base}. Upgrade at ${getPricingUrl()}`;
}

export function storeLimitReachedMessage(maxStores: number): string {
  const n = Math.max(1, Number(maxStores) || 1);
  if (n <= 1) {
    return withPricingCta("Multiple stores need Business (Free and Pro include 1 store)");
  }
  return withPricingCta(`Your plan allows ${n} store(s)`);
}

export function sourceLimitReachedMessage(maxSources: number, blocked: string[]): string {
  const n = Math.max(1, Number(maxSources) || 1);
  const list = blocked.length ? ` Not syncing: ${blocked.join(", ")}` : "";
  return withPricingCta(`Your plan allows ${n} source(s).${list}`);
}

export function scheduleNeedsPaidMessage(): string {
  return withPricingCta(
    "Scheduled refresh needs Pro or Business · paste your key in License & display",
  );
}

/** Short sidebar banner when Free/Pro tries to add a second store. */
export function multiStoreUpgradeHeadline(): string {
  return "Multiple stores are on Business";
}

export function multiStoreUpgradeBody(): string {
  return "Free and Pro include one store. Business combines MRR across up to 20.";
}

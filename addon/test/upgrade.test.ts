import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONFIG } from "../src/lib/config";
import {
  getPricingUrl,
  getSiteBaseUrl,
  multiStoreUpgradeBody,
  multiStoreUpgradeHeadline,
  scheduleNeedsPaidMessage,
  sourceLimitReachedMessage,
  storeLimitReachedMessage,
  withPricingCta,
} from "../src/lib/upgrade";
import { enforceSourceLimit, type LicenseStatus } from "../src/lib/license";

describe("upgrade / pricing links", () => {
  it("builds pricing URL from the configured site base", () => {
    assert.equal(getSiteBaseUrl(), CONFIG.DEFAULT_LICENSE_API_BASE);
    assert.equal(getPricingUrl(), `${CONFIG.DEFAULT_LICENSE_API_BASE}/pricing`);
  });

  it("appends Upgrade at {pricing} to every CTA", () => {
    const msg = withPricingCta("Need Business");
    assert.equal(msg, `Need Business. Upgrade at ${getPricingUrl()}`);
  });

  it("Free/Pro second-store prompt links to /pricing", () => {
    const msg = storeLimitReachedMessage(1);
    assert.ok(msg.includes("Business"));
    assert.ok(msg.endsWith(getPricingUrl()) || msg.includes("/pricing"));
    assert.ok(multiStoreUpgradeHeadline().includes("Business"));
    assert.ok(multiStoreUpgradeBody().includes("Free and Pro"));
  });

  it("source-limit upgrade links to /pricing", () => {
    const msg = sourceLimitReachedMessage(1, ["polar"]);
    assert.ok(msg.includes("polar"));
    assert.ok(msg.includes("/pricing"));

    const license: LicenseStatus = {
      tier: "free",
      ok: true,
      degraded: false,
      message: "Free",
      maxSources: 1,
      maxStores: 1,
      allowSchedule: false,
    };
    const limited = enforceSourceLimit(license, ["lemon_squeezy", "polar"]);
    assert.equal(limited.blocked.length, 1);
    assert.ok(limited.message?.includes("/pricing"));
  });

  it("schedule upgrade links to /pricing", () => {
    assert.ok(scheduleNeedsPaidMessage().includes("/pricing"));
  });
});

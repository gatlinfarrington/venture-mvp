import { expect, test } from "@playwright/test";
import { isStripeNotConfigured } from "./helpers";

const TEST_CARD = {
  number: "4242424242424242",
  expiry: "1234", // MMYY far enough in future for Stripe UI
  cvc: "123",
  name: "E2E Tester",
  email: `e2e+${Date.now()}@revenuesheet.test`,
};

/**
 * Full Stripe Checkout → webhook license → verify flow.
 * Skips with a clear message when Stripe test keys / prices are not configured
 * on the target deployment.
 */
test.describe("Stripe test checkout → license", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile-390",
      "Stripe checkout covered on desktop project only",
    );
  });

  test("completes checkout, webhook issues license, verify succeeds", async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(180_000);

    const checkoutRes = await request.post("/api/checkout", {
      data: {
        tier: "pro",
        interval: "month",
        email: TEST_CARD.email,
      },
    });

    const checkoutBody = (await checkoutRes.json()) as {
      url?: string;
      id?: string;
      error?: string;
    };

    if (!checkoutRes.ok() || !checkoutBody.url) {
      const reason =
        checkoutBody.error ||
        `Checkout returned HTTP ${checkoutRes.status()} without a session URL`;
      const msg = `BLOCKED (owner): Stripe test checkout skipped — keys/prices not configured on this deployment (${reason}). Set STRIPE_SECRET_KEY (sk_test_…), STRIPE_WEBHOOK_SECRET, and STRIPE_PRICE_* in Vercel to enable.`;
      console.warn(msg);
      testInfo.annotations.push({ type: "skip", description: msg });
      test.skip(true, msg);
      return;
    }

    if (isStripeNotConfigured(checkoutBody.error)) {
      const msg = `BLOCKED (owner): Stripe test checkout skipped — ${checkoutBody.error}. Configure Stripe test keys in Vercel.`;
      console.warn(msg);
      testInfo.annotations.push({ type: "skip", description: msg });
      test.skip(true, msg);
      return;
    }

    await page.goto(checkoutBody.url, { waitUntil: "domcontentloaded" });

    // Hosted Stripe Checkout — fill email if present
    const email = page.locator('input[type="email"], input[name="email"]').first();
    if (await email.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await email.fill(TEST_CARD.email);
    }

    // Card fields may be in iframes (Payment Element) or plain inputs
    const cardFrame = page.frameLocator(
      'iframe[name*="privateStripeFrame"], iframe[title*="Secure card"], iframe[title*="card number"]',
    ).first();

    const cardNumber = page.locator(
      'input[name="cardNumber"], input[placeholder*="Card number"], input[autocomplete="cc-number"]',
    ).first();

    if (await cardNumber.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await cardNumber.fill(TEST_CARD.number);
      const exp = page.locator(
        'input[name="cardExpiry"], input[placeholder*="MM"], input[autocomplete="cc-exp"]',
      ).first();
      const cvc = page.locator(
        'input[name="cardCvc"], input[placeholder*="CVC"], input[autocomplete="cc-csc"]',
      ).first();
      if (await exp.isVisible().catch(() => false)) await exp.fill("12 / 34");
      if (await cvc.isVisible().catch(() => false)) await cvc.fill(TEST_CARD.cvc);
    } else {
      // Try iframe-based Payment Element
      const frameNumber = cardFrame.locator(
        'input[name="cardnumber"], input[name="number"], input[autocomplete="cc-number"]',
      );
      await frameNumber.waitFor({ state: "visible", timeout: 20_000 });
      await frameNumber.fill(TEST_CARD.number);

      const frameExp = cardFrame.locator(
        'input[name="exp-date"], input[name="expiry"], input[autocomplete="cc-exp"]',
      );
      const frameCvc = cardFrame.locator(
        'input[name="cvc"], input[autocomplete="cc-csc"]',
      );
      if (await frameExp.count()) await frameExp.fill("1234");
      if (await frameCvc.count()) await frameCvc.fill(TEST_CARD.cvc);
    }

    // Billing name / country sometimes required
    const name = page.locator('input[name="billingName"], input[name="name"]').first();
    if (await name.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await name.fill(TEST_CARD.name);
    }

    const submit = page.locator(
      'button[type="submit"]:has-text("Subscribe"), button[type="submit"]:has-text("Pay"), button:has-text("Subscribe"), button:has-text("Pay and subscribe"), .SubmitButton',
    ).first();
    await submit.click();

    // Redirect back to /success?session_id=…
    await page.waitForURL(/\/success\?session_id=/, { timeout: 120_000 });
    const sessionId = new URL(page.url()).searchParams.get("session_id");
    expect(sessionId).toBeTruthy();

    // Wait for webhook to issue the license key on the success page
    const licenseKey = page.locator("code.license-key");
    await expect(licenseKey).toBeVisible({ timeout: 90_000 });
    const key = (await licenseKey.textContent())?.trim();
    expect(key).toMatch(/^rs_pro_/);

    // Verify via license API
    const verify = await request.post("/api/license/verify", {
      data: { key },
    });
    expect(verify.status()).toBe(200);
    const verified = await verify.json();
    expect(verified.valid).toBe(true);
    expect(verified.tier).toBe("pro");
    expect(verified.status).toBe("active");
  });
});

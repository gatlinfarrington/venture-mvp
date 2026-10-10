import { expect, test } from "@playwright/test";
import { isStripeNotConfigured } from "./helpers";

const TEST_CARD = {
  number: "4242424242424242",
  expiry: "1234",
  cvc: "123",
  name: "E2E Tester",
  email: `e2e+${Date.now()}@revenuesheet.test`,
};

/**
 * Stripe test-mode: Checkout → webhook license issue → /success ready.
 * Skips cleanly when test keys are not configured on the target.
 */
test.describe("Stripe test checkout → webhook → /success ready", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile-390",
      "Stripe checkout covered on desktop project only",
    );
  });

  test("completes checkout, webhook issues key, /success reaches ready", async ({
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
      const msg =
        `BLOCKED (owner): Stripe test checkout skipped — keys not configured ` +
        `on this deployment (${reason}). Set STRIPE_SECRET_KEY (sk_test_…), ` +
        `STRIPE_WEBHOOK_SECRET, and Redis license storage to enable.`;
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

    const email = page.locator('input[type="email"], input[name="email"]').first();
    if (await email.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await email.fill(TEST_CARD.email);
    }

    const cardFrame = page
      .frameLocator(
        'iframe[name*="privateStripeFrame"], iframe[title*="Secure card"], iframe[title*="card number"]',
      )
      .first();

    const cardNumber = page
      .locator(
        'input[name="cardNumber"], input[placeholder*="Card number"], input[autocomplete="cc-number"]',
      )
      .first();

    if (await cardNumber.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await cardNumber.fill(TEST_CARD.number);
      const exp = page
        .locator(
          'input[name="cardExpiry"], input[placeholder*="MM"], input[autocomplete="cc-exp"]',
        )
        .first();
      const cvc = page
        .locator(
          'input[name="cardCvc"], input[placeholder*="CVC"], input[autocomplete="cc-csc"]',
        )
        .first();
      if (await exp.isVisible().catch(() => false)) await exp.fill("12 / 34");
      if (await cvc.isVisible().catch(() => false)) await cvc.fill(TEST_CARD.cvc);
    } else {
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
      if (await frameExp.count()) await frameExp.fill(TEST_CARD.expiry);
      if (await frameCvc.count()) await frameCvc.fill(TEST_CARD.cvc);
    }

    const name = page.locator('input[name="billingName"], input[name="name"]').first();
    if (await name.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await name.fill(TEST_CARD.name);
    }

    const submit = page
      .locator(
        'button[type="submit"]:has-text("Subscribe"), button[type="submit"]:has-text("Pay"), button:has-text("Subscribe"), button:has-text("Pay and subscribe"), .SubmitButton',
      )
      .first();
    await submit.click();

    // Webhook should issue the license; /success polls until ready.
    await page.waitForURL(/\/success\?session_id=/, { timeout: 120_000 });
    const sessionId = new URL(page.url()).searchParams.get("session_id");
    expect(sessionId).toBeTruthy();

    await expect(page.locator('.success-shell[data-state="ready"]')).toBeVisible({
      timeout: 90_000,
    });

    const keyBox = page.locator(".success-key-value").first();
    await expect(keyBox).toBeVisible();

    const reveal = page.getByRole("button", { name: /^Reveal$/i });
    if (await reveal.isVisible().catch(() => false)) {
      await reveal.click();
    }

    const keyText = (await keyBox.textContent())?.trim() ?? "";
    expect(keyText).toMatch(/^rs_pro_/);

    const verify = await request.post("/api/license/verify", {
      data: { key: keyText },
    });
    expect(verify.status()).toBe(200);
    const verified = (await verify.json()) as {
      valid?: boolean;
      tier?: string;
      status?: string;
    };
    expect(verified.valid).toBe(true);
    expect(verified.tier).toBe("pro");
    expect(verified.status).toBe("active");
  });
});

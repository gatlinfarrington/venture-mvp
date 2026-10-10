import { BRAND } from "./brand";
import { EMAIL_DIGEST_SCOPE, SHEET_NAMES } from "./config";
import { computeArr } from "../metrics/arr";
import { computeChurn } from "../metrics/churn";
import { computeLtv } from "../metrics/ltv";
import { computeMrr } from "../metrics/mrr";
import { computeRefundSummary } from "../metrics/refunds";
import { getIncludeTrialingPastDue, isEmailDigestOptIn } from "./properties";
import { readOrders, readRefunds, readSubscriptions } from "../sheets/dataTabs";

export interface DigestResult {
  ok: boolean;
  message: string;
  requiresSensitiveScope?: boolean;
}

/**
 * Opt-in weekly email to the spreadsheet owner via MailApp.
 *
 * Scope note: MailApp needs `https://www.googleapis.com/auth/script.send_mail`
 * which Google classifies as sensitive. It is intentionally NOT in the default
 * appsscript.json. To enable: add EMAIL_DIGEST_SCOPE to oauthScopes, re-auth,
 * then opt in from the sidebar.
 */
export function runWeeklyDigest(): DigestResult {
  if (!isEmailDigestOptIn()) {
    return { ok: false, message: "Weekly digest is off. Opt in from the sidebar." };
  }

  if (typeof MailApp === "undefined") {
    return {
      ok: false,
      requiresSensitiveScope: true,
      message: `MailApp unavailable. Add ${EMAIL_DIGEST_SCOPE} to oauthScopes and re-authorize.`,
    };
  }

  try {
    const ss = SpreadsheetApp.getActive();
    const orders = readOrders(ss);
    const subscriptions = readSubscriptions(ss);
    const refunds = readRefunds(ss);
    const mrrOpts = { includeTrialingPastDue: getIncludeTrialingPastDue() };

    const mrr = computeMrr(subscriptions, mrrOpts);
    const arr = computeArr(subscriptions, mrrOpts);
    const churn = computeChurn(subscriptions, 30);
    const ltv = computeLtv(subscriptions);
    const refundsSummary = computeRefundSummary(orders, refunds, 30);

    const email = Session.getActiveUser().getEmail();
    if (!email) {
      return { ok: false, message: "Could not resolve sheet owner email." };
    }

    const subject = `${BRAND.name} weekly digest · MRR $${Math.round(mrr.total).toLocaleString("en-US")}`;
    const body = [
      `${BRAND.name} · weekly digest`,
      "",
      `MRR: $${mrr.total.toFixed(2)}`,
      `ARR: $${arr.arr.toFixed(2)}`,
      `Active subscriptions: ${mrr.activeCount}`,
      `Trialing: ${mrr.trialingCount} · $${mrr.trialingMrr.toFixed(2)}`,
      `Past due: ${mrr.pastDueCount} · $${mrr.pastDueMrr.toFixed(2)}`,
      `Churn (30d): ${(churn.rate * 100).toFixed(1)}%`,
      `LTV (est.): $${ltv.ltv.toFixed(2)}`,
      `Refunds (30d): $${refundsSummary.refundAmount.toFixed(2)} (${(refundsSummary.refundRate * 100).toFixed(1)}% of orders)`,
      "",
      `Open your sheet: ${ss.getUrl()}`,
      "",
      "You opted into this email in the RevenueSheet sidebar. Turn it off anytime.",
      `This message uses MailApp (${EMAIL_DIGEST_SCOPE}).`,
      `Tabs: ${SHEET_NAMES.dashboard}, ${SHEET_NAMES.orders}, …`,
    ].join("\n");

    MailApp.sendEmail(email, subject, body);
    return { ok: true, message: `Digest sent to ${email}.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const needsScope = /send_mail|MailApp|Authorization|permission/i.test(msg);
    return {
      ok: false,
      requiresSensitiveScope: needsScope,
      message: needsScope
        ? `Digest needs sensitive scope ${EMAIL_DIGEST_SCOPE}. Add it to appsscript.json oauthScopes, clasp push, and re-authorize. (${msg})`
        : `Digest failed: ${msg}`,
    };
  }
}

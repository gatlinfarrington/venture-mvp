import { getStripeEnvReport } from "@/lib/stripe-env";

/**
 * Visible only when STRIPE_SHOW_ADMIN_BANNER=1 is set in the server env.
 * Paste keys in Vercel, leave this flag off for public visitors.
 */
export function StripeAdminBanner() {
  if (process.env.STRIPE_SHOW_ADMIN_BANNER !== "1") return null;

  const report = getStripeEnvReport();
  if (!report.issues.length && report.readyForCheckout) return null;

  const errors = report.issues.filter((i) => i.level === "error");
  const warns = report.issues.filter((i) => i.level === "warn");

  return (
    <aside className="admin-stripe-banner" role="status">
      <p className="mono">
        Stripe admin · mode={report.mode} · checkout=
        {report.readyForCheckout ? "ready" : "blocked"}
      </p>
      {errors.length ? (
        <ul>
          {errors.map((i) => (
            <li key={i.code}>{i.message}</li>
          ))}
        </ul>
      ) : null}
      {warns.length ? (
        <ul className="admin-stripe-warns">
          {warns.map((i) => (
            <li key={i.code}>{i.message}</li>
          ))}
        </ul>
      ) : null}
      <p className="mono muted">
        Hide: unset STRIPE_SHOW_ADMIN_BANNER. Guide: docs/GO-LIVE.md
      </p>
    </aside>
  );
}

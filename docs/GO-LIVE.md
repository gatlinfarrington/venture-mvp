# Stripe go-live checklist

Going live should only require pasting keys into Vercel (and pointing a webhook). Price IDs are optional — the app looks up or creates products/prices by stable `lookup_key` on first checkout (or via one command below).

## 1. Stripe account

1. Use **test** mode until Checkout and license issue work end-to-end.
2. In **Developers → API keys**, copy Secret + Publishable keys.
3. Optional but recommended: run catalog sync once:

```bash
STRIPE_SECRET_KEY=sk_test_… npm run stripe:sync-prices
```

This creates:

| lookup_key | Plan |
| --- | --- |
| `revenuesheet_pro_monthly` | Pro monthly ($9) |
| `revenuesheet_pro_annual` | Pro annual ($90) |
| `revenuesheet_business_monthly` | Business monthly ($19) |
| `revenuesheet_business_annual` | Business annual ($190) |

If you skip the script, the first `/api/checkout` call creates the same catalog automatically when `STRIPE_SECRET_KEY` is set.

## 2. Webhook

**Path:** `POST https://<your-domain>/api/webhooks/stripe`

**Events (required):**

- `checkout.session.completed` — issues the license key
- `customer.subscription.updated` — syncs tier / past_due / active
- `customer.subscription.deleted` — marks license canceled

**Local:**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Paste the CLI `whsec_…` into `STRIPE_WEBHOOK_SECRET`.

**Production:** Stripe Dashboard → Developers → Webhooks → Add endpoint → same path and events → copy signing secret into Vercel `STRIPE_WEBHOOK_SECRET`.

## 3. Vercel environment variables

Minimum for paid Checkout:

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://revenuesheet.app` (no trailing slash) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` or `pk_live_…` (no `REPLACE`) — **enables paid buttons** |
| `STRIPE_SECRET_KEY` | Matching `sk_test_…` / `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the webhook endpoint |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Durable license storage |

Optional:

| Variable | Notes |
| --- | --- |
| `STRIPE_PRICE_*` | Override lookup_keys with fixed price IDs |
| `STRIPE_SHOW_ADMIN_BANNER=1` | Site-wide admin warning strip (owner only — turn off for public) |
| `STRIPE_ADMIN_TOKEN` or `LICENSE_API_SECRET` | Bearer token for `GET /api/admin/stripe-status` |
| `NEXT_PUBLIC_INSTALL_URL` | Marketplace listing URL |

Paid CTAs enable as soon as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is a real `pk_test_` / `pk_live_` value (see `checkoutEnabled` in `lib/site.ts`).

## 4. Verify

1. Open `/pricing` — Pro/Business buttons should no longer say “Checkout opens at launch”.
2. Complete a test Checkout; confirm `/success` shows a license key.
3. Confirm the webhook delivered `checkout.session.completed` (Stripe Dashboard → Webhooks → attempts).
4. Optional admin JSON:

```bash
curl -s -H "Authorization: Bearer $STRIPE_ADMIN_TOKEN" https://<domain>/api/admin/stripe-status | jq
```

5. Flip to **live** keys in Vercel Production, create a **live** webhook with the same path/events, re-run `stripe:sync-prices` with `sk_live_…` (or let first live checkout create prices).

## 5. Do not

- Commit real keys to git.
- Mix live secret with test publishable (the admin report flags this).
- Leave `STRIPE_SHOW_ADMIN_BANNER=1` on a public production deployment.

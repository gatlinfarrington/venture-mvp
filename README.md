# RevenueSheet

Google Sheets add-on marketing site + license API. Sync Lemon Squeezy, Polar, and Gumroad revenue into a sheet you own, with an MRR dashboard.

> **Name is swappable.** Edit [`lib/brand.ts`](lib/brand.ts) (`name`, `domain`, `logo`, legal emails) for the site, and [`addon/src/lib/brand.ts`](addon/src/lib/brand.ts) for the Sheets add-on. The placeholder logo is the **Ledger Cell** mark (`design/logo-v2/c3-symbol.svg` / `addon/design/ledger-cell-mark.svg`).

## Stack

- Next.js 16 (App Router) on Vercel
- Stripe Checkout (test mode) for Pro / Business
- License storage: **Upstash Redis** in production, **`.data/licenses.json`** filesystem fallback for local/dev
- **`/addon`** — clasp-ready Google Sheets add-on (TypeScript / Apps Script). See [`addon/README.md`](addon/README.md).

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run lint` | ESLint + design check + content frontmatter validation |
| `npm run validate:content` | Validate `content/blog` + `content/changelog` MDX frontmatter |
| `npm run stripe:sync-prices` | Create/reuse Stripe products & prices by lookup_key |
| `npm run test` | Vitest |
| `npm run typecheck` | TypeScript |

Content authoring: [`content/README.md`](content/README.md). Stripe go-live: [`docs/GO-LIVE.md`](docs/GO-LIVE.md).

## Environment variables

See [`.env.example`](.env.example).

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Preferred in prod | Canonical origin, no trailing slash; falls back to `https://${VERCEL_PROJECT_PRODUCTION_URL}` |
| `NEXT_PUBLIC_INSTALL_URL` | No | Workspace Marketplace listing URL |
| `STRIPE_SECRET_KEY` | For checkout | `sk_test_…` / `sk_live_…` — paste to go live |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Enables paid CTAs | Real `pk_test_` / `pk_live_` (no `REPLACE`) |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | Endpoint `/api/webhooks/stripe` |
| `STRIPE_PRICE_*` | Optional | Overrides; otherwise lookup_key auto-create |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Prod licenses | Without these, uses `.data/` (not multi-instance safe) |
| `LICENSE_API_SECRET` | Recommended | Shared secret header `x-license-secret` for the add-on |

Live Stripe keys: set the `*_LIVE` placeholders in Vercel Production only when ready; keep Preview on test keys.

### Stripe webhook (local)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Events used: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

## API

### `POST /api/license/verify`

Body: `{ "key": "rs_pro_…" }`  
Optional header: `x-license-secret: $LICENSE_API_SECRET`  
Response: `{ valid, tier, status, limits }`.

Free soft-keys: `free` or `rs_free_*`.

### `POST /api/checkout`

Body: `{ "tier": "pro" \| "business", "interval": "month" \| "year", "email?": "…" }`  
Returns `{ url }` for Stripe Checkout.

### `POST /api/webhooks/stripe`

Issues `rs_{tier}_{hex}` license keys into Redis/filesystem on successful subscription checkout.

### `GET /api/checkout/session?session_id=…`

Success page helper to display the issued key after redirect.

## Why this storage

| Option | Verdict |
|---|---|
| Upstash Redis | Serverless-friendly, works across Vercel instances, cheap for key/value licenses |
| `.data/licenses.json` | Zero-config local/dev only — not durable on serverless |

Stripe remains source of truth for billing; Redis/file is a fast cache the Sheets add-on can query.

## Design system

Monolith-adapted tokens in [`design/`](design/). Motion rules: [`design/MOTION.md`](design/MOTION.md). Landing anti-patterns checklist: [`design/LANDING.md`](design/LANDING.md). Hero animation ported from [`design/landing-hero-demo.html`](design/landing-hero-demo.html).

## Deploy

Connected to Vercel (`venture-mvp`). Push to `main` for production. Set env vars in the Vercel project before enabling Checkout.

## Apps Script add-on

The Sheets add-on lives under [`/addon`](addon/). Setup, clasp, OAuth scopes, and Marketplace steps: [`addon/README.md`](addon/README.md).

It calls `POST /api/license/verify` with the user’s license key (script property `LICENSE_API_BASE` overrides the default origin). Free tier = 1 source, manual refresh; paid unlocks schedule + multi-source. Unreachable license API degrades to free limits.

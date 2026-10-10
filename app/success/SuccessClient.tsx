"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { brand } from "@/lib/brand";
import { REFUND_LINE_ASIDE } from "@/lib/copy";
import { marketplaceUrlClient } from "@/lib/marketplace-client";
import { pricing } from "@/lib/site";
import { supportEmail, supportMailto } from "@/lib/support";

type UiState = "loading" | "ready" | "notfound" | "error";

type SessionPayload = {
  status?: string | null;
  email?: string | null;
  license?: { key: string; tier: string; interval: string } | null;
  message?: string;
  error?: string;
};

const POLL_MS = 2500;
const SLOW_MS = 30_000;
const GIVE_UP_MS = 180_000;

function templateCopyUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_TEMPLATE_COPY_URL?.trim() || "";
  return raw.length > 0 ? raw : null;
}

function tierLabel(tier: string) {
  const t = tier.toLowerCase();
  if (t === "business") return "Business";
  if (t === "pro") return "Pro";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function intervalLabel(interval: string) {
  const i = interval.toLowerCase();
  if (i === "year" || i === "annual") return "annual";
  return "monthly";
}

function monthlyPrice(tier: string) {
  const t = tier.toLowerCase();
  if (t === "business") return `$${pricing.business.monthly}/mo`;
  if (t === "pro") return `$${pricing.pro.monthly}/mo`;
  return "";
}

function maskKey(key: string) {
  const last4 = key.slice(-4);
  const match = key.match(/^(rs_[a-z]+_)/i);
  const prefix = match?.[1] ?? key.slice(0, Math.min(7, key.length));
  return `${prefix}${"•".repeat(20)}${last4}`;
}

function storageKey(sessionId: string, step: number) {
  return `rs-success-check:${sessionId}:${step}`;
}

function SuccessHeader() {
  return (
    <header className="success-top">
      <div className="success-top-inner">
        <BrandWordmark />
        <Link className="success-help" href="/support">
          Need help? Support
        </Link>
      </div>
    </header>
  );
}

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const keyBoxRef = useRef<HTMLDivElement>(null);
  const liveId = useId();
  const startedAt = useRef<number>(Date.now());
  const [ui, setUi] = useState<UiState>(sessionId ? "loading" : "notfound");
  const [data, setData] = useState<SessionPayload | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [slow, setSlow] = useState(false);
  const [timeoutLede, setTimeoutLede] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [checks, setChecks] = useState<[boolean, boolean, boolean]>([
    false,
    false,
    false,
  ]);
  const prevUi = useRef<UiState | null>(null);

  const templateUrl = templateCopyUrl();
  const marketplaceUrl = marketplaceUrlClient();
  const supportMail = supportEmail();
  const supportHref = supportMailto() || "/support";
  const supportLabel = supportMail || "Support";

  useEffect(() => {
    if (!sessionId) return;
    setChecks([
      localStorage.getItem(storageKey(sessionId, 1)) === "1",
      localStorage.getItem(storageKey(sessionId, 2)) === "1",
      localStorage.getItem(storageKey(sessionId, 3)) === "1",
    ]);
  }, [sessionId]);

  const markCheck = useCallback(
    (step: 1 | 2 | 3) => {
      if (!sessionId) return;
      localStorage.setItem(storageKey(sessionId, step), "1");
      setChecks((prev) => {
        const next = [...prev] as [boolean, boolean, boolean];
        next[step - 1] = true;
        return next;
      });
    },
    [sessionId],
  );

  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setUi("notfound");
      return;
    }

    let cancelled = false;
    let pollId: number | null = null;
    let settled = false;
    startedAt.current = Date.now();
    setSlow(false);
    setTimeoutLede(false);
    setUi("loading");

    const stop = () => {
      if (pollId != null) {
        window.clearInterval(pollId);
        pollId = null;
      }
    };

    const tick = async () => {
      if (cancelled || settled) return;
      const elapsed = Date.now() - startedAt.current;
      if (elapsed >= GIVE_UP_MS) {
        settled = true;
        stop();
        setTimeoutLede(true);
        setUi("notfound");
        return;
      }
      if (elapsed >= SLOW_MS) setSlow(true);

      try {
        const res = await fetch(
          `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`,
        );
        if (cancelled || settled) return;
        setHttpStatus(res.status);
        const json = (await res.json()) as SessionPayload;

        if (res.status === 400) {
          settled = true;
          stop();
          setUi("notfound");
          setData(json);
          return;
        }
        if (res.status >= 500 || !res.ok) {
          console.error("success session lookup failed", res.status, json);
          settled = true;
          stop();
          setUi("error");
          setData({ error: "lookup failed" });
          return;
        }

        setData(json);
        if (json.license?.key) {
          settled = true;
          stop();
          setUi("ready");
        } else {
          setUi("loading");
        }
      } catch (err) {
        if (cancelled || settled) return;
        console.error("success session network error", err);
        settled = true;
        stop();
        setHttpStatus(0);
        setUi("error");
        setData({ error: "lookup failed" });
      }
    };

    void tick();
    pollId = window.setInterval(() => {
      void tick();
    }, POLL_MS);

    return () => {
      cancelled = true;
      stop();
    };
  }, [sessionId, retryNonce]);

  useEffect(() => {
    if (prevUi.current !== ui) {
      prevUi.current = ui;
      queueMicrotask(() => h1Ref.current?.focus());
    }
  }, [ui]);

  async function copyKey(full: string) {
    try {
      if (!navigator.clipboard?.writeText) {
        setRevealed(true);
        queueMicrotask(() => {
          const el = keyBoxRef.current;
          if (!el) return;
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        });
        setCopyNote("Press ⌘C / Ctrl+C");
        setCopied(false);
        return;
      }
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setCopyNote("Copied");
      window.setTimeout(() => {
        setCopied(false);
        setCopyNote(null);
      }, 2000);
    } catch {
      setRevealed(true);
      setCopyNote("Press ⌘C / Ctrl+C");
    }
  }

  const license = data?.license;
  const tier = license ? tierLabel(license.tier) : "Pro";
  const interval = license ? intervalLabel(license.interval) : "monthly";
  const email = data?.email || "your inbox";
  const price = license ? monthlyPrice(license.tier) : "";

  return (
    <div className="success-shell" data-state={ui}>
      <SuccessHeader />
      <div className="success-main">
        {ui === "loading" ? (
          <div className="success-grid success-state" key="loading">
            <div className="success-primary">
              <p className="eyebrow">Confirming payment</p>
              <h1 className="success-h1" ref={h1Ref} tabIndex={-1}>
                Getting your key
                <br />
                from Stripe.
              </h1>
              <p className="success-lede muted">
                {slow
                  ? "Still waiting on Stripe. Your payment is safe; this page checks again every few seconds."
                  : "This usually takes a few seconds. Keep this tab open."}
              </p>
              <div className="success-key-card" aria-hidden="true">
                <div className="success-key-card-head">
                  <span>License key</span>
                  <span className="mono muted">…</span>
                </div>
                <div className="success-key-value is-skeleton">
                  <span className="success-shimmer" />
                </div>
                <div className="success-key-actions">
                  <button type="button" className="btn btn-secondary" disabled>
                    Reveal
                  </button>
                  <button type="button" className="btn btn-primary" disabled>
                    Copy key
                  </button>
                </div>
              </div>
            </div>
            <aside className="success-aside muted">
              <p className="eyebrow">What happens next</p>
              <p>Your key appears here as soon as Stripe confirms the subscription.</p>
            </aside>
          </div>
        ) : null}

        {ui === "ready" && license ? (
          <div className="success-grid success-state" key="ready">
            <div className="success-primary">
              <p className="eyebrow">
                Payment confirmed · {tier} · {interval}
              </p>
              <h1 className="success-h1" ref={h1Ref} tabIndex={-1}>
                You’re on {tier}.
                <br />
                Here’s your key.
              </h1>
              <p className="success-lede muted">
                Your receipt went to {email}. Three steps and your revenue is in a
                sheet you own.
              </p>

              <div className="success-key-card">
                <div className="success-key-card-head">
                  <span>License key</span>
                  <span className="mono">
                    {tier}
                    {price ? ` · ${price}` : ""}
                  </span>
                </div>
                <div
                  ref={keyBoxRef}
                  className="success-key-value"
                  aria-live="polite"
                  id={liveId}
                >
                  {revealed ? license.key : maskKey(license.key)}
                </div>
                <div className="success-key-actions">
                  <button
                    type="button"
                    className="btn btn-secondary success-btn"
                    aria-pressed={revealed}
                    aria-controls={liveId}
                    onClick={() => setRevealed((v) => !v)}
                  >
                    {revealed ? "Hide" : "Reveal"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary success-btn"
                    onClick={() => {
                      void copyKey(license.key);
                      markCheck(3);
                    }}
                  >
                    {copied ? "Copied" : "Copy key"}
                  </button>
                </div>
                <p className="success-key-note muted" role="status">
                  {copyNote ? (
                    <span className="mono">{copyNote}</span>
                  ) : (
                    <>
                      Treat it like a password: it unlocks {tier} for anyone who has
                      it.
                    </>
                  )}
                </p>
              </div>

              <ol className="success-checklist">
                <li className={checks[0] ? "is-done" : undefined}>
                  <span className="success-check-num mono" aria-hidden="true">
                    {checks[0] ? "ok" : "01"}
                  </span>
                  <div className="success-check-body">
                    <p className="success-check-title">Copy the template Sheet</p>
                    {templateUrl ? (
                      <a
                        className="btn btn-secondary success-btn"
                        href={templateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => markCheck(1)}
                      >
                        Make a copy
                      </a>
                    ) : null}
                  </div>
                  <span className="success-check-box" aria-hidden="true">
                    <input
                      type="checkbox"
                      checked={checks[0]}
                      onChange={() => markCheck(1)}
                      aria-label="Mark step 1 done"
                    />
                  </span>
                </li>
                <li className={checks[1] ? "is-done" : undefined}>
                  <span className="success-check-num mono" aria-hidden="true">
                    {checks[1] ? "ok" : "02"}
                  </span>
                  <div className="success-check-body">
                    <p className="success-check-title">Open the add-on</p>
                    <p className="muted success-check-copy">
                      In your copy, choose Extensions → {brand.name} → Open sidebar.
                    </p>
                    {marketplaceUrl ? (
                      <a
                        className="btn btn-secondary success-btn"
                        href={marketplaceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => markCheck(2)}
                      >
                        Install from Marketplace
                      </a>
                    ) : null}
                  </div>
                  <span className="success-check-box" aria-hidden="true">
                    <input
                      type="checkbox"
                      checked={checks[1]}
                      onChange={() => markCheck(2)}
                      aria-label="Mark step 2 done"
                    />
                  </span>
                </li>
                <li className={checks[2] ? "is-done" : undefined}>
                  <span className="success-check-num mono" aria-hidden="true">
                    {checks[2] ? "ok" : "03"}
                  </span>
                  <div className="success-check-body">
                    <p className="success-check-title">
                      Paste your key and connect a source
                    </p>
                    <p className="muted success-check-copy">
                      In the sidebar, paste the key into License key. Then add a
                      Stripe restricted key, a Lemon Squeezy, Polar or Gumroad key,
                      or choose Import CSV… from the menu. Press Save and the first
                      backfill starts.
                    </p>
                    <Link
                      className="btn btn-secondary success-btn"
                      href="/docs/api-keys"
                      onClick={() => markCheck(3)}
                    >
                      Where to find each API key
                    </Link>
                  </div>
                  <span className="success-check-box" aria-hidden="true">
                    <input
                      type="checkbox"
                      checked={checks[2]}
                      onChange={() => markCheck(3)}
                      aria-label="Mark step 3 done"
                    />
                  </span>
                </li>
              </ol>
            </div>

            <aside className="success-aside">
              <p className="eyebrow">What happens next</p>
              <div className="success-next-list">
                <div>
                  <h2 className="success-next-title">First backfill</h2>
                  <p className="muted">
                    Starts when you connect a source and pulls your full order
                    history. Small stores finish in minutes. Large histories keep
                    going on each sync until they’re complete; the Dashboard shows
                    progress.
                  </p>
                </div>
                <div>
                  <h2 className="success-next-title">Sync schedule</h2>
                  <p className="muted">
                    Turn on scheduled refresh in the sidebar. Choose hourly, every
                    6 hours, daily or weekly. Hourly is the default.
                  </p>
                </div>
                <div>
                  <h2 className="success-next-title">Receipt and refunds</h2>
                  <p className="muted">{REFUND_LINE_ASIDE}</p>
                </div>
              </div>
              <p className="success-support muted">
                Stuck on a step?{" "}
                {supportMail ? (
                  <>
                    Email <a href={supportHref}>{supportLabel}</a>
                  </>
                ) : (
                  <>
                    Contact <Link href="/support">Support</Link>
                  </>
                )}{" "}
                or read <Link href="/docs">Docs</Link>. Send the last 4 characters
                of your key, never the full key.
              </p>
            </aside>
          </div>
        ) : null}

        {ui === "notfound" ? (
          <div className="success-grid success-state" key="notfound">
            <div className="success-primary">
              <p className="eyebrow">Checkout link</p>
              <h1 className="success-h1" ref={h1Ref} tabIndex={-1}>
                We can’t find
                <br />
                that checkout.
              </h1>
              <p className="success-lede muted">
                {timeoutLede
                  ? "This is taking longer than usual."
                  : "This link is missing its session or has expired. If Stripe sent you a receipt, your payment went through and your key exists."}
              </p>
              <div className="success-key-card">
                <div className="success-key-card-head">
                  <span>Get your key</span>
                </div>
                <p className="muted success-check-copy">
                  Email support from the address on your receipt and we’ll send the
                  key there. Include the receipt number.
                </p>
                <div className="success-key-actions">
                  <a
                    className="btn btn-primary success-btn"
                    href={
                      supportMailto(
                        `${brand.name} license key`,
                      ) || "/support"
                    }
                  >
                    Email support
                  </a>
                  <Link className="btn btn-secondary success-btn" href="/pricing">
                    Back to pricing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {ui === "error" ? (
          <div className="success-grid success-state" key="error">
            <div className="success-primary">
              <p className="eyebrow">Couldn’t load</p>
              <h1 className="success-h1" ref={h1Ref} tabIndex={-1}>
                Your key didn’t load.
              </h1>
              <p className="success-lede muted">
                We couldn’t reach our license server. Nothing is lost: if Stripe
                sent a receipt, your payment and key are saved.
              </p>
              <div className="success-key-card is-danger">
                <div className="success-key-card-head">
                  <span>Try again in a moment</span>
                </div>
                <p className="mono muted success-check-copy">
                  Error: lookup failed ({httpStatus ?? "-"}). Reference{" "}
                  {sessionId
                    ? `${sessionId.slice(0, 8)}...${sessionId.slice(-4)}`
                    : "-"}
                </p>
                <div className="success-key-actions">
                  <button
                    type="button"
                    className="btn btn-primary success-btn"
                    onClick={() => setRetryNonce((n) => n + 1)}
                  >
                    Try again
                  </button>
                  <a
                    className="btn btn-secondary success-btn"
                    href={
                      supportMailto(
                        `${brand.name} license lookup`,
                      ) || "/support"
                    }
                  >
                    Email support
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SuccessClient() {
  return (
    <Suspense
      fallback={
        <div className="success-shell">
          <SuccessHeader />
          <div className="success-main">
            <p className="muted">Loading…</p>
          </div>
        </div>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}

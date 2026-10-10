"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

type ChecklistStep = {
  storageStep: 1 | 2 | 3;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
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

function intervalLabel() {
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

function UiChip({ children }: { children: ReactNode }) {
  return <code className="ui-chip">{children}</code>;
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

function readChecks(sessionId: string | null): [boolean, boolean, boolean] {
  if (!sessionId || typeof window === "undefined") {
    return [false, false, false];
  }
  return [
    localStorage.getItem(storageKey(sessionId, 1)) === "1",
    localStorage.getItem(storageKey(sessionId, 2)) === "1",
    localStorage.getItem(storageKey(sessionId, 3)) === "1",
  ];
}

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const keyBoxRef = useRef<HTMLDivElement>(null);
  const liveId = useId();
  const startedAt = useRef<number | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [ui, setUi] = useState<UiState>(() =>
    sessionId ? "loading" : "notfound",
  );
  const [data, setData] = useState<SessionPayload | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [slow, setSlow] = useState(false);
  const [timeoutLede, setTimeoutLede] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [checks, setChecks] = useState<[boolean, boolean, boolean]>(() =>
    readChecks(sessionId),
  );
  const prevUi = useRef<UiState | null>(null);

  const templateUrl = templateCopyUrl();
  const marketplaceUrl = marketplaceUrlClient();
  const supportMail = supportEmail();
  const supportHref = supportMailto() || "/support";
  const supportLabel = supportMail || "Support";

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

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let pollId: number | null = null;
    let settled = false;
    let slowArmed = false;
    startedAt.current = Date.now();

    const stop = () => {
      if (pollId != null) {
        window.clearInterval(pollId);
        pollId = null;
      }
    };

    const tick = async () => {
      if (cancelled || settled) return;
      const start = startedAt.current ?? Date.now();
      const elapsed = Date.now() - start;
      if (elapsed >= GIVE_UP_MS) {
        settled = true;
        stop();
        setTimeoutLede(true);
        setUi("notfound");
        return;
      }
      if (!slowArmed && elapsed >= SLOW_MS) {
        slowArmed = true;
        setSlow(true);
      }

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
  const interval = license ? intervalLabel() : "monthly";
  const email = data?.email || "your inbox";
  const price = license ? monthlyPrice(license.tier) : "";

  const checklist: ChecklistStep[] = [];
  if (templateUrl) {
    checklist.push({
      storageStep: 1,
      title: "Copy the template Sheet",
      body: (
        <>
          Opens Google Sheets and saves a copy to your Drive. Tabs and the dashboard are already
          laid out.
        </>
      ),
      action: (
        <a
          className="btn btn-primary success-btn"
          href={templateUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => markCheck(1)}
        >
          Make a copy
        </a>
      ),
    });
  }
  checklist.push({
    storageStep: 2,
    title: "Open the add-on",
    body: (
      <>
        In your copy, choose <UiChip>Extensions</UiChip> › <UiChip>{brand.name}</UiChip> ›{" "}
        <UiChip>Open sidebar</UiChip>.
      </>
    ),
    action: marketplaceUrl ? (
      <a
        className="btn btn-secondary success-btn"
        href={marketplaceUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => markCheck(2)}
      >
        Install from Marketplace
      </a>
    ) : null,
  });
  checklist.push({
    storageStep: 3,
    title: "Paste your key and connect a source",
    body: (
      <>
        In the sidebar, paste the key into <UiChip>License key</UiChip>. Then add a Stripe
        restricted key, a Lemon Squeezy, Polar or Gumroad key, or choose{" "}
        <UiChip>Import CSV…</UiChip> from the menu. Press <UiChip>Save</UiChip> and the first
        backfill starts.
      </>
    ),
    action: (
      <Link
        className="btn btn-secondary success-btn"
        href="/docs/api-keys"
        onClick={() => markCheck(3)}
      >
        Where to find each API key
      </Link>
    ),
  });

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
                Your receipt went to {email}.{" "}
                {checklist.length === 3
                  ? "Three steps and your revenue is in a sheet you own."
                  : "Two steps and your revenue is in a sheet you own."}
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
                    className="btn btn-primary success-btn success-copy-btn"
                    onClick={() => {
                      void copyKey(license.key);
                      markCheck(3);
                    }}
                  >
                    <span className="success-copy-label">
                      <span className={copied ? undefined : "is-on"}>Copy key</span>
                      <span className={copied ? "is-on" : undefined}>Copied</span>
                    </span>
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
                {checklist.map((step, index) => {
                  const num = String(index + 1).padStart(2, "0");
                  const done = checks[step.storageStep - 1]!;
                  return (
                    <li key={step.storageStep} className={done ? "is-done" : undefined}>
                      <span className="success-check-num mono" aria-hidden="true">
                        {num}
                      </span>
                      <div className="success-check-body">
                        <h3 className="success-check-title">{step.title}</h3>
                        {step.body ? (
                          <p className="muted success-check-copy">{step.body}</p>
                        ) : null}
                        {step.action}
                      </div>
                      <label className="success-check-box">
                        <input
                          type="checkbox"
                          className="visually-hidden"
                          checked={done}
                          onChange={() => markCheck(step.storageStep)}
                          aria-label={`Mark step ${num} done`}
                        />
                        <span className="success-check-face" />
                      </label>
                    </li>
                  );
                })}
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
                    onClick={() => {
                      setSlow(false);
                      setTimeoutLede(false);
                      setUi("loading");
                      setRetryNonce((n) => n + 1);
                    }}
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

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { brand } from "@/lib/brand";

type SessionPayload = {
  status?: string | null;
  email?: string | null;
  license?: { key: string; tier: string; interval: string } | null;
  message?: string;
  error?: string;
};

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [data, setData] = useState<SessionPayload | null>(
    sessionId
      ? null
      : { message: "Open this page from Stripe Checkout to see your license key." },
  );

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    const load = async () => {
      const res = await fetch(
        `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`,
      );
      const json = (await res.json()) as SessionPayload;
      if (!cancelled) setData(json);
    };
    void load();
    const t = window.setInterval(load, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [sessionId]);

  return (
    <div className="success-box">
      <p className="eyebrow">Checkout</p>
      <h1 className="h2">You are in.</h1>
      <p className="muted">
        Paste the license key into the {brand.name} add-on sidebar under Settings. Keep it private
        — it unlocks your paid tier.
      </p>
      {data?.error ? <p className="muted">Error: {data.error}</p> : null}
      {data?.message && !data.license ? <p className="muted">{data.message}</p> : null}
      {data?.license ? (
        <>
          <p className="mono muted">
            Tier: {data.license.tier} · {data.license.interval}
          </p>
          <code className="license-key">{data.license.key}</code>
        </>
      ) : sessionId ? (
        <p className="mono muted">Waiting for webhook to issue the key…</p>
      ) : null}
      <Link className="btn btn-primary" href="/">
        Back to home
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="container">
      <Suspense fallback={<div className="success-box muted">Loading…</div>}>
        <SuccessInner />
      </Suspense>
    </main>
  );
}

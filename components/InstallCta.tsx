"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { marketplaceUrlClient } from "@/lib/marketplace-client";

type Props = {
  children: string;
  className?: string;
  source?: string;
};

/**
 * Marketplace install / paid-plan CTA.
 * Links straight to the listing when NEXT_PUBLIC_MARKETPLACE_URL (or INSTALL_URL) is set;
 * otherwise opens a launch-invite email capture.
 */
export function InstallCta({ children, className, source = "install" }: Props) {
  const listing = marketplaceUrlClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    queueMicrotask(() => inputRef.current?.focus());
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (listing) {
    return (
      <a className={className} href={listing}>
        {children}
      </a>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus("submitting");
    setMessage(null);
    try {
      const res = await fetch("/api/launch-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          company: data.get("company"),
          source,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; created?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setStatus("error");
        setMessage(json.error || "Could not save your email. Try again.");
        return;
      }
      setStatus("done");
      setMessage(
        json.created
          ? "You're on the list. We'll email you when the Workspace listing and paid plans open."
          : "You're already on the list — we'll email you at launch.",
      );
    } catch {
      setStatus("error");
      setMessage("Network error. Try again in a moment.");
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? (
        <div
          className="invite-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="invite-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            {status === "done" ? (
              <div className="invite-confirm">
                <p className="eyebrow">You're in</p>
                <h2 id={titleId} className="h3">
                  Thanks — we'll ping you at launch.
                </h2>
                <p className="muted">{message}</p>
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
            ) : (
              <form className="invite-form" onSubmit={onSubmit}>
                <p className="eyebrow">Launch invite</p>
                <h2 id={titleId} className="h3">
                  Get emailed when install opens
                </h2>
                <p className="muted">
                  The Workspace Marketplace listing isn't live yet. Leave your email and we'll
                  notify you when you can install — no spam, one launch note.
                </p>
                <label className="invite-label" htmlFor={`${titleId}-email`}>
                  Email
                </label>
                <input
                  ref={inputRef}
                  id={`${titleId}-email`}
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={254}
                  disabled={status === "submitting"}
                />
                <div className="support-hp" aria-hidden="true">
                  <label htmlFor={`${titleId}-company`}>Company</label>
                  <input
                    id={`${titleId}-company`}
                    name="company"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                {status === "error" && message ? (
                  <p className="support-error" role="alert">
                    {message}
                  </p>
                ) : null}
                <div className="invite-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={status === "submitting"}
                  >
                    {status === "submitting" ? "Saving…" : "Notify me"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

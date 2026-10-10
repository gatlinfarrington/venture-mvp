"use client";

import { useState, type FormEvent } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "success"; id: string };

export function SupportForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ kind: "submitting" });

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          subject: data.get("subject"),
          message: data.get("message"),
          company: data.get("company"),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !json.ok || !json.id) {
        setStatus({
          kind: "error",
          message: json.error || "Something went wrong. Try again in a moment.",
        });
        return;
      }
      form.reset();
      setStatus({ kind: "success", id: json.id });
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Check your connection and try again.",
      });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="support-confirm" role="status">
        <p className="eyebrow">Received</p>
        <h2 className="h3">Thanks — we got your message.</h2>
        <p className="muted">
          Reference <code className="mono">{status.id}</code>. We read every submission and will
          reply to the email you provided.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setStatus({ kind: "idle" })}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="support-form" onSubmit={onSubmit} noValidate>
      <div className="support-field">
        <label htmlFor="support-name">Name</label>
        <input
          id="support-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          disabled={status.kind === "submitting"}
        />
      </div>
      <div className="support-field">
        <label htmlFor="support-email">Email</label>
        <input
          id="support-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          disabled={status.kind === "submitting"}
        />
      </div>
      <div className="support-field">
        <label htmlFor="support-subject">Subject</label>
        <input
          id="support-subject"
          name="subject"
          type="text"
          required
          maxLength={160}
          disabled={status.kind === "submitting"}
        />
      </div>
      <div className="support-field">
        <label htmlFor="support-message">Message</label>
        <textarea
          id="support-message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={7}
          disabled={status.kind === "submitting"}
        />
      </div>
      {/* Honeypot */}
      <div className="support-hp" aria-hidden="true">
        <label htmlFor="support-company">Company</label>
        <input id="support-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {status.kind === "error" ? (
        <p className="support-error" role="alert">
          {status.message}
        </p>
      ) : null}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status.kind === "submitting"}
      >
        {status.kind === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

const STORAGE_KEY = "rs_invite";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_HINT = "One email when the Marketplace listing goes live. Nothing else.";

type Status = "idle" | "submitting" | "success" | "duplicate" | "invalid" | "server";

type Props = {
  source?: string;
  /** Optional override; default is the approved one-email hint. */
  hint?: string;
  className?: string;
  id?: string;
};

function readStoredEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.localStorage.getItem(STORAGE_KEY) !== "1") return null;
    return window.localStorage.getItem(`${STORAGE_KEY}_email`);
  } catch {
    return null;
  }
}

function persistSuccess(email: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
    window.localStorage.setItem(`${STORAGE_KEY}_email`, email);
  } catch {
    /* ignore quota / private mode */
  }
}

export function LaunchInvite({
  source = "launch",
  hint = DEFAULT_HINT,
  className,
  id,
}: Props) {
  const reactId = useId();
  const inputId = `${reactId}-email`;
  const statusRef = useRef<HTMLParagraphElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const [email, setEmail] = useState(() => readStoredEmail() ?? "");
  const [status, setStatus] = useState<Status>(() =>
    readStoredEmail() ? "success" : "idle",
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (status === "success" || status === "duplicate") {
      statusRef.current?.focus();
    } else if (status === "invalid" || status === "server") {
      alertRef.current?.focus();
    }
  }, [status]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus("invalid");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/launch-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          company: "",
          source,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        created?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setStatus("server");
        return;
      }
      persistSuccess(trimmed);
      setEmail(trimmed);
      setStatus(json.created === false ? "duplicate" : "success");
    } catch {
      setStatus("server");
    }
  }

  if (status === "success" || status === "duplicate") {
    const lead =
      status === "duplicate" ? "You’re already on the list." : "You’re on the list.";
    const trail =
      status === "duplicate"
        ? `We’ll email ${email} at launch.`
        : `We’ll email ${email} once, at launch.`;
    return (
      <div className={`launch-invite-wrap${className ? ` ${className}` : ""}`} id={id}>
        <p
          ref={statusRef}
          className="launch-invite-success"
          role="status"
          tabIndex={-1}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="9" fill="none" stroke="#0A7A55" strokeWidth="1.5" />
            <path
              d="M6 10.2l2.6 2.6L14 7.4"
              fill="none"
              stroke="#0A7A55"
              strokeWidth="1.6"
            />
          </svg>
          <span>
            <strong>{lead}</strong> {trail}
          </span>
        </p>
      </div>
    );
  }

  const isError = status === "invalid" || status === "server";
  const isSubmitting = status === "submitting";
  const hintText =
    status === "invalid"
      ? "Enter a full email address, like name@domain.com."
      : status === "server"
        ? "Couldn’t save that just now. Try again in a minute."
        : hint;
  const buttonLabel = isSubmitting
    ? "Joining…"
    : status === "server"
      ? "Try again"
      : "Join the launch list";

  return (
    <div className={`launch-invite-wrap${className ? ` ${className}` : ""}`} id={id}>
      <form
        className={`launch-invite${focused ? " is-focus" : ""}${isError ? " is-error" : ""}${
          isSubmitting ? " is-submitting" : ""
        }`}
        onSubmit={onSubmit}
        noValidate
      >
        <label className="visually-hidden" htmlFor={inputId}>
          Email address
        </label>
        <input
          id={inputId}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@yourstore.com"
          value={email}
          disabled={isSubmitting}
          aria-invalid={status === "invalid" ? true : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "invalid" || status === "server") setStatus("idle");
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <div className="support-hp" aria-hidden="true">
          <label htmlFor={`${reactId}-company`}>Company</label>
          <input
            id={`${reactId}-company`}
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          aria-busy={isSubmitting || undefined}
          disabled={isSubmitting}
        >
          {buttonLabel}
        </button>
      </form>
      <p
        ref={isError ? alertRef : undefined}
        className={`launch-invite-hint${isError ? " is-error" : ""}`}
        role={isError ? "alert" : undefined}
        tabIndex={isError ? -1 : undefined}
      >
        {hintText}
      </p>
    </div>
  );
}

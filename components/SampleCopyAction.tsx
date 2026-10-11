"use client";

import { useEffect, useRef, useState } from "react";
import { templateCopyUrl } from "@/lib/brand";

type Props = {
  source: string;
};

export function SampleCopyAction({ source }: Props) {
  const tipId = "sample-copy-tip";
  const href = templateCopyUrl();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (href) {
    const url = href.includes("?")
      ? `${href}&utm_source=${source}`
      : `${href}?utm_source=${source}`;
    return (
      <a className="btn btn-primary sample-copy-enabled" href={url} target="_blank" rel="noopener noreferrer">
        Make a copy
      </a>
    );
  }

  return (
    <div
      className="sample-copy-wrap"
      ref={wrapRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="sample-copy-btn"
        aria-disabled="true"
        aria-describedby={tipId}
        onClick={(e) => {
          e.preventDefault();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
      >
        Make a copy
      </button>
      <span
        role="tooltip"
        id={tipId}
        className={`sample-copy-tip${open ? " is-open" : ""}`}
      >
        Opens once sharing is approved
      </span>
    </div>
  );
}

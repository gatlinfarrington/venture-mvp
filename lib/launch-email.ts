import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "@/lib/brand";

/**
 * Helpers for launch-list email sends (Resend or similar).
 * Every outbound launch email must include a one-click unsubscribe URL
 * and a List-Unsubscribe (+ List-Unsubscribe-Post) header.
 */

function unsubSecret(): string {
  return (
    process.env.LAUNCH_UNSUB_SECRET?.trim() ||
    process.env.LICENSE_API_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    "dev-launch-unsub"
  );
}

export function launchUnsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHmac("sha256", unsubSecret()).update(normalized).digest("base64url");
}

export function verifyLaunchUnsubscribeToken(email: string, token: string): boolean {
  const expected = launchUnsubscribeToken(email);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function launchUnsubscribeUrl(email: string): string {
  const token = launchUnsubscribeToken(email);
  const url = new URL("/api/launch-invite/unsubscribe", siteUrl());
  url.searchParams.set("email", email.trim().toLowerCase());
  url.searchParams.set("token", token);
  return url.toString();
}

/** Headers required on every launch-list email. */
export function launchListUnsubscribeHeaders(email: string): Record<string, string> {
  const href = launchUnsubscribeUrl(email);
  return {
    "List-Unsubscribe": `<${href}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Short footer line + one-click link for the HTML/text body. */
export function launchUnsubscribeFooter(email: string): string {
  return `Unsubscribe in one click: ${launchUnsubscribeUrl(email)}`;
}

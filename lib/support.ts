/** Public support inbox — only shown when SUPPORT_EMAIL is set (domain may not exist yet). */
export function supportEmail(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    "";
  return raw.length > 0 ? raw : null;
}

export function supportMailto(subject?: string): string | null {
  const email = supportEmail();
  if (!email) return null;
  if (!subject) return `mailto:${email}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

/** Privacy contact — optional until PRIVACY_EMAIL is set. */
export function privacyEmail(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() ||
    process.env.PRIVACY_EMAIL?.trim() ||
    "";
  return raw.length > 0 ? raw : null;
}

/** Public support inbox — only shown when SUPPORT_EMAIL is set (domain may not exist yet). */
export function supportEmail(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    "";
  return raw.length > 0 ? raw : null;
}

export function supportMailto(): string | null {
  const email = supportEmail();
  return email ? `mailto:${email}` : null;
}

/** Privacy contact — optional until PRIVACY_EMAIL is set. */
export function privacyEmail(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() ||
    process.env.PRIVACY_EMAIL?.trim() ||
    "";
  return raw.length > 0 ? raw : null;
}

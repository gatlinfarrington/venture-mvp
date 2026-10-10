/** @deprecated Prefer the /support form — kept for optional inbox display when set. */
export function supportEmail(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    "";
  return raw.length > 0 ? raw : null;
}

/** @deprecated Support contact is the /support form — no dead mailto links. */
export function supportMailto(): string | null {
  return null;
}

/** Privacy contact — optional until PRIVACY_EMAIL is set. */
export function privacyEmail(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() ||
    process.env.PRIVACY_EMAIL?.trim() ||
    "";
  return raw.length > 0 ? raw : null;
}

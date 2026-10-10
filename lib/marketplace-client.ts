/** Client-safe marketplace URL (NEXT_PUBLIC_* only). Sync with marketplaceUrl() in brand.ts. */
export function marketplaceUrlClient(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_MARKETPLACE_URL?.trim() ||
    process.env.NEXT_PUBLIC_INSTALL_URL?.trim() ||
    "";
  return raw.length > 0 ? raw : null;
}

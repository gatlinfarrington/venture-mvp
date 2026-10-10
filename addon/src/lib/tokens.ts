/** Brand tokens mirrored from design/tokens.json / SHEET-STYLE.md (launch v2). */
export const COLORS = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surface2: "#F2F2F2",
  ink: "#0D0D0D",
  inkMuted: "#5C5C5C",
  inkInverse: "#FFFFFF",
  border: "#8C8C8C",
  hairline: "#E6E6E6",
  /** Meaning only: positive deltas + Synced — never chart series. */
  signal: "#0A7A55",
  signalTint: "#E7F3EE",
  danger: "#B42318",
  dangerTint: "#FBEAE8",
  settingsTab: "#8C8C8C",
} as const;

export const FONTS = {
  sans: "Inter Tight",
  mono: "JetBrains Mono",
} as const;

/**
 * Launch v2 chart series (greyscale). Green is reserved for meaning.
 * Lemon Squeezy → Polar → Gumroad → 4th+
 */
export const CHART_SERIES = [COLORS.ink, COLORS.inkMuted, COLORS.border, "#B5B5B5"] as const;

export const SOURCE_COLORS: Record<string, string> = {
  lemon_squeezy: COLORS.ink,
  polar: COLORS.inkMuted,
  gumroad: COLORS.border,
};

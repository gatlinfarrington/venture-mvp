/** Brand tokens mirrored from design/tokens.json / SHEET-STYLE.md */
export const COLORS = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surface2: "#F2F2F2",
  ink: "#0D0D0D",
  inkMuted: "#5C5C5C",
  inkInverse: "#FFFFFF",
  border: "#8C8C8C",
  hairline: "#E6E6E6",
  signal: "#0A7A55",
  signalTint: "#E7F3EE",
  danger: "#B42318",
  dangerTint: "#FBEAE8",
  series3: "#7A7A7A",
  darkBg: "#0A0A0B",
  darkInk: "#F4F4F5",
  signalOnDark: "#3FBF8C",
  settingsTab: "#8C8C8C",
} as const;

export const FONTS = {
  sans: "Inter Tight",
  mono: "JetBrains Mono",
} as const;

export const CHART_SERIES = [COLORS.ink, COLORS.signal, COLORS.series3, "#B5B5B5"] as const;

export const SOURCE_COLORS: Record<string, string> = {
  lemon_squeezy: COLORS.ink,
  polar: COLORS.signal,
  gumroad: COLORS.series3,
};

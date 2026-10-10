/** @type {import('stylelint').Config} */
/**
 * Monolith / LANDING.md A1–A18 CSS gates.
 * Explicit exceptions: same-line or previous-line `design-exception: <rule>`.
 * Companion: scripts/design-check.mjs (contrast, emoji, glow shadows, raw colors).
 */
const exception = String.raw`design-exception:`;

const config = {
  extends: ["stylelint-config-standard"],
  ignoreFiles: [
    "design/tokens.css",
    "design/**",
    "addon/**",
    "node_modules/**",
    ".next/**",
    "public/**",
  ],
  rules: {
    // Prefer project tokens over opinionated standard defaults.
    "custom-property-pattern": null,
    "selector-class-pattern": null,
    "keyframes-name-pattern": null,
    "color-hex-length": null,
    "alpha-value-notation": null,
    "color-function-notation": null,
    "declaration-block-no-redundant-longhand-properties": null,
    "no-descending-specificity": null,
    "media-feature-range-notation": null,
    "import-notation": null,
    "value-keyword-case": null,
    "comment-empty-line-before": null,
    "rule-empty-line-before": null,

    // A1 — no gradients / glow gradients
    "function-disallowed-list": [
      [
        "linear-gradient",
        "radial-gradient",
        "conic-gradient",
        "repeating-linear-gradient",
        "repeating-radial-gradient",
      ],
      {
        message:
          "A1: gradients are disallowed outside tokens (add design-exception if intentional)",
      },
    ],

    // Hex only belongs in tokens.css (ignored above)
    "color-no-hex": [
      true,
      {
        message: "Use a CSS variable from design/tokens.css (A1/token discipline)",
        severity: "error",
      },
    ],
    "function-no-unknown": null,

    // Spacing / type / dark-page gates (arrays of disallowed value patterns)
    "declaration-property-value-disallowed-list": {
      "/.*/": ["/\\b(?:rgb|rgba|hsl|hsla)\\s*\\(/i"],
      "/^(margin|margin-block|margin-inline|margin-top|margin-right|margin-bottom|margin-left|padding|padding-block|padding-inline|padding-top|padding-right|padding-bottom|padding-left|gap|row-gap|column-gap|top|right|bottom|left|inset)$/":
        ["/[1-9][0-9]*(\\.[0-9]+)?px/"],
      "/^font-size$/": ["/[0-9]+(\\.[0-9]+)?px/"],
      "/^background(-color)?$/": ["/#0[aA]0[aA]0[bB]/"],
    },
  },
};

export default config;
export const DESIGN_EXCEPTION_MARKER = exception;

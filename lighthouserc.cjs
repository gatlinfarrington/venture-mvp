const baseURL =
  process.env.BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "https://venture-mvp.vercel.app";

/** Key marketing pages — must score ≥95 on all Lighthouse categories. */
const routes = ["/", "/pricing", "/docs", "/privacy"];

module.exports = {
  ci: {
    collect: {
      url: routes.map((r) => `${baseURL.replace(/\/$/, "")}${r}`),
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
      },
    },
    assert: {
      assertionMethod: "median",
      assertions: {
        "categories:performance": ["error", { minScore: 0.95 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lhci-report",
    },
  },
};

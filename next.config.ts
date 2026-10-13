import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      {
        source: "/gumroad-to-google-sheets",
        destination: "/gumroad-analytics-google-sheets",
        permanent: true,
      },
      {
        source: "/polar-to-google-sheets",
        destination: "/polar-analytics",
        permanent: true,
      },
      {
        source: "/lemon-squeezy-to-google-sheets",
        destination: "/lemon-squeezy-analytics",
        permanent: true,
      },
      {
        source: "/mrr-spreadsheet-template",
        destination: "/docs",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // Legacy share / crawler path; keep /og.png returning the generated home OG.
    return [{ source: "/og.png", destination: "/opengraph-image" }];
  },
};

export default nextConfig;

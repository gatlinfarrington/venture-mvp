import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    absolute: `Page not found · ${brand.name}`,
  },
  robots: { index: false, follow: false },
  openGraph: {
    title: `Page not found · ${brand.name}`,
    images: [{ url: "/opengraph-image" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Page not found · ${brand.name}`,
    images: ["/opengraph-image"],
  },
};

export default function NotFound() {
  return (
    <main className="not-found container">
      <div className="not-found-copy">
        <p className="eyebrow">404</p>
        <h1>This page isn&apos;t in the sheet.</h1>
        <p className="body-lg muted not-found-lede">The link may be old or mistyped.</p>
        <div className="not-found-ctas">
          <Link className="btn btn-primary" href="/">
            Back to home
          </Link>
          <Link className="btn btn-secondary" href="/docs">
            Read the docs
          </Link>
        </div>
      </div>
    </main>
  );
}

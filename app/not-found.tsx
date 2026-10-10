import Link from "next/link";
import { brand } from "@/lib/brand";

export default function NotFound() {
  return (
    <main className="not-found container">
      {/* App Router does not accept metadata exports on not-found; hoist for crawlers. */}
      <title>{`Page not found · ${brand.name}`}</title>
      <meta name="robots" content="noindex" />
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

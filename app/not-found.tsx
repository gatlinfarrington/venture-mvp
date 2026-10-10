import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found container">
      {/* App Router does not accept metadata exports on not-found; hoist for crawlers. */}
      <meta name="robots" content="noindex" />
      <div className="not-found-grid">
        <div className="not-found-copy">
          <p className="eyebrow">404 · Page not found</p>
          <h1>This cell is empty.</h1>
          <p className="body-lg muted not-found-lede">
            The page you asked for doesn&apos;t exist or has moved. Check the address, or pick up
            from one of these.
          </p>
          <div className="not-found-ctas">
            <Link className="btn btn-primary" href="/">
              Go to the homepage
            </Link>
            <Link className="btn btn-secondary" href="/docs">
              Read the docs
            </Link>
          </div>
          <nav className="not-found-links" aria-label="Helpful links">
            <Link href="/pricing">
              Pricing <span aria-hidden="true">→</span>
            </Link>
            <Link href="/#how-it-works">
              How it works <span aria-hidden="true">→</span>
            </Link>
            <Link href="/support">
              Support <span aria-hidden="true">→</span>
            </Link>
          </nav>
        </div>

        <div className="not-found-illus" aria-hidden="true">
          <div className="not-found-sheet">
            <div className="not-found-fx">
              <b className="mono">C4</b>
              <span className="mono muted">=VLOOKUP(page, site, 1, FALSE)</span>
            </div>
            <div className="not-found-table">
              <div className="nf-h" />
              <div className="nf-h">A</div>
              <div className="nf-h">B</div>
              <div className="nf-h">C</div>
              <div className="nf-h nf-wide">D</div>
              <div className="nf-h nf-wide">E</div>

              <div className="nf-h">1</div>
              <div className="nf-t">/</div>
              <div className="nf-t">/pricing</div>
              <div className="nf-t">/docs</div>
              <div className="nf-t nf-wide">/support</div>
              <div className="nf-t nf-wide">/changelog</div>

              <div className="nf-h">2</div>
              <div className="nf-v">200</div>
              <div className="nf-v">200</div>
              <div className="nf-v">200</div>
              <div className="nf-v nf-wide">200</div>
              <div className="nf-v nf-wide">200</div>

              <div className="nf-h">3</div>
              <div />
              <div />
              <div />
              <div className="nf-wide" />
              <div className="nf-wide" />

              <div className="nf-h">4</div>
              <div />
              <div />
              <div className="nf-sel">#N/A</div>
              <div className="nf-wide" />
              <div className="nf-wide" />

              <div className="nf-h">5</div>
              <div />
              <div />
              <div />
              <div className="nf-wide" />
              <div className="nf-wide" />
            </div>
          </div>
          <p className="mono muted not-found-cap">No match for this URL.</p>
        </div>
      </div>
    </main>
  );
}

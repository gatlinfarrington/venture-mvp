import type { Metadata } from "next";
import { MdxContent } from "@/components/MdxContent";
import { brand } from "@/lib/brand";
import { getChangelogEntries } from "@/lib/content/changelog";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Changelog",
  description: `What shipped in ${brand.name} — product, docs, and design notes.`,
  alternates: { canonical: `${siteConfig.url}/changelog` },
  openGraph: {
    title: `Changelog · ${brand.name}`,
    description: `What shipped in ${brand.name}.`,
    url: `${siteConfig.url}/changelog`,
  },
};

export default function ChangelogPage() {
  const entries = getChangelogEntries();

  return (
    <main className="legal container">
      <p className="eyebrow">Product</p>
      <h1>Changelog</h1>
      <p className="body-lg muted" style={{ maxWidth: "62ch", marginBottom: "var(--space-10)" }}>
        Release notes for the marketing site, license API, and Sheets add-on. Authored in{" "}
        <code className="mono">content/changelog</code>. Dates are UTC.
      </p>
      <ol className="changelog-list">
        {entries.map((entry) => (
          <li key={entry.slug} className="changelog-item">
            <time className="mono muted" dateTime={entry.date}>
              {entry.date}
            </time>
            <div>
              <h2>{entry.title}</h2>
              <div className="prose changelog-body">
                <MdxContent source={entry.body} />
              </div>
              {entry.tags?.length ? (
                <ul className="changelog-tags">
                  {entry.tags.map((tag) => (
                    <li key={tag} className="mono">
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}

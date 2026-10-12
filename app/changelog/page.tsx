import type { Metadata } from "next";
import { LaunchInvite } from "@/components/LaunchInvite";
import { MdxContent } from "@/components/MdxContent";
import { brand } from "@/lib/brand";
import { getChangelogEntries } from "@/lib/content/changelog";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Changelog",
  description: `What shipped in ${brand.name}: product, docs, and design notes.`,
  alternates: { canonical: `${siteConfig.url}/changelog` },
  openGraph: {
    title: `Changelog · ${brand.name}`,
    description: `What shipped in ${brand.name}.`,
    url: `${siteConfig.url}/changelog`,
  },
};

function monthKey(date: string): string {
  return date.slice(0, 7);
}

export default function ChangelogPage() {
  const entries = getChangelogEntries();
  const byMonth = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = monthKey(entry.date);
    const list = byMonth.get(key) ?? [];
    list.push(entry);
    byMonth.set(key, list);
  }

  return (
    <main className="legal container page-shell">
      <p className="eyebrow">Product</p>
      <h1>Changelog</h1>
      <p className="body-lg muted page-lede">
        What&apos;s new in {brand.name}: the add-on, the site, and billing.
      </p>
      {[...byMonth.entries()].map(([month, monthEntries]) => (
        <section key={month} className="changelog-month">
          <h2 className="mono changelog-month-label">{month}</h2>
          <ol className="changelog-list">
            {monthEntries.map((entry) => (
              <li key={entry.slug} className="changelog-item">
                <time className="mono muted" dateTime={entry.date}>
                  {entry.date}
                </time>
                <div>
                  <h3 className="changelog-title">{entry.title}</h3>
                  <div className="prose changelog-body">
                    <MdxContent source={entry.body} />
                  </div>
                  {entry.tags?.length ? (
                    <ul className="tag-pills">
                      {entry.tags.map((tag) => (
                        <li key={tag} className="chip chip-static">
                          {tag}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <aside className="blog-launch-rail">
        <h2 className="h3">Get the launch email</h2>
        <LaunchInvite source="changelog" />
      </aside>
    </main>
  );
}

import Link from "next/link";
import { InstallCta } from "@/components/InstallCta";
import { brand } from "@/lib/brand";
import type { CompareCell, ComparePage } from "@/lib/compare-pages";

function cellClass(value: CompareCell, side: "us" | "them"): string {
  if (value === true) return side === "us" ? "yes" : "yes-ink";
  if (value === false) return "no";
  return side === "us" ? "yes-ink" : "";
}

function cellText(value: CompareCell): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return value;
}

export function CompareMarketingPage({ page }: { page: ComparePage }) {
  return (
    <main className="seo-page container page-shell">
      <p className="eyebrow">Compare</p>
      <h1>{page.h1}</h1>
      <p className="body-lg muted page-lede">{page.lede}</p>

      <div className="compare-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th>Capability</th>
              <th>{brand.name}</th>
              <th>{page.competitor}</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row) => (
              <tr key={row.feature}>
                <td>{row.feature}</td>
                <td data-label={brand.name} className={cellClass(row.us, "us")}>
                  {cellText(row.us)}
                </td>
                <td data-label={page.competitor} className={cellClass(row.them, "them")}>
                  {cellText(row.them)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="prose" style={{ marginTop: "var(--space-10)" }}>
        {page.sections.map((section) => (
          <section key={section.h2}>
            <h2>{section.h2}</h2>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </section>
        ))}

        <h2>Sources</h2>
        <ul>
          {page.sources.map((source) => (
            <li key={source.href}>
              <a href={source.href} rel="noopener noreferrer" target="_blank">
                {source.label}
              </a>
              {": "}
              {source.note}
            </li>
          ))}
          <li>
            {brand.name} pricing: Free $0, Pro $9/mo, Business $19/mo, billed monthly. See{" "}
            <Link href="/pricing">/pricing</Link>.
          </li>
        </ul>
        <p className="mono muted">Sources checked {page.checkedOn}.</p>
        <p>
          <InstallCta className="btn btn-primary" source={`vs-${page.slug}`}>
            Join the launch list
          </InstallCta>
        </p>
      </div>
    </main>
  );
}

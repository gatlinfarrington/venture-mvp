import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSeoPage, seoPages } from "@/lib/seo-pages";
import { siteConfig } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return seoPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `${siteConfig.url}/${page.slug}` },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `${siteConfig.url}/${page.slug}`,
    },
  };
}

export default async function SeoMarketingPage({ params }: Props) {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) notFound();

  return (
    <main className="seo-page container">
      <p className="eyebrow">Guide</p>
      <h1>{page.h1}</h1>
      <p className="body-lg muted" style={{ maxWidth: "62ch", marginBottom: "var(--space-8)" }}>
        {page.lede}
      </p>
      <div className="prose">
        {page.sections.map((section) => (
          <section key={section.h2}>
            <h2>{section.h2}</h2>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
        <p>
          <a className="btn btn-primary" href={siteConfig.installUrl}>
            Install for Google Sheets
          </a>
        </p>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompareMarketingPage } from "@/components/CompareMarketingPage";
import { comparePages, getComparePage } from "@/lib/compare-pages";
import { siteConfig } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return comparePages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getComparePage(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `${siteConfig.url}${page.path}` },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `${siteConfig.url}${page.path}`,
    },
  };
}

export default async function VsCompetitorPage({ params }: Props) {
  const { slug } = await params;
  const page = getComparePage(slug);
  if (!page) notFound();
  return <CompareMarketingPage page={page} />;
}

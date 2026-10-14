import type { Metadata } from "next";
import Link from "next/link";
import { SampleCopyAction } from "@/components/SampleCopyAction";
import { SampleSheet } from "@/components/SampleSheet";
import { brand } from "@/lib/brand";
import { SAMPLE_CAPTION } from "@/lib/sample-data";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sample sheet",
  description:
    "The RevenueSheet template filled with example data: Dashboard, Orders and Subscriptions tabs.",
  alternates: { canonical: `${siteConfig.url}/sample` },
  openGraph: {
    title: `Sample sheet · ${brand.name}`,
    description:
      "The RevenueSheet template filled with example data: Dashboard, Orders and Subscriptions tabs.",
    url: `${siteConfig.url}/sample`,
  },
};

export default function SamplePage() {
  return (
    <main className="sample-page">
      <div className="container sample-page-intro">
        <p className="sample-eyebrow mono">Sample sheet</p>
        <h1 className="sample-h1">The sheet you get, filled in.</h1>
        <p className="sample-lede muted">
          This is the RevenueSheet template with example data: the Dashboard tab, plus every order
          and subscription in rows you can sort, filter and query. Same tabs and headers the add-on
          will write when it is available to install.
        </p>
        <div className="sample-actions">
          <SampleCopyAction source="sample-page" />
          <Link className="sample-how-link" href="/#how-it-works">
            How sync works
          </Link>
        </div>
      </div>

      <div className="container sample-stage">
        <SampleSheet />
        <p className="sample-caption mono muted">{SAMPLE_CAPTION}</p>
      </div>
    </main>
  );
}

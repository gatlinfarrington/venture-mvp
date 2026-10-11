import type { Metadata } from "next";
import Link from "next/link";
import { MakeACopySlot } from "@/components/MakeACopySlot";
import { SampleSheetPreview } from "@/components/SampleSheetPreview";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sample sheet",
  description: `A read-only example RevenueSheet with Dashboard, Orders, and Subscriptions tabs. Clearly labeled example data, not real customers.`,
  alternates: { canonical: `${siteConfig.url}/sample` },
  openGraph: {
    title: `Sample sheet · ${brand.name}`,
    description: `See Dashboard, Orders, and Subscriptions filled with example data (EX-104xx IDs).`,
    url: `${siteConfig.url}/sample`,
  },
};

export default function SamplePage() {
  return (
    <main className="sample-page page-shell">
      <div className="container sample-page-intro">
        <p className="eyebrow">Example sheet</p>
        <h1>Sample RevenueSheet</h1>
        <p className="body-lg muted page-lede">
          A faithful, read-only preview of the add-on sheet: Dashboard, Orders, and Subscriptions,
          filled with clearly labeled example rows (EX-104xx). No live store connection and no
          public Google template required.
        </p>
        <div className="sample-page-actions">
          <MakeACopySlot className="btn btn-secondary" source="sample-page" />
          <Link className="btn btn-primary" href="/#launch">
            Join the launch list
          </Link>
        </div>
        <p className="sample-copy-hint mono muted">
          Make a copy turns on when the template URL is published. Until then, explore the tabs
          below.
        </p>
      </div>

      <div className="sample-page-stage">
        <div className="container sample-page-stage-inner">
          <SampleSheetPreview />
        </div>
      </div>

      <div className="container sample-page-foot">
        <p className="muted">
          Named ranges in a real sheet:{" "}
          <span className="mono">rs_orders</span>, <span className="mono">rs_subs</span>,{" "}
          <span className="mono">rs_customers</span>, <span className="mono">rs_mrr_monthly</span>.
          See <Link href="/pricing">pricing</Link> or the{" "}
          <Link href="/docs">docs</Link> for setup.
        </p>
      </div>
    </main>
  );
}

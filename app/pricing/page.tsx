import type { Metadata } from "next";
import { Pricing } from "@/components/Pricing";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Free, Pro, and Business plans for ${brand.name}. Manual refresh free; scheduled sync from $9/mo.`,
  alternates: { canonical: `${siteConfig.url}/pricing` },
  openGraph: {
    title: `Pricing · ${brand.name}`,
    description: `Free, Pro, and Business plans for ${brand.name}.`,
    url: `${siteConfig.url}/pricing`,
  },
};

export default function PricingPage() {
  return (
    <main className="pricing-page page-shell">
      <Pricing variant="page" />
    </main>
  );
}

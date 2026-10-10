import type { Metadata } from "next";
import { SupportForm } from "@/components/SupportForm";
import { brand } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support",
  description: `Contact ${brand.name} support — billing, license keys, sync issues, and account help.`,
  alternates: { canonical: `${siteConfig.url}/support` },
};

export default function SupportPage() {
  return (
    <main className="legal container support-page">
      <p className="eyebrow">Help</p>
      <h1>Support</h1>
      <p className="body-lg muted support-lede">
        Billing, license keys, sync errors, or setup questions — send a message and we will reply
        to the email you provide.
      </p>
      <SupportForm />
    </main>
  );
}

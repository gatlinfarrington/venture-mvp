import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { SuccessClient } from "./SuccessClient";

export const metadata: Metadata = {
  // Root layout title template already appends `· ${brand.name}`.
  title: "Your license key",
  description: `Your ${brand.name} license key after Stripe Checkout.`,
  robots: { index: false, follow: false },
  alternates: { canonical: "/success" },
};

export default function SuccessPage() {
  return <SuccessClient />;
}

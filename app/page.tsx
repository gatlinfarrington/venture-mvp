import {
  Comparison,
  FAQ,
  FinalCTA,
  Hero,
  HowItWorks,
  Pricing,
  WhatLands,
  WhySheet,
} from "@/components/LandingSections";

export default function Home() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <WhatLands />
      <WhySheet />
      <Comparison />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </main>
  );
}

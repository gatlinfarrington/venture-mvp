"use client";

import dynamic from "next/dynamic";

const HeroDemo = dynamic(
  () => import("@/components/HeroDemo").then((m) => m.HeroDemo),
  {
    ssr: false,
    loading: () => (
      <div className="hero-stage" aria-hidden="true">
        <div className="hero-note mono">Loading demo…</div>
      </div>
    ),
  },
);

export function HeroDemoLazy() {
  return <HeroDemo />;
}

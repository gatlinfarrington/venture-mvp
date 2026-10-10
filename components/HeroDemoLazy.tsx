"use client";

import dynamic from "next/dynamic";

const HeroDemo = dynamic(
  () => import("@/components/HeroDemo").then((m) => m.HeroDemo),
  {
    ssr: false,
    loading: () => (
      <div className="hero-stage" aria-hidden="true">
        <div className="hero-sheet">
          <div className="hero-sheet-top">
            <div className="eyebrow">MRR · all sources</div>
            <div className="hero-mrr">
              <b>$4,180</b>
              <span className="hero-delta">+0.0%</span>
            </div>
          </div>
        </div>
        <div className="hero-note mono">Example data · no real customers</div>
      </div>
    ),
  },
);

export function HeroDemoLazy() {
  return <HeroDemo />;
}

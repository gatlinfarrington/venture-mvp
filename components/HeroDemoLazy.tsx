"use client";

import dynamic from "next/dynamic";

const HeroDemo = dynamic(
  () => import("@/components/HeroDemo").then((m) => m.HeroDemo),
  {
    ssr: false,
    loading: () => (
      <div className="hero-stage" aria-hidden="true">
        <div className="hero-stores-col">
          <div className="hero-stores" />
        </div>
        <div className="hero-sheet-wrap">
          <div className="hero-sheet">
            <div className="hero-sheet-top">
              <div className="eyebrow">MRR · all sources · example</div>
              <div className="hero-mrr">
                <b>$4,314</b>
                <span className="hero-delta">+3.2%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
);

export function HeroDemoLazy() {
  return <HeroDemo />;
}

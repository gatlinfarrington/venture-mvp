"use client";

import dynamic from "next/dynamic";
import { FINAL_MRR, MAX_DELTA, START_MRR } from "@/lib/hero-demo-sequence";

const PRIOR_BARS = [30, 33, 35, 36, 39, 42, 44, 47, 50, 54, 58];

/** SSR-friendly placeholder matching the live sheet chromes (digit strip + bars). */
function HeroDemoFallback({ final = true }: { final?: boolean }) {
  const value = final ? FINAL_MRR : START_MRR;
  const mrr = `$${Math.round(value).toLocaleString("en-US")}`;
  const delta = final ? `+${(MAX_DELTA * 100).toFixed(1)}%` : null;
  const digits = [...mrr];
  return (
    <div className="hero-stage" aria-hidden="true" data-hero-demo>
      <div className="hero-stores-col">
        <div className="hero-stores" />
      </div>
      <div className="hero-sheet-wrap">
        <div className="hero-sheet">
          <div className="hero-sheet-top">
            <div className="eyebrow">MRR · all sources · example</div>
            <div className="hero-mrr">
              <b className="hero-mrr-num">
                <span className="sr-only">{mrr}</span>
                {digits.map((ch, i) =>
                  ch >= "0" && ch <= "9" ? (
                    <span
                      key={i}
                      className="d"
                      aria-hidden="true"
                      style={{ ["--v" as string]: Number(ch), ["--p" as string]: 0 }}
                    >
                      <span className="d-strip">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <span key={n}>{n}</span>
                        ))}
                      </span>
                    </span>
                  ) : (
                    <span key={i} className="s" aria-hidden="true">
                      {ch}
                    </span>
                  ),
                )}
              </b>
              {delta ? <span className="hero-delta">{delta}</span> : null}
            </div>
            <div className="hero-bars" data-baseline>
              {PRIOR_BARS.map((h, i) => (
                <i key={i} style={{ height: `${h}%` }} />
              ))}
              <i className="signal" style={{ height: final ? "92%" : "62%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const HeroDemo = dynamic(
  () => import("@/components/HeroDemo").then((m) => m.HeroDemo),
  {
    ssr: true,
    loading: () => <HeroDemoFallback />,
  },
);

export function HeroDemoLazy() {
  return <HeroDemo />;
}

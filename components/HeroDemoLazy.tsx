"use client";

import dynamic from "next/dynamic";

/** SSR-friendly placeholder matching the live sheet chromes (digit strip + bars). */
function HeroDemoFallback({ final = false }: { final?: boolean }) {
  const mrr = final ? "$4,431" : "$4,180";
  const delta = final ? "+6.0%" : null;
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
                {digits.map((ch, i) =>
                  ch >= "0" && ch <= "9" ? (
                    <span key={i} className="d" style={{ ["--v" as string]: Number(ch), ["--p" as string]: 0 }}>
                      <i>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <span key={n}>{n}</span>
                        ))}
                      </i>
                    </span>
                  ) : (
                    <span key={i} className="s">
                      {ch}
                    </span>
                  ),
                )}
              </b>
              {delta ? <span className="hero-delta">{delta}</span> : null}
            </div>
            <div className="hero-bars" data-baseline>
              {[52, 55, 58, 57, 61, 64, 66, 70, 73, 76, 80].map((h, i) => (
                <i key={i} style={{ height: `${20 + ((h - 40) / 44) * 55}%` }} />
              ))}
              <i className="signal" style={{ height: final ? "92%" : "87%" }} />
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

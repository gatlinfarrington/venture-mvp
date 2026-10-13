"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import {
  FINAL_MRR,
  MOM_DELTA_LABEL,
  START_MRR,
  buildFinalRows,
  buildSeedRows,
} from "@/lib/hero-demo-sequence";

const PRIOR_BARS = [18, 20, 21, 22, 24, 26, 27, 29, 31, 33, 36];

/** SSR-friendly placeholder matching the live sheet chromes (digit strip + bars + table). */
/** Match live demo start (START_MRR / seed), not final — avoids SSR→hydrate snap. */
function HeroDemoFallback({ final = false }: { final?: boolean }) {
  const value = final ? FINAL_MRR : START_MRR;
  const mrr = `$${Math.round(value).toLocaleString("en-US")}`;
  const delta = final ? MOM_DELTA_LABEL : null;
  const digits = [...mrr];
  const rows = final ? buildFinalRows() : buildSeedRows();
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
              <div className="hero-mrr-line">
                <b className="hero-mrr-num">
                  <span className="sr-only">{mrr}</span>
                  {digits.map((ch, i) =>
                    ch >= "0" && ch <= "9" ? (
                      <span key={i} className="d" aria-hidden="true">
                        <span className="d-face">{ch}</span>
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
              <div className="hero-mrr-chip-slot" aria-hidden="true" />
            </div>
            <div className="hero-bars" data-baseline>
              {PRIOR_BARS.map((h, i) => (
                <i key={i} style={{ height: `${h}%` }} />
              ))}
              <i className="signal" style={{ height: final ? "92%" : "40%" }} />
            </div>
          </div>
          {/* Reserved thead + 9-row body so first paint never flashes a row under the header. */}
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Source</th>
                <th className="hero-col-product">Product</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody className="hero-rows" data-hero-live-rows>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  data-row-id={r.id}
                  className="hero-row"
                  style={{ "--i": i } as CSSProperties}
                >
                  <td className="mono">{r.id}</td>
                  <td>{r.source}</td>
                  <td className="hero-col-product">{r.product}</td>
                  <td className="n">${r.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

"use client";

import { useState } from "react";
import {
  CHURN_SERIES,
  DASHBOARD_KPIS,
  MRR_STACK,
  ORDER_HEADERS,
  PRODUCT_REVENUE,
  SAMPLE_ORDERS,
  SAMPLE_SUBS,
  SAMPLE_STUDIO,
  SAMPLE_CURRENCY,
  SOURCE_REVENUE,
  SUB_HEADERS,
} from "@/lib/sample-sheet-data";

type Tab = "dashboard" | "orders" | "subscriptions";

const TABS: Array<{ id: Tab; label: string; color: "ink" | "signal" }> = [
  { id: "dashboard", label: "Dashboard", color: "ink" },
  { id: "orders", label: "Orders", color: "ink" },
  { id: "subscriptions", label: "Subscriptions", color: "ink" },
];

function money(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

function pct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function MrrChart() {
  const max = 5000;
  const h = 220;
  const plotTop = 16;
  const plotBottom = h - 28;
  const plotH = plotBottom - plotTop;
  const barW = 28;
  const gap = 18;
  const left = 40;
  const ticks = [0, 1000, 2000, 3000, 4000, 5000];

  return (
    <svg
      className="sample-chart"
      viewBox={`0 0 560 ${h}`}
      role="img"
      aria-label="Stacked MRR by source for the last 12 months. Example data."
    >
      {ticks.map((t) => {
        const y = plotBottom - (t / max) * plotH;
        return (
          <g key={t}>
            <line
              x1={left}
              x2={560}
              y1={y}
              y2={y}
              className="sample-chart-grid"
            />
            <text x={left - 6} y={y + 3} textAnchor="end" className="sample-chart-axis">
              ${t / 1000}k
            </text>
          </g>
        );
      })}
      {MRR_STACK.map((m, i) => {
        const x = left + 12 + i * (barW + gap);
        const gumH = (m.gum / max) * plotH;
        const polarH = (m.polar / max) * plotH;
        const lsH = (m.ls / max) * plotH;
        let y = plotBottom;
        y -= gumH;
        const gumY = y;
        y -= polarH;
        const polarY = y;
        y -= lsH;
        const lsY = y;
        const total = m.ls + m.polar + m.gum;
        const last = i === MRR_STACK.length - 1;
        return (
          <g key={m.month}>
            <rect x={x} y={gumY} width={barW} height={gumH} className="sample-bar-gum" />
            <rect x={x} y={polarY} width={barW} height={polarH} className="sample-bar-polar" />
            <rect x={x} y={lsY} width={barW} height={lsH} className="sample-bar-ls" />
            <text x={x + barW / 2} y={h - 8} textAnchor="middle" className="sample-chart-axis">
              {m.month}
            </text>
            {last ? (
              <text
                x={x + barW / 2}
                y={lsY - 6}
                textAnchor="middle"
                className="sample-chart-label"
              >
                {money(total)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function ChurnChart() {
  const w = 240;
  const h = 220;
  const left = 28;
  const top = 16;
  const bottom = h - 28;
  const plotH = bottom - top;
  const max = 4;
  const pts = CHURN_SERIES.map((v, i) => {
    const x = left + (i * (w - left - 8)) / (CHURN_SERIES.length - 1);
    const y = bottom - (v / max) * plotH;
    return { x, y, v };
  });
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const ticks = [0, 1, 2, 3, 4];

  return (
    <svg
      className="sample-chart sample-chart-churn"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Monthly churn line chart. Example data."
    >
      {ticks.map((t) => {
        const y = bottom - (t / max) * plotH;
        return (
          <g key={t}>
            <line x1={left} x2={w} y1={y} y2={y} className="sample-chart-grid" />
            <text x={left - 4} y={y + 3} textAnchor="end" className="sample-chart-axis">
              {t.toFixed(1)}
            </text>
          </g>
        );
      })}
      <path d={d} className="sample-churn-line" fill="none" />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === pts.length - 1 ? 3.5 : 2.5}
          className="sample-churn-point"
        />
      ))}
      <text
        x={pts[pts.length - 1]!.x - 4}
        y={pts[pts.length - 1]!.y - 10}
        textAnchor="end"
        className="sample-chart-label"
      >
        2.9%
      </text>
    </svg>
  );
}

function DashboardPane() {
  return (
    <div className="sample-dashboard">
      <div className="sample-dash-header">
        <span className="sample-dash-title">Revenue dashboard</span>
        <span className="sample-dash-meta mono">
          {SAMPLE_STUDIO} · {SAMPLE_CURRENCY}
        </span>
      </div>
      <div className="sample-dash-status mono">
        <span>
          <i className="sample-sync-dot" aria-hidden="true" />
          SYNCED 2026-10-09 10:02 · LEMON SQUEEZY, POLAR, GUMROAD · HOURLY
        </span>
        <span className="sample-status-right">EXAMPLE DATA · NOT REAL CUSTOMERS</span>
      </div>

      <div className="sample-kpis">
        {DASHBOARD_KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className={`sample-kpi${"inverse" in kpi && kpi.inverse && !kpi.positive ? " is-warn" : ""}`}
          >
            <div className="sample-kpi-label mono">{kpi.label}</div>
            <div className="sample-kpi-value">{kpi.value}</div>
            <div
              className={`sample-kpi-delta mono${kpi.positive ? " is-up" : " is-down"}`}
            >
              {kpi.delta}
            </div>
          </div>
        ))}
      </div>

      <p className="sample-kpi-note mono muted">
        Trialing 8 · $72 · Past due 3 · $87 · MRR = active only (trial/past due excluded)
      </p>

      <div className="sample-charts-row">
        <div className="sample-chart-block sample-chart-mrr">
          <div className="sample-section-head">
            <h3>MRR by source · last 12 months</h3>
            <ul className="sample-legend">
              <li>
                <i className="sample-swatch-ls" aria-hidden="true" /> Lemon Squeezy
              </li>
              <li>
                <i className="sample-swatch-polar" aria-hidden="true" /> Polar
              </li>
              <li>
                <i className="sample-swatch-gum" aria-hidden="true" /> Gumroad
              </li>
            </ul>
          </div>
          <MrrChart />
        </div>
        <div className="sample-chart-block sample-chart-churn-wrap">
          <div className="sample-section-head">
            <h3>Churn · monthly</h3>
          </div>
          <ChurnChart />
        </div>
      </div>

      <div className="sample-tables-row">
        <div className="sample-mini-table-wrap">
          <h3>Revenue by product · 30d</h3>
          <table className="sample-mini-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Source</th>
                <th className="n">Revenue</th>
                <th className="n">Vs prior</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCT_REVENUE.map((r) => (
                <tr key={r.product}>
                  <td>{r.product}</td>
                  <td className="muted">{r.source}</td>
                  <td className="n mono">{money(r.revenue)}</td>
                  <td className={`n mono${r.vs >= 0 ? " is-up" : " is-down"}`}>{pct(r.vs)}</td>
                </tr>
              ))}
              <tr className="sample-total-row">
                <td>Total</td>
                <td />
                <td className="n mono">$6,912</td>
                <td className="n mono is-up">+5.1%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="sample-mini-table-wrap">
          <h3>Revenue by source · 30d</h3>
          <table className="sample-mini-table">
            <thead>
              <tr>
                <th>Source</th>
                <th className="n">Revenue</th>
                <th className="n">Share</th>
                <th className="n">Vs prior</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {SOURCE_REVENUE.map((r) => (
                <tr key={r.source}>
                  <td>{r.source}</td>
                  <td className="n mono">{money(r.revenue)}</td>
                  <td className="n mono muted">{r.share.toFixed(1)}%</td>
                  <td className={`n mono${r.vs >= 0 ? " is-up" : " is-down"}`}>{pct(r.vs)}</td>
                  <td>
                    <span className="sample-synced">
                      <i aria-hidden="true" /> Synced
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="sample-footnote mono muted">
        Managed by RevenueSheet · edits in synced ranges are overwritten · named ranges rs_orders,
        rs_subs, rs_customers, rs_mrr_monthly · example data
      </p>
    </div>
  );
}

function OrdersPane() {
  return (
    <div className="sample-data-pane">
      <table className="sample-data-table">
        <thead>
          <tr>
            {ORDER_HEADERS.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SAMPLE_ORDERS.map((o) => (
            <tr key={o.id}>
              <td className="mono">{o.id}</td>
              <td className="mono">{o.created}</td>
              <td>{o.source}</td>
              <td className="muted">{o.store}</td>
              <td>{o.product}</td>
              <td className="muted">{o.email}</td>
              <td className="n mono">${o.amount.toFixed(2)}</td>
              <td className={o.status === "refunded" ? "is-down" : undefined}>{o.status}</td>
              <td className="mono muted">{o.country}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubsPane() {
  return (
    <div className="sample-data-pane">
      <table className="sample-data-table">
        <thead>
          <tr>
            {SUB_HEADERS.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SAMPLE_SUBS.map((s) => (
            <tr key={s.id}>
              <td className="mono">{s.id}</td>
              <td className="mono">{s.created}</td>
              <td>{s.source}</td>
              <td className="muted">{s.store}</td>
              <td>{s.product}</td>
              <td className="muted">{s.email}</td>
              <td className="n mono">${s.mrr.toFixed(2)}</td>
              <td className={s.status === "past_due" ? "is-down sample-past-due" : undefined}>
                {s.status}
              </td>
              <td className="mono muted">{s.cancelled || ""}</td>
              <td className="muted">{s.interval}</td>
              <td className="mono muted">{s.country}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SampleSheetPreview() {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="sample-sheet" data-tab={tab}>
      <div className="sample-sheet-chrome">
        <span className="sample-sheet-mark" aria-hidden="true" />
        <span className="sample-sheet-filename">Revenue · Example Studio (sample data)</span>
        <span className="sample-example-badge mono">Example data</span>
      </div>

      <div className="sample-sheet-body">
        {tab === "dashboard" ? <DashboardPane /> : null}
        {tab === "orders" ? <OrdersPane /> : null}
        {tab === "subscriptions" ? <SubsPane /> : null}
      </div>

      <div className="sample-sheet-tabs" role="tablist" aria-label="Sheet tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`sample-tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`sample-tab-dot sample-tab-dot-${t.color}`} aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

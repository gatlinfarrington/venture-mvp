"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import {
  DASHBOARD,
  ORDER_HEADERS,
  SAMPLE_ORDERS,
  SAMPLE_SUBS,
  SAMPLE_TAB_NAMES,
  SUB_HEADERS,
} from "@/lib/sample-data";

type Tab = (typeof SAMPLE_TAB_NAMES)[number];

function tabFromHash(): Tab {
  const hash = window.location.hash.replace(/^#/, "").toLowerCase();
  if (hash === "orders") return "Orders";
  if (hash === "subscriptions") return "Subscriptions";
  return "Dashboard";
}

function subscribeHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function MrrBars() {
  const max = 12000;
  return (
    <div
      className="sample-bars"
      role="img"
      aria-label="Stacked MRR by source from $6.1k in November to $11.7k in October. Polar, Lemon Squeezy, Gumroad. Example data."
    >
      {DASHBOARD.mrrStack.map((m) => {
        const total = m.polar + m.ls + m.gum;
        const h = Math.max(8, Math.round((total / max) * 160));
        const pH = Math.round((m.polar / total) * h);
        const lH = Math.round((m.ls / total) * h);
        const gH = Math.max(0, h - pH - lH);
        return (
          <div key={m.month} className="sample-bar-col">
            <div className="sample-bar-stack" style={{ height: `${h}px` }}>
              <i className="sample-seg-gum" style={{ height: `${gH}px` }} />
              <i className="sample-seg-ls" style={{ height: `${lH}px` }} />
              <i className="sample-seg-polar" style={{ height: `${pH}px` }} />
            </div>
            <span className="sample-bar-label">{m.month}</span>
          </div>
        );
      })}
    </div>
  );
}

function DashboardGrid() {
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const emptyTail = 5;

  return (
    <table
      className="sample-grid sample-dash"
      role="grid"
      aria-readonly="true"
      aria-label="Dashboard tab, example data"
    >
      <thead>
        <tr>
          <th className="sample-rn sample-c0" scope="col">
            {" "}
          </th>
          {letters.map((L) => (
            <th key={L} scope="col">
              {L}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th className="sample-rn" scope="row">
            1
          </th>
          <td />
          <td colSpan={7} className="sample-dash-title is-selected">
            Revenue dashboard
          </td>
          <td colSpan={4} className="sample-dash-meta">
            EXAMPLE STUDIO · USD
          </td>
        </tr>
        <tr>
          <th className="sample-rn" scope="row">
            2
          </th>
          <td colSpan={12} className="sample-dash-status">
            {DASHBOARD.statusLine}
          </td>
        </tr>
        <tr>
          <th className="sample-rn" scope="row">
            3
          </th>
          {letters.map((L) => (
            <td key={L} />
          ))}
        </tr>
        <tr>
          <th className="sample-rn" scope="row">
            4
          </th>
          <td />
          <td className="sample-kl" colSpan={2}>
            MRR
          </td>
          <td />
          <td className="sample-kl" colSpan={2}>
            NET REVENUE · 30D
          </td>
          <td />
          <td className="sample-kl" colSpan={2}>
            ACTIVE SUBSCRIPTIONS
          </td>
          <td />
          <td className="sample-kl sample-kl-bad" colSpan={2}>
            CHURN · 30D
          </td>
        </tr>
        <tr>
          <th className="sample-rn" scope="row">
            5
          </th>
          <td />
          <td className="sample-kv" colSpan={2}>
            {DASHBOARD.mrr}
          </td>
          <td />
          <td className="sample-kv" colSpan={2}>
            {DASHBOARD.netRevenue}
          </td>
          <td />
          <td className="sample-kv" colSpan={2}>
            {DASHBOARD.activeSubs}
          </td>
          <td />
          <td className="sample-kv" colSpan={2}>
            {DASHBOARD.churn}
          </td>
        </tr>
        <tr>
          <th className="sample-rn" scope="row">
            6
          </th>
          <td />
          <td className="sample-kd" colSpan={2}>
            {DASHBOARD.mrrDelta}
          </td>
          <td />
          <td className="sample-kd" colSpan={2}>
            {DASHBOARD.netDelta}
          </td>
          <td />
          <td className="sample-kd" colSpan={2}>
            {DASHBOARD.activeDelta}
          </td>
          <td />
                  <td className="sample-kd" colSpan={2}>
                    {DASHBOARD.churnDelta}
                  </td>
        </tr>
        <tr>
          <th className="sample-rn" scope="row">
            7
          </th>
          <td />
          <td colSpan={11} className="sample-past-due-line">
            {DASHBOARD.pastDueLine}
          </td>
        </tr>
        <tr>
          <th className="sample-rn" scope="row">
            8
          </th>
          {letters.map((L) => (
            <td key={L} />
          ))}
        </tr>
        <tr>
          <th className="sample-rn" scope="row">
            9
          </th>
          <td />
          <td colSpan={6} className="sample-sec">
            MRR BY SOURCE · LAST 12 MONTHS
          </td>
          <td />
          <td colSpan={4} className="sample-sec">
            SOURCES
          </td>
        </tr>
        <tr>
          <th className="sample-rn" scope="row">
            10
          </th>
          <td />
          <td colSpan={6} rowSpan={10} className="sample-chart-cell">
            <div className="sample-legend-row">
              <span>
                <i className="sample-swatch-polar" /> Polar
              </span>
              <span>
                <i className="sample-swatch-ls" /> Lemon Squeezy
              </span>
              <span>
                <i className="sample-swatch-gum" /> Gumroad
              </span>
            </div>
            <MrrBars />
          </td>
          <td />
          <td colSpan={4} rowSpan={10} className="sample-sources-cell">
            <ul className="sample-sources-list">
              {DASHBOARD.sources.map((s) => (
                <li key={s.name}>
                  <strong>{s.name}</strong>
                  {s.detail ? <span className="muted"> {s.detail}</span> : null}
                  <span className={s.state === "Synced" ? "sample-src-synced" : "sample-src-muted"}>
                    {" "}
                    {s.state}
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
        {Array.from({ length: 9 }, (_, i) => (
          <tr key={`mid-${i}`}>
            <th className="sample-rn" scope="row">
              {11 + i}
            </th>
            <td />
            <td />
          </tr>
        ))}
        {Array.from({ length: emptyTail }, (_, i) => (
          <tr key={`tail-${i}`}>
            <th className="sample-rn" scope="row">
              {20 + i}
            </th>
            {letters.map((L) => (
              <td key={L} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DataGrid({
  tab,
  headers,
  rows,
}: {
  tab: Tab;
  headers: readonly string[];
  rows: string[][];
}) {
  const letters = headers.map((_, i) => String.fromCharCode(65 + i));
  const emptyTail = 5;

  return (
    <table
      className="sample-grid"
      role="grid"
      aria-readonly="true"
      aria-label={`${tab} tab, example data`}
    >
      <thead>
        <tr>
          <th className="sample-rn sample-c0" scope="col">
            {" "}
          </th>
          {letters.map((L) => (
            <th key={L} scope="col">
              {L}
            </th>
          ))}
        </tr>
        <tr className="sample-hdr">
          <th className="sample-rn" scope="row">
            1
          </th>
          {headers.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((data, i) => {
          const rowNum = i + 2;
          return (
            <tr key={rowNum}>
              <th className="sample-rn" scope="row">
                {rowNum}
              </th>
              {headers.map((h, c) => {
                const val = data[c] ?? "";
                const isAmount = h.includes("USD");
                const danger = h === "Status" && (val === "refunded" || val === "past_due");
                const selected = rowNum === 2 && c === 0;
                return (
                  <td
                    key={`${rowNum}-${c}`}
                    className={`${isAmount ? "sample-num" : ""}${danger ? " sample-danger" : ""}${selected ? " is-selected" : ""}`}
                  >
                    {val}
                  </td>
                );
              })}
            </tr>
          );
        })}
        {Array.from({ length: emptyTail }, (_, i) => {
          const rowNum = rows.length + 2 + i;
          return (
            <tr key={`empty-${rowNum}`}>
              <th className="sample-rn" scope="row">
                {rowNum}
              </th>
              {headers.map((_, c) => (
                <td key={c} />
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function SampleSheet() {
  const hashTab = useSyncExternalStore(subscribeHash, tabFromHash, () => "Dashboard" as Tab);
  const [tabOverride, setTabOverride] = useState<Tab | null>(null);
  const tab = tabOverride ?? hashTab;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledX, setScrolledX] = useState(false);
  const baseId = useId();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    setScrolledX(false);
  }, [tab]);

  const formulaRef = tab === "Dashboard" ? "B1" : "A2";
  const formulaValue =
    tab === "Dashboard"
      ? "Revenue dashboard"
      : tab === "Orders"
        ? SAMPLE_ORDERS[0]?.id ?? ""
        : SAMPLE_SUBS[0]?.id ?? "";

  const orderRows = SAMPLE_ORDERS.map((o) => [
    o.id,
    o.created,
    o.source,
    o.product,
    o.email,
    money(o.amount),
    o.status,
    o.country,
  ]);
  const subRows = SAMPLE_SUBS.map((s) => [
    s.id,
    s.created,
    s.source,
    s.product,
    s.email,
    money(s.mrr),
    s.status,
    s.cancelled,
    s.interval,
    s.country,
  ]);

  const tabIds = SAMPLE_TAB_NAMES.map((name, i) => ({
    name,
    tabId: `${baseId}-tab-${i}`,
    panelId: `${baseId}-panel-${i}`,
  }));

  function activate(name: Tab, index: number) {
    setTabOverride(name);
    const hash =
      name === "Orders" ? "orders" : name === "Subscriptions" ? "subscriptions" : "dashboard";
    window.history.replaceState(null, "", `#${hash}`);
    requestAnimationFrame(() => {
      document.getElementById(tabIds[index]!.tabId)?.focus();
    });
  }

  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = SAMPLE_TAB_NAMES.length - 1;
    let next = index;
    if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    activate(SAMPLE_TAB_NAMES[next]!, next);
  }

  return (
    <figure className="sample-frame" aria-label="Sample RevenueSheet spreadsheet, read only, example data">
      <div className="sample-formula">
        <span className="sample-cell-ref mono">{formulaRef}</span>
        <span className="sample-formula-value mono sample-fx">{formulaValue}</span>
        <span className="sample-example-pill mono">EXAMPLE DATA</span>
      </div>

      <div
        className="sample-scroll"
        ref={scrollRef}
        onScroll={(e) => setScrolledX(e.currentTarget.scrollLeft > 8)}
      >
        <div
          role="tabpanel"
          id={tabIds[0]!.panelId}
          aria-labelledby={tabIds[0]!.tabId}
          tabIndex={0}
          className="sample-panel"
          hidden={tab !== "Dashboard"}
        >
          {tab === "Dashboard" ? <DashboardGrid /> : null}
        </div>
        <div
          role="tabpanel"
          id={tabIds[1]!.panelId}
          aria-labelledby={tabIds[1]!.tabId}
          tabIndex={0}
          className="sample-panel"
          hidden={tab !== "Orders"}
        >
          {tab === "Orders" ? (
            <DataGrid tab="Orders" headers={ORDER_HEADERS} rows={orderRows} />
          ) : null}
        </div>
        <div
          role="tabpanel"
          id={tabIds[2]!.panelId}
          aria-labelledby={tabIds[2]!.tabId}
          tabIndex={0}
          className="sample-panel"
          hidden={tab !== "Subscriptions"}
        >
          {tab === "Subscriptions" ? (
            <DataGrid tab="Subscriptions" headers={SUB_HEADERS} rows={subRows} />
          ) : null}
        </div>
      </div>

      <p className={`sample-scroll-hint mono${scrolledX ? " is-hidden" : ""}`} aria-hidden="true">
        Scroll sideways for more columns →
      </p>

      <div className="sample-tabs" role="tablist" aria-label="Sheet tabs">
        {tabIds.map((t, i) => {
          const active = tab === t.name;
          return (
            <button
              key={t.name}
              type="button"
              role="tab"
              id={t.tabId}
              aria-selected={active}
              aria-controls={t.panelId}
              tabIndex={active ? 0 : -1}
              className={`sample-tab${active ? " is-active" : ""}`}
              onClick={() => activate(t.name, i)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
            >
              <i className="sample-tab-swatch" aria-hidden="true" />
              {t.name}
            </button>
          );
        })}
      </div>
    </figure>
  );
}

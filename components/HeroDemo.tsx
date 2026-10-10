"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SOURCES = ["Lemon Squeezy", "Polar", "Gumroad"] as const;
const PRODUCTS = [
  "Demo SaaS · Pro",
  "Example Course",
  "Sample Icon Pack",
  "Demo SaaS · Team",
  "Template Kit",
] as const;

/**
 * MOTION.md storyboard: frame 0 shows MRR $4,180 with 9 seeded rows.
 * 14 deterministic landings add each order’s real amount; sum ≈ $251 → ~+6% delta.
 * Same sequence on every viewport (packets are visual-only).
 */
const BASE_MRR = 4180;
const START_MRR = BASE_MRR;
/** Cap displayed delta near +6% (storyboard rest state). */
const MAX_DELTA = 0.06;

type Row = {
  id: string;
  source: string;
  product: string;
  amount: number;
  fresh: boolean;
};

type OrderSpec = {
  source: 0 | 1 | 2;
  product: (typeof PRODUCTS)[number];
  amount: number;
};

/** Newest-first seed (EX-10449 … EX-10441): contiguous with inserts from EX-10450. */
const SEED_SPECS: OrderSpec[] = [
  { source: 0, product: "Demo SaaS · Pro", amount: 29 },
  { source: 1, product: "Example Course", amount: 49 },
  { source: 2, product: "Sample Icon Pack", amount: 12 },
  { source: 0, product: "Demo SaaS · Team", amount: 19 },
  { source: 1, product: "Template Kit", amount: 9 },
  { source: 2, product: "Demo SaaS · Pro", amount: 29 },
  { source: 0, product: "Sample Icon Pack", amount: 12 },
  { source: 1, product: "Example Course", amount: 19 },
  { source: 2, product: "Demo SaaS · Team", amount: 9 },
];

/** 14 landings; amounts sum to 251 → final MRR $4,431 (+6.0%). */
const LANDING_SPECS: OrderSpec[] = [
  { source: 0, product: "Demo SaaS · Pro", amount: 29 },
  { source: 1, product: "Example Course", amount: 19 },
  { source: 2, product: "Sample Icon Pack", amount: 12 },
  { source: 0, product: "Demo SaaS · Team", amount: 9 },
  { source: 1, product: "Template Kit", amount: 29 },
  { source: 2, product: "Demo SaaS · Pro", amount: 19 },
  { source: 0, product: "Sample Icon Pack", amount: 12 },
  { source: 1, product: "Example Course", amount: 9 },
  { source: 2, product: "Demo SaaS · Team", amount: 29 },
  { source: 0, product: "Template Kit", amount: 19 },
  { source: 1, product: "Sample Icon Pack", amount: 12 },
  { source: 2, product: "Demo SaaS · Pro", amount: 9 },
  { source: 0, product: "Example Course", amount: 29 },
  { source: 1, product: "Demo SaaS · Team", amount: 15 },
];

const LANDING_TOTAL = LANDING_SPECS.reduce((s, o) => s + o.amount, 0);
const FINAL_MRR = START_MRR + LANDING_TOTAL;

const BASE_BARS = [52, 55, 58, 57, 61, 64, 66, 70, 73, 76, 80, 84];

function rowFromSpec(spec: OrderSpec, id: string, fresh: boolean): Row {
  return {
    id,
    source: SOURCES[spec.source]!,
    product: spec.product,
    amount: spec.amount,
    fresh,
  };
}

const SEED_ROWS: Row[] = SEED_SPECS.map((spec, i) =>
  rowFromSpec(spec, `EX-${10449 - i}`, false),
);

function fmt(v: number) {
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

function deltaLabel(mrr: number) {
  const raw = mrr / BASE_MRR - 1;
  const capped = Math.min(MAX_DELTA, Math.max(0, raw));
  return `+${(capped * 100).toFixed(1)}%`;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function packetsAllowed() {
  return (
    typeof window !== "undefined" &&
    !prefersReducedMotion() &&
    window.matchMedia("(min-width: 769px)").matches
  );
}

function DemoFoot({ onReplay }: { onReplay: () => void }) {
  return (
    <div className="hero-demo-foot">
      <button type="button" className="btn btn-secondary btn-sm hero-replay" onClick={onReplay}>
        Replay
      </button>
      <p className="hero-note mono">Example data · no real customers</p>
    </div>
  );
}

function finalRows(): Row[] {
  const landed = LANDING_SPECS.map((spec, i) =>
    rowFromSpec(spec, `EX-${10450 + i}`, false),
  ).reverse();
  return [...landed, ...SEED_ROWS].slice(0, 9);
}

export function HeroDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const raf = useRef<number | null>(null);
  const mrrRef = useRef(START_MRR);
  const nextId = useRef(10450);
  const [mrr, setMrr] = useState(START_MRR);
  const [delta, setDelta] = useState(deltaLabel(START_MRR));
  const [rows, setRows] = useState<Row[]>(SEED_ROWS);
  const [activeStores, setActiveStores] = useState([false, false, false]);
  const [barHeights, setBarHeights] = useState(
    () => BASE_BARS.map((h) => (h - 40) * 2),
  );
  const [packets, setPackets] = useState<
    Array<{ id: string; amount: number; path: string }>
  >([]);

  function packetPath(storeIndex: number): string {
    const stage = stageRef.current;
    if (!stage) {
      return "M 150 138 C 230 138, 250 160, 330 175";
    }
    const stageRect = stage.getBoundingClientRect();
    const store = stage.querySelectorAll<HTMLElement>(".hero-store")[storeIndex];
    const st = store?.querySelector<HTMLElement>(".st");
    const sheet = stage.querySelector<HTMLElement>(".hero-sheet");
    if (!st || !sheet) {
      return "M 150 138 C 230 138, 250 160, 330 175";
    }
    const stRect = st.getBoundingClientRect();
    const sheetRect = sheet.getBoundingClientRect();
    const startX = stRect.left + stRect.width / 2 - stageRect.left;
    const startY = stRect.top + stRect.height / 2 - stageRect.top;
    // End at incoming row left padding (sheet x + 16) and row center y.
    const endX = sheetRect.left - stageRect.left + 16;
    const firstRow = sheet.querySelector<HTMLElement>("tbody tr");
    const rowRect = firstRow?.getBoundingClientRect();
    const endY = rowRect
      ? rowRect.top + rowRect.height / 2 - stageRect.top
      : sheetRect.top - stageRect.top + sheetRect.height * 0.45;
    const midX = startX + (endX - startX) * 0.5;
    return `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${midX.toFixed(1)} ${startY.toFixed(1)}, ${midX.toFixed(1)} ${endY.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    if (raf.current != null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }, []);

  const tickMrr = useCallback((to: number, ms: number) => {
    if (raf.current != null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }

    const target = Math.min(FINAL_MRR, Math.max(START_MRR, to));

    if (prefersReducedMotion()) {
      mrrRef.current = target;
      setMrr(target);
      setDelta(deltaLabel(target));
      return;
    }

    const from = mrrRef.current;
    let t0: number | null = null;
    const step = (t: number) => {
      if (t0 === null) t0 = t;
      const k = Math.min(1, Math.max(0, (t - t0) / ms));
      const e = 1 - Math.pow(1 - k, 4);
      const next = from + (target - from) * e;
      mrrRef.current = next;
      setMrr(next);
      setDelta(deltaLabel(next));
      if (k < 1) raf.current = requestAnimationFrame(step);
      else raf.current = null;
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  const landOrder = useCallback(
    (index: number) => {
      const spec = LANDING_SPECS[index]!;
      const s = spec.source;
      const amount = spec.amount;
      const reduced = prefersReducedMotion();

      setActiveStores((prev) => {
        const next = [...prev];
        next[s] = true;
        return next;
      });

      // Packet flight 900ms; last 140ms fades while the row slides in.
      const flyMs = 900;
      const fadeTailMs = 140;
      const rowAt = flyMs - fadeTailMs;

      if (packetsAllowed()) {
        const pid = `p-${index}-${Date.now()}`;
        const path = packetPath(s);
        setPackets((p) => [...p, { id: pid, amount, path }]);
        timers.current.push(
          window.setTimeout(() => {
            setPackets((p) => p.filter((x) => x.id !== pid));
          }, flyMs + 50),
        );
      }

      timers.current.push(
        window.setTimeout(
          () => {
            const id = `EX-${nextId.current++}`;
            setRows((prev) => {
              const next: Row[] = [
                rowFromSpec(spec, id, true),
                ...prev,
              ].slice(0, 9);
              return next;
            });
            // Add the order’s real amount (not ×4) so delta stays near +6%.
            tickMrr(mrrRef.current + amount, 700);
            setBarHeights((heights) => {
              const next = [...heights];
              const last = next.length - 1;
              next[last] = Math.min(98, (next[last] ?? 0) + 1.2);
              return next;
            });
            timers.current.push(
              window.setTimeout(() => {
                setRows((prev) =>
                  prev.map((r) => (r.id === id ? { ...r, fresh: false } : r)),
                );
              }, 1200),
            );
          },
          reduced ? 0 : rowAt,
        ),
      );
    },
    [tickMrr],
  );

  const run = useCallback(() => {
    clearTimers();
    nextId.current = 10450;
    mrrRef.current = START_MRR;
    setMrr(START_MRR);
    setDelta(deltaLabel(START_MRR));
    setRows(SEED_ROWS);
    setActiveStores([false, false, false]);
    setBarHeights(BASE_BARS.map((h) => (h - 40) * 2));
    setPackets([]);

    const reduced = prefersReducedMotion();
    if (reduced) {
      // MOTION.md: final state immediately. Identical numbers on every viewport.
      mrrRef.current = FINAL_MRR;
      setMrr(FINAL_MRR);
      setDelta(deltaLabel(FINAL_MRR));
      setRows(finalRows());
      setActiveStores([true, true, true]);
      setBarHeights(BASE_BARS.map((h) => Math.min(98, (h - 40) * 2 + 14)));
      return;
    }

    for (let i = 0; i < LANDING_SPECS.length; i++) {
      timers.current.push(
        window.setTimeout(() => landOrder(i), 600 + i * 420),
      );
    }
  }, [clearTimers, landOrder]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let visible = true;
    let pageVisible = document.visibilityState === "visible";
    let started = false;
    let startTimer: number | null = null;

    const scheduleStart = () => {
      if (started || !visible || !pageVisible) return;
      if (prefersReducedMotion()) {
        started = true;
        run();
        return;
      }
      if (startTimer != null) return;
      startTimer = window.setTimeout(() => {
        started = true;
        run();
      }, 600);
    };

    const stop = () => {
      if (startTimer != null) {
        window.clearTimeout(startTimer);
        startTimer = null;
      }
      clearTimers();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible && pageVisible) scheduleStart();
        else stop();
      },
      { threshold: 0.2 },
    );
    io.observe(stage);

    const onVis = () => {
      pageVisible = document.visibilityState === "visible";
      if (pageVisible) scheduleStart();
      else stop();
    };
    document.addEventListener("visibilitychange", onVis);
    scheduleStart();

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [clearTimers, run]);

  return (
    <div className="hero-demo">
      <div
        ref={stageRef}
        className="hero-stage"
        role="img"
        aria-label="Animation: three stores sync orders into one spreadsheet while MRR rises (example data)"
      >
        <div className="hero-stores-col" aria-hidden="true">
          <div className="hero-stores">
            {[
              { name: "Lemon Squeezy", store: "example-store" },
              { name: "Polar", store: "example-org" },
              { name: "Gumroad", store: "example-seller" },
            ].map((s, i) => (
              <div
                key={s.name}
                className={`hero-store${activeStores[i] ? " on" : ""}`}
              >
                <span>
                  {s.name}
                  <br />
                  <small>{s.store}</small>
                </span>
                <i className="st" aria-hidden="true" />
              </div>
            ))}
          </div>
          <div className="hero-stores-foot">
            <DemoFoot onReplay={run} />
          </div>
        </div>

        <div className="hero-sheet-wrap">
          <div className="hero-sheet" aria-hidden="true">
            <div className="hero-sheet-top">
              <div className="eyebrow">MRR · all sources</div>
              <div className="hero-mrr">
                <b>{fmt(mrr)}</b>
                <span className="hero-delta">{delta}</span>
              </div>
              <div className="hero-bars">
                {barHeights.map((h, i) => (
                  <i
                    key={i}
                    style={{ height: `${h}%` }}
                    className={i === barHeights.length - 1 ? "signal" : undefined}
                  />
                ))}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Source</th>
                  <th className="hero-col-product">Product</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.fresh ? "new" : undefined}>
                    <td className="mono">{r.id}</td>
                    <td>{r.source}</td>
                    <td className="hero-col-product">{r.product}</td>
                    <td className="n">${r.amount}.00</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hero-sheet-foot">
            <DemoFoot onReplay={run} />
          </div>
        </div>

        {packets.map((p) => (
          <div
            key={p.id}
            className="hero-packet"
            style={{ offsetPath: `path("${p.path}")` }}
          >
            +${p.amount}
          </div>
        ))}
      </div>
    </div>
  );
}

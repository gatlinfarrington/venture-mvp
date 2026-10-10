"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SOURCES = ["Lemon Squeezy", "Polar", "Gumroad"] as const;
const PRODUCTS = [
  "Demo SaaS · Pro",
  "Example Course",
  "Sample Icon Pack",
  "Demo SaaS · Team",
  "Template Kit",
];
const AMOUNTS = [9, 19, 29, 49, 12];
const BASE_BARS = [52, 55, 58, 57, 61, 64, 66, 70, 73, 76, 80, 84];
/** 0% reference for the example delta. */
const BASE_MRR = 4180;
const SEED_DELTA = 0.032;
const START_MRR = Math.round(BASE_MRR * (1 + SEED_DELTA));

type Row = {
  id: string;
  source: string;
  product: string;
  amount: number;
  fresh: boolean;
};

const SEED_ROWS: Row[] = [
  { id: "EX-10446", source: "Lemon Squeezy", product: "Demo SaaS · Pro", amount: 29, fresh: false },
  { id: "EX-10447", source: "Polar", product: "Example Course", amount: 49, fresh: false },
  { id: "EX-10448", source: "Gumroad", product: "Sample Icon Pack", amount: 12, fresh: false },
  { id: "EX-10449", source: "Lemon Squeezy", product: "Demo SaaS · Team", amount: 19, fresh: false },
];

function fmt(v: number) {
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

function deltaLabel(mrr: number) {
  return `+${(((mrr / BASE_MRR) - 1) * 100).toFixed(1)}%`;
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

export function HeroDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const raf = useRef<number | null>(null);
  const mrrRef = useRef(START_MRR);
  const orderN = useRef(10450);
  const [mrr, setMrr] = useState(START_MRR);
  const [delta, setDelta] = useState(deltaLabel(START_MRR));
  const [rows, setRows] = useState<Row[]>(SEED_ROWS);
  const [activeStores, setActiveStores] = useState([false, false, false]);
  const [barHeights, setBarHeights] = useState(
    () => BASE_BARS.map((h) => (h - 40) * 2),
  );
  const [packets, setPackets] = useState<
    Array<{ id: string; amount: number; store: number }>
  >([]);

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

    const target = Math.max(START_MRR, to);

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
      const next = Math.max(START_MRR, from + (target - from) * e);
      mrrRef.current = next;
      setMrr(next);
      setDelta(deltaLabel(next));
      if (k < 1) raf.current = requestAnimationFrame(step);
      else raf.current = null;
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  const addRow = useCallback(
    (i: number) => {
      const s = i % 3;
      const product = PRODUCTS[(i * 7) % 5]!;
      const amount = AMOUNTS[(i * 3) % 5]!;
      const reduced = prefersReducedMotion();

      setActiveStores((prev) => {
        const next = [...prev];
        next[s] = true;
        return next;
      });

      if (packetsAllowed()) {
        const id = `p-${i}-${Date.now()}`;
        setPackets((p) => [...p, { id, amount, store: s }]);
        timers.current.push(
          window.setTimeout(() => {
            setPackets((p) => p.filter((x) => x.id !== id));
          }, 950),
        );
      }

      timers.current.push(
        window.setTimeout(
          () => {
            const id = `EX-${orderN.current++}`;
            setRows((prev) => {
              const next: Row[] = [
                {
                  id,
                  source: SOURCES[s]!,
                  product,
                  amount,
                  fresh: true,
                },
                ...prev,
              ].slice(0, 9);
              return next;
            });
            tickMrr(mrrRef.current + amount * 4, 700);
            setBarHeights((heights) => {
              const next = [...heights];
              const last = next.length - 1;
              next[last] = Math.min(98, (next[last] ?? 0) + 1.6);
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
          reduced ? 0 : 800,
        ),
      );
    },
    [tickMrr],
  );

  const run = useCallback(() => {
    clearTimers();
    orderN.current = 10450;
    mrrRef.current = START_MRR;
    setMrr(START_MRR);
    setDelta(deltaLabel(START_MRR));
    setRows(SEED_ROWS);
    setActiveStores([false, false, false]);
    setBarHeights(BASE_BARS.map((h) => (h - 40) * 2));
    setPackets([]);

    const reduced = prefersReducedMotion();
    for (let i = 0; i < 14; i++) {
      timers.current.push(
        window.setTimeout(() => addRow(i), reduced ? 0 : 600 + i * 420),
      );
    }
  }, [addRow, clearTimers]);

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
            style={{
              offsetPath: `path("M 150 ${[78, 138, 198][p.store]} C 230 ${[78, 138, 198][p.store]}, 250 160, 330 175")`,
            }}
          >
            +${p.amount}
          </div>
        ))}
      </div>
    </div>
  );
}

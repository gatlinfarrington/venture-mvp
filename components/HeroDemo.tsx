"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BASE_MRR,
  FINAL_MRR,
  FINAL_ROWS,
  LANDING_SPECS,
  MAX_DELTA,
  START_MRR,
  applyLanding,
  buildSeedRows,
  type HeroRow,
} from "@/lib/hero-demo-sequence";

const BASE_BARS = [52, 55, 58, 57, 61, 64, 66, 70, 73, 76, 80, 84];

/** One landing every gapMs after the first; fly completes before the next insert. */
const GAP_MS = 1100;
const FLY_MS = 900;
const START_DELAY_MS = 600;
const SETTLE_PAD_MS = 400;

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
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M10 6a4 4 0 1 1-1.2-2.8M10 1.5v2.5H7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          />
        </svg>
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
  const [mrr, setMrr] = useState(START_MRR);
  const [delta, setDelta] = useState<string | null>(null);
  const [rows, setRows] = useState<HeroRow[]>(() => buildSeedRows());
  const [activeStores, setActiveStores] = useState([false, false, false, false]);
  const [barHeights, setBarHeights] = useState(
    () => BASE_BARS.map((h) => (h - 40) * 2),
  );
  const [packets, setPackets] = useState<
    Array<{ id: string; amount: number; path: string; dissolving?: boolean }>
  >([]);
  const packetBusy = useRef(false);

  function packetPath(storeIndex: number): string {
    const stage = stageRef.current;
    if (!stage) {
      return "M 150 138 C 230 138, 250 160, 330 175";
    }
    const stageRect = stage.getBoundingClientRect();
    const store = stage.querySelectorAll<HTMLElement>(".hero-store")[storeIndex];
    const sheet = stage.querySelector<HTMLElement>(".hero-sheet");
    const table = sheet?.querySelector<HTMLElement>("table");
    const thead = sheet?.querySelector<HTMLElement>("thead");
    if (!store || !sheet || !table || !thead) {
      return "M 150 138 C 230 138, 250 160, 330 175";
    }
    const storeRect = store.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    const headRect = thead.getBoundingClientRect();
    const startX = storeRect.right - stageRect.left + 8;
    const startY = storeRect.top + storeRect.height / 2 - stageRect.top;
    const firstRow = sheet.querySelector<HTMLElement>("tbody tr");
    const rowH = firstRow?.getBoundingClientRect().height ?? 36;
    const endX = tableRect.left - stageRect.left + 12;
    const endY = headRect.bottom - stageRect.top + rowH / 2;
    const midX = startX + (endX - startX) * 0.55;
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

      const dissolveMs = 160;
      const spawnPacket = packetsAllowed() && !packetBusy.current;
      if (spawnPacket) {
        packetBusy.current = true;
        const pid = `p-${index}-${Date.now()}`;
        const path = packetPath(s);
        setPackets([{ id: pid, amount, path }]);
        timers.current.push(
          window.setTimeout(() => {
            setPackets((prev) =>
              prev.map((p) => (p.id === pid ? { ...p, dissolving: true } : p)),
            );
          }, FLY_MS),
        );
        timers.current.push(
          window.setTimeout(() => {
            setPackets([]);
            packetBusy.current = false;
          }, FLY_MS + dissolveMs + 20),
        );
      }

      timers.current.push(
        window.setTimeout(
          () => {
            // Keyed insert at top; drop last row. IDs never collide with seed/landings.
            setRows((prev) => applyLanding(prev, index));
            tickMrr(mrrRef.current + amount, 700);
            setBarHeights((heights) => {
              const next = [...heights];
              const last = next.length - 1;
              next[last] = Math.min(98, (next[last] ?? 0) + 1.2);
              return next;
            });
            timers.current.push(
              window.setTimeout(() => {
                setRows((prev) => prev.map((r) => (r.fresh ? { ...r, fresh: false } : r)));
              }, 1200),
            );
          },
          reduced ? 0 : spawnPacket ? FLY_MS : 0,
        ),
      );
    },
    [tickMrr],
  );

  const run = useCallback(() => {
    clearTimers();
    mrrRef.current = START_MRR;
    setMrr(START_MRR);
    setDelta(null);
    setRows(buildSeedRows());
    setActiveStores([false, false, false, false]);
    setBarHeights(BASE_BARS.map((h) => (h - 40) * 2));
    setPackets([]);
    packetBusy.current = false;

    const reduced = prefersReducedMotion();
    if (reduced) {
      mrrRef.current = FINAL_MRR;
      setMrr(FINAL_MRR);
      setDelta(deltaLabel(FINAL_MRR));
      setRows(FINAL_ROWS);
      setActiveStores([true, true, true, true]);
      setBarHeights(BASE_BARS.map((h) => Math.min(98, (h - 40) * 2 + 14)));
      return;
    }

    for (let i = 0; i < LANDING_SPECS.length; i++) {
      timers.current.push(
        window.setTimeout(() => landOrder(i), START_DELAY_MS + i * GAP_MS),
      );
    }
    const settleAt = START_DELAY_MS + LANDING_SPECS.length * GAP_MS + SETTLE_PAD_MS;
    timers.current.push(
      window.setTimeout(() => {
        setRows(FINAL_ROWS);
        setPackets([]);
        packetBusy.current = false;
      }, settleAt),
    );
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
      <div ref={stageRef} className="hero-stage" data-hero-demo>
        <div className="hero-stores-col">
          <div className="hero-stores" aria-hidden="true">
            {[
              { name: "Lemon Squeezy", store: "example-store" },
              { name: "Polar", store: "example-org" },
              { name: "Gumroad", store: "example-seller" },
              { name: "Stripe", store: "example-acct" },
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
          <DemoFoot onReplay={run} />
        </div>

        <div
          className="hero-sheet-wrap"
          role="img"
          aria-label="Animated example: orders from Lemon Squeezy, Polar, Gumroad and Stripe land in a Google Sheet and the MRR total updates. Example data."
        >
          <div className="hero-sheet" aria-hidden="true">
            <div className="hero-sheet-top">
              <div className="eyebrow">MRR · all sources · example</div>
              <div className="hero-mrr">
                <b>{fmt(mrr)}</b>
                {delta ? <span className="hero-delta">{delta}</span> : null}
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
                  <tr
                    key={r.id}
                    data-row-id={r.id}
                    className={r.fresh ? "new" : undefined}
                  >
                    <td className="mono">{r.id}</td>
                    <td>{r.source}</td>
                    <td className="hero-col-product">{r.product}</td>
                    <td className="n">${r.amount}.00</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {packets.map((p) => (
          <div
            key={p.id}
            className={`hero-packet${p.dissolving ? " is-dissolving" : ""}`}
            style={{ offsetPath: `path("${p.path}")` }}
            aria-hidden="true"
          >
            +${p.amount}
          </div>
        ))}
      </div>
    </div>
  );
}

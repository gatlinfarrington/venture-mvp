"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  FINAL_MRR,
  HERO_LANDINGS,
  MOM_DELTA_LABEL,
  START_MRR,
  applyLanding,
  buildFinalRows,
  buildSeedRows,
  toHeroRow,
  trimOutgoing,
  type HeroRow,
} from "@/lib/hero-demo-sequence";
import { HERO_SEED } from "@/lib/sample-data";

/**
 * Prior months on the cropped axis (kept below BAR_START).
 * Current month grows BAR_START → BAR_END so each mrrDelta tick is ≥~3px on a 72px track.
 */
const PRIOR_BARS = [18, 20, 21, 22, 24, 26, 27, 29, 31, 33, 36];
const BAR_START = 40;
const BAR_END = 92;
const GAP_MS = 1100;
/** In-place chip fade/scale (no flight path). */
const CHIP_MS = 420;
const CHIP_HOLD_MS = 520;
const START_DELAY_MS = 600;
const REST_MS = 2400;
const RESET_MS = 720;
const ROW_SPRING_MS = 360;
const PULSE_MS = 600;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function chipsAllowed() {
  return (
    typeof window !== "undefined" &&
    !prefersReducedMotion() &&
    // Match two-column hero breakpoint (≥1120); chip sits below the MRR number.
    window.matchMedia("(min-width: 1120px)").matches
  );
}

/** Always the 30-day MoM figure from the shared sample dataset. */
function deltaLabel() {
  return MOM_DELTA_LABEL;
}

/** Current-month bar: BAR_START at START_MRR → BAR_END at FINAL_MRR (per-order readable). */
function barPct(mrr: number) {
  const span = FINAL_MRR - START_MRR;
  const progress = span <= 0 ? 1 : (mrr - START_MRR) / span;
  return BAR_START + (BAR_END - BAR_START) * Math.max(0, Math.min(1, progress));
}

/** Whole dollars only (chip still shows +$12.50). */
function formatMrr(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

type DigitCell = { kind: "d"; ch: string; pos: number } | { kind: "s"; ch: string };

function splitMrr(n: number): DigitCell[] {
  const text = formatMrr(n);
  const digits = [...text].filter((c) => c >= "0" && c <= "9");
  let di = 0;
  return [...text].map((ch) => {
    if (ch >= "0" && ch <= "9") {
      const pos = digits.length - 1 - di;
      di += 1;
      return { kind: "d" as const, ch, pos };
    }
    return { kind: "s" as const, ch };
  });
}

function sourceIndex(name: string): number {
  const list = ["Lemon Squeezy", "Polar", "Gumroad", "Stripe"];
  return Math.max(0, list.indexOf(name));
}

function DemoFoot({ onReplay, hidden }: { onReplay: () => void; hidden?: boolean }) {
  if (hidden) return null;
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
  const mrrRef = useRef(START_MRR);
  const transitioning = useRef(false);
  const rowsRef = useRef<HeroRow[]>(buildSeedRows());
  // First paint is START_MRR + seed so the first motion is counting up, not a drop.
  const [mrr, setMrr] = useState(START_MRR);
  const [delta, setDelta] = useState<string | null>(null);
  const [deltaKey, setDeltaKey] = useState(0);
  const [rows, setRows] = useState<HeroRow[]>(() => buildSeedRows());
  const [ghost, setGhost] = useState<HeroRow[] | null>(null);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  /** 'from' = new at -1 / others at prior slots; 'to' = settled indices. */
  const [enterPhase, setEnterPhase] = useState<"from" | "to">("to");
  const [instant, setInstant] = useState(false);
  const [activeStores, setActiveStores] = useState([false, false, false, false]);
  const [pulseStore, setPulseStore] = useState<number | null>(null);
  /** +$ chip beside MRR (fade/scale in place — never flies across the table). */
  const [chips, setChips] = useState<
    Array<{ id: string; amount: number; dissolving?: boolean }>
  >([]);
  const [reduced, setReduced] = useState(false);

  // Before paint: reduced-motion visitors must land on FINAL, never see START→FINAL drop.
  useLayoutEffect(() => {
    if (!prefersReducedMotion()) return;
    /* eslint-disable react-hooks/set-state-in-effect -- intentional first-paint sync for a11y */
    setReduced(true);
    mrrRef.current = FINAL_MRR;
    setMrr(FINAL_MRR);
    setDelta(deltaLabel());
    const finalRows = buildFinalRows();
    setRows(finalRows);
    rowsRef.current = finalRows;
    setActiveStores([true, true, true, true]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const finishInstant = useCallback(() => {
    setInstant(true);
    setEnteringId(null);
    setEnterPhase("to");
    setRows((prev) => trimOutgoing(prev).map((r) => ({ ...r, fresh: false })));
    transitioning.current = false;
    requestAnimationFrame(() => setInstant(false));
  }, []);

  const landOrder = useCallback(
    (index: number) => {
      const order = HERO_LANDINGS[index];
      if (!order) return;
      const s = sourceIndex(order.source);
      const mrrTick = order.mrrDelta ?? 0;
      // Pill and counter share the same MRR delta (not order amount).
      const pillDelta = mrrTick > 0 ? mrrTick : 0;

      if (transitioning.current) finishInstant();

      setActiveStores((prev) => {
        const next = [...prev];
        next[s] = true;
        return next;
      });
      setPulseStore(s);
      timers.current.push(window.setTimeout(() => setPulseStore(null), PULSE_MS));

      // Fade/scale chip in place beside MRR (same beat as row + counter — no flight).
      const spawnChip = chipsAllowed() && pillDelta > 0;
      if (spawnChip) {
        const pid = `p-${index}`;
        setChips([{ id: pid, amount: pillDelta }]);
        timers.current.push(
          window.setTimeout(() => {
            setChips((prev) =>
              prev.map((p) => (p.id === pid ? { ...p, dissolving: true } : p)),
            );
          }, CHIP_MS + CHIP_HOLD_MS),
        );
        timers.current.push(
          window.setTimeout(() => setChips([]), CHIP_MS + CHIP_HOLD_MS + 180),
        );
      }

      transitioning.current = true;
      const newId = order.id;
      // Mount at prior slots (new at -1, others at 0..8), then spring to 0..9.
      setInstant(true);
      setEnteringId(newId);
      setEnterPhase("from");
      setRows((prev) => applyLanding(trimOutgoing(prev), index));

      if (mrrTick !== 0) {
        const next = Math.min(FINAL_MRR, Math.round((mrrRef.current + mrrTick) * 100) / 100);
        mrrRef.current = next;
        setMrr(next);
        setDelta(deltaLabel());
        setDeltaKey((k) => k + 1);
      }
      // Last landing: force exact FINAL so the read-out never stalls mid-climb.
      if (index === HERO_LANDINGS.length - 1) {
        mrrRef.current = FINAL_MRR;
        setMrr(FINAL_MRR);
        setDelta(deltaLabel());
      }

      // Double rAF so the 'from' positions paint with transition:none first.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setInstant(false);
          setEnterPhase("to");
        });
      });

      timers.current.push(
        window.setTimeout(() => {
          setEnteringId(null);
          setRows((prev) => trimOutgoing(prev).map((r) => ({ ...r, fresh: false })));
          transitioning.current = false;
        }, ROW_SPRING_MS + 40),
      );
    },
    [finishInstant],
  );

  const scheduleLoopRef = useRef<() => void>(() => {});

  const resetAndRestart = useCallback(
    (thenRun: () => void) => {
      clearTimers();
      setChips([]);
      setPulseStore(null);
      // Ghost out → live in (sequential). Digit strips roll START via CSS transition.
      const frozen = trimOutgoing(rowsRef.current).map((r) => ({ ...r, fresh: false }));
      setGhost(frozen);
      setInstant(true);
      setEnteringId(null);
      setEnterPhase("to");
      setRows(HERO_SEED.map((o) => toHeroRow(o)));
      rowsRef.current = HERO_SEED.map((o) => toHeroRow(o));
      transitioning.current = false;
      setActiveStores([false, false, false, false]);
      setDelta(null);
      // Roll MRR down over RESET_MS (no snap from FINAL → START).
      const from = mrrRef.current;
      const steps = 16;
      for (let i = 1; i <= steps; i++) {
        timers.current.push(
          window.setTimeout(() => {
            const v =
              i === steps
                ? START_MRR
                : Math.round(from + (START_MRR - from) * (i / steps));
            mrrRef.current = v;
            setMrr(v);
          }, Math.round((RESET_MS * i) / steps)),
        );
      }
      requestAnimationFrame(() => setInstant(false));
      // Ghost anim 160ms; live after-reset starts at 140ms for 220ms → clear after both.
      timers.current.push(window.setTimeout(() => setGhost(null), 200));
      timers.current.push(window.setTimeout(thenRun, RESET_MS));
    },
    [clearTimers],
  );

  const scheduleLoop = useCallback(() => {
    clearTimers();
    for (let i = 0; i < HERO_LANDINGS.length; i++) {
      timers.current.push(
        window.setTimeout(() => landOrder(i), START_DELAY_MS + i * GAP_MS),
      );
    }
    const restAt = START_DELAY_MS + HERO_LANDINGS.length * GAP_MS + REST_MS;
    timers.current.push(
      window.setTimeout(() => {
        resetAndRestart(() => scheduleLoopRef.current());
      }, restAt),
    );
  }, [clearTimers, landOrder, resetAndRestart]);

  useEffect(() => {
    scheduleLoopRef.current = scheduleLoop;
  }, [scheduleLoop]);

  const run = useCallback(() => {
    clearTimers();
    setChips([]);
    setPulseStore(null);
    setInstant(true);
    setEnteringId(null);
    setEnterPhase("to");
    setRows((prev) => trimOutgoing(prev).map((r) => ({ ...r, fresh: false })));
    transitioning.current = false;
    requestAnimationFrame(() => setInstant(false));

    if (prefersReducedMotion()) {
      setReduced(true);
      mrrRef.current = FINAL_MRR;
      setMrr(FINAL_MRR);
      setDelta(deltaLabel());
      const finalRows = buildFinalRows();
      setRows(finalRows);
      rowsRef.current = finalRows;
      setGhost(null);
      setActiveStores([true, true, true, true]);
      setEnteringId(null);
      return;
    }

    setReduced(false);
    resetAndRestart(() => {
      mrrRef.current = START_MRR;
      setMrr(START_MRR);
      setDelta(null);
      const seed = buildSeedRows();
      setRows(seed);
      rowsRef.current = seed;
      setActiveStores([false, false, false, false]);
      scheduleLoopRef.current();
    });
  }, [clearTimers, resetAndRestart]);

  // First paint: seed (or final under reduced motion), then start.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    setReduced(prefersReducedMotion());

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
      // Already on START_MRR + seed; short delay then count up (no drop).
      startTimer = window.setTimeout(() => {
        started = true;
        startTimer = null;
        scheduleLoopRef.current();
      }, 400);
    };

    const stop = () => {
      // Once the loop has started, keep it running (pause only via visibility).
      if (started) {
        if (!pageVisible) clearTimers();
        return;
      }
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
      // threshold 0: phone layouts often never reach 0.2 while the hero is on screen.
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
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
  }, [clearTimers, resetAndRestart, run]);

  const digits = splitMrr(mrr);
  const lastBar = barPct(mrr);
  const digitMs = reduced
    ? 0
    : typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches
      ? 220
      : 260;

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
                className={`hero-store${activeStores[i] ? " on" : ""}${pulseStore === i ? " pulse" : ""}`}
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
                <div className="hero-mrr-line">
                  <b className="hero-mrr-num">
                    <span className="sr-only">{formatMrr(mrr)}</span>
                    {digits.map((c, i) =>
                      c.kind === "s" ? (
                        <span key={`s-${i}`} className="s" aria-hidden="true">
                          {c.ch}
                        </span>
                      ) : (
                        <span
                          key={`d-${i}`}
                          className="d"
                          aria-hidden="true"
                          style={
                            {
                              "--digit-ms": `${digitMs}ms`,
                              "--p": c.pos,
                            } as CSSProperties
                          }
                        >
                          {/* Reel face: slide up 40% with spring + stagger (not a grey fade). */}
                          <span key={c.ch} className="d-face">
                            {c.ch}
                          </span>
                        </span>
                      ),
                    )}
                  </b>
                  {delta ? (
                    <span key={deltaKey} className="hero-delta">
                      {delta}
                    </span>
                  ) : null}
                </div>
                <div className="hero-mrr-chip-slot" aria-hidden="true">
                  {chips.map((p) => (
                    <span
                      key={p.id}
                      className={`hero-packet${p.dissolving ? " is-dissolving" : ""}`}
                      data-hero-packet
                    >
                      +${p.amount.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="hero-bars" data-baseline>
                {PRIOR_BARS.map((h, i) => (
                  <i key={i} style={{ height: `${h}%` }} />
                ))}
                <i className="signal" style={{ height: `${lastBar}%` }} />
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
              <tbody
                className={`hero-rows${ghost ? " after-reset" : ""}`}
                data-hero-live-rows
              >
                {rows.map((r, i) => {
                  const entering = enteringId === r.id;
                  // from: new at -1, others at i-1 (prior slots). to: index i.
                  const iVar =
                    enterPhase === "from" ? (entering ? -1 : i - 1) : i;
                  return (
                    <tr
                      key={r.id}
                      data-row-id={r.id}
                      className={[
                        "hero-row",
                        r.fresh ? "new" : "",
                        entering && enterPhase === "from" ? "is-enter" : "",
                        instant ? "is-instant" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ "--i": iVar } as CSSProperties}
                    >
                      <td className="mono">{r.id}</td>
                      <td>{r.source}</td>
                      <td className="hero-col-product">{r.product}</td>
                      <td className="n">${r.amount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {ghost ? (
                <tbody
                  className="hero-rows-ghost"
                  aria-hidden="true"
                  data-hero-ghost-rows
                >
                  {ghost.map((r, i) => (
                    <tr
                      key={`g-${r.id}`}
                      className="hero-ghost-row"
                      style={{ "--i": i } as CSSProperties}
                    >
                      <td className="mono">{r.id}</td>
                      <td>{r.source}</td>
                      <td className="hero-col-product">{r.product}</td>
                      <td className="n">${r.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              ) : null}
            </table>
          </div>
        </div>

        <DemoFoot onReplay={run} hidden={reduced} />
      </div>
    </div>
  );
}

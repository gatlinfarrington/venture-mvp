import { describe, expect, it } from "vitest";
import {
  blurRadiusOfShadowLayer,
  evaluateA1GlowShadow,
  isAllowedHeroStoreHardRing,
} from "../scripts/design-check.mjs";

const A1 = true;

describe("A1 hero-store hard-ring exception", () => {
  it("allows the live blur-0 ink ring on hero-store keyframes", () => {
    const line = "box-shadow: 0 0 0 8px transparent;";
    expect(
      isAllowedHeroStoreHardRing({
        line,
        keyframesName: "hero-store-pulse-ring",
      }),
    ).toBe(true);
    expect(
      evaluateA1GlowShadow({
        line,
        hasA1Exception: A1,
        keyframesName: "hero-store-pulse-ring",
      }),
    ).toEqual({ allowed: true });
  });

  it("allows color-mix ink start state on .hero-store", () => {
    const line =
      "box-shadow: 0 0 0 0 color-mix(in srgb, var(--c-ink) 40%, transparent);";
    expect(
      evaluateA1GlowShadow({
        line,
        hasA1Exception: A1,
        selectorCtx: ".hero-store.pulse",
      }).allowed,
    ).toBe(true);
  });

  it("fails blur above 0 even with an A1 exception on .hero-store", () => {
    const line = "box-shadow: 0 0 8px var(--c-ink);";
    expect(blurRadiusOfShadowLayer("0 0 8px var(--c-ink)")).toBe(8);
    const result = evaluateA1GlowShadow({
      line,
      hasA1Exception: A1,
      selectorCtx: ".hero-store.pulse",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/blur radius 0/i);
  });

  it("fails green/accent shadow even with an A1 exception on .hero-store", () => {
    const line = "box-shadow: 0 0 0 8px var(--c-signal);";
    const result = evaluateA1GlowShadow({
      line,
      hasA1Exception: A1,
      selectorCtx: ".hero-store.pulse",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/ink\/neutral/i);
  });

  it("fails hard rings on any selector other than .hero-store", () => {
    const line = "box-shadow: 0 0 0 8px var(--c-ink);";
    const result = evaluateA1GlowShadow({
      line,
      hasA1Exception: A1,
      selectorCtx: ".cta-band",
      keyframesName: "",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/\.hero-store/i);
  });

  it("still fails glow shadows without an A1 exception", () => {
    const result = evaluateA1GlowShadow({
      line: "box-shadow: 0 0 0 8px transparent;",
      hasA1Exception: false,
      keyframesName: "hero-store-pulse-ring",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/glow-like shadow disallowed/i);
  });
});

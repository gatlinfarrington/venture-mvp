"use client";

import { useEffect } from "react";

/** Enable hero entrance motion only when JS runs and motion is allowed. */
export function HeroRevealBoot() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelectorAll(".hero-reveal").forEach((el) => {
      el.classList.add("reveal-motion");
    });
  }, []);
  return null;
}

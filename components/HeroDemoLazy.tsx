"use client";

import { HeroDemo } from "@/components/HeroDemo";

/**
 * Client wrapper so the hero loop hydrates and IntersectionObserver runs.
 */
export function HeroDemoLazy() {
  return <HeroDemo />;
}

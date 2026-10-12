"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "li" | "tr";
  delay?: number;
};

/**
 * IntersectionObserver reveal per MOTION.md: once, 15% visible.
 * Content stays visible without JS / without html.motion (crawlers, reduced
 * motion, full-page captures). Above-the-fold elements get is-visible at mount
 * with transition:none so they never flash hidden.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
  delay = 0,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !document.documentElement.classList.contains("motion")
    ) {
      el.classList.add("is-visible");
      return;
    }

    // Above the fold: show immediately with no entrance transition.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.style.transition = "none";
      el.classList.add("is-visible");
      requestAnimationFrame(() => {
        el.style.transition = "";
      });
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`reveal ${className ?? ""}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

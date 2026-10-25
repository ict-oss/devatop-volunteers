"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

/** Hand-drawn ink arrow. Drawn as SVG so it can ink itself in (data-draw). */
export function InkArrow({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg data-draw viewBox="0 0 160 90" className={className} style={flip ? { transform: "scaleX(-1)" } : undefined} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10 C 66 4, 98 28, 84 70" />
      <path d="M96 62 L 83 76 L 78 57" />
    </svg>
  );
}

/** Rough circle drawn around a number (e.g. slots left). */
export function InkCircle({ className = "" }: { className?: string }) {
  return (
    <svg data-draw viewBox="0 0 120 70" className={className} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" aria-hidden="true" preserveAspectRatio="none">
      <path d="M62 6 C 24 4, 4 22, 8 38 C 12 58, 52 66, 84 62 C 112 58, 118 34, 100 18 C 90 10, 74 6, 52 8" />
    </svg>
  );
}

/** Hours as tally marks: groups of five, one mark per hour (capped; label carries the real number). */
export function Tally({ hours, className = "", cap = 60, animate = true }: { hours: number; className?: string; cap?: number; animate?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const n = Math.min(Math.round(hours), cap);
  const groups = Math.ceil(n / 5) || 1;
  const gw = 46;
  const w = Math.max(groups * gw, gw);
  const marks: React.ReactNode[] = [];
  for (let g = 0; g < groups; g++) {
    const inGroup = Math.min(5, n - g * 5);
    const x0 = g * gw + 4;
    for (let i = 0; i < Math.min(inGroup, 4); i++) marks.push(<path key={`${g}-${i}`} d={`M${x0 + i * 9} 6 L${x0 + i * 9 + 1.5} 44`} />);
    if (inGroup === 5) marks.push(<path key={`${g}-s`} d={`M${x0 - 3} 36 L${x0 + 38} 12`} />);
  }
  useEffect(() => {
    if (!animate || prefersReducedMotion() || !ref.current) return;
    const paths = ref.current.querySelectorAll("path");
    const t = gsap.from(paths, { drawSVG: "0%", duration: 0.5, stagger: 0.07, ease: "power2.out", scrollTrigger: { trigger: ref.current, start: "top 92%", once: true } });
    return () => { t.scrollTrigger?.kill(); t.kill(); };
  }, [n, animate]);
  return (
    <svg ref={ref} viewBox={`0 0 ${w} 50`} className={className} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" role="img" aria-label={`${hours} hours`}>
      {marks}
    </svg>
  );
}

export function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 L9.5 18 L20 6" /></svg>
  );
}

export function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12 H20 M13 5 L20 12 L13 19" /></svg>
  );
}

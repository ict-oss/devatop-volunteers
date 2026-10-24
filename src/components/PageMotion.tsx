"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import Lenis from "lenis";
import { DURATION, EASE, STAGGER, hasFinePointer, prefersReducedMotion } from "@/lib/motion";
import { useMagnetic } from "./Cursor";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

/**
 * One component drives all public-site motion from data attributes, so pages stay declarative:
 *  data-mask   headline lines slide up from behind a mask
 *  data-reveal fades/rises a block once
 *  data-wipe   orange field wipes in from the left
 *  data-count  counts up to its value (data-count="1236")
 *  data-draw   child <path>s ink themselves in (hand-drawn arrows, tally marks)
 * Only position, scale and opacity animate. Reduced motion => everything simply appears.
 */
export function PageMotion() {
  const path = usePathname();
  useMagnetic();

  // smooth scroll: desktop with a fine pointer only
  useEffect(() => {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.12 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const once = (el: Element) => ({ trigger: el, start: "top 88%", once: true });

      gsap.utils.toArray<HTMLElement>("[data-mask]").forEach((el) => {
        const inner = document.createElement("span");
        inner.style.display = "block";
        while (el.firstChild) inner.appendChild(el.firstChild);
        el.appendChild(inner);
        el.style.overflow = "hidden";
        el.style.paddingBottom = "0.08em";
        gsap.from(inner, { yPercent: 110, duration: DURATION.base, ease: EASE, scrollTrigger: once(el) });
      });
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el, i) => {
        gsap.from(el, { y: 28, opacity: 0, duration: DURATION.base, ease: EASE, delay: (i % 3) * 0.04, scrollTrigger: once(el) });
      });
      gsap.utils.toArray<HTMLElement>("[data-wipe]").forEach((el) => {
        gsap.from(el, { scaleX: 0, transformOrigin: "0 50%", duration: DURATION.slow, ease: EASE, scrollTrigger: once(el) });
      });
      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const end = Number(el.dataset.count); const o = { v: 0 };
        gsap.to(o, { v: end, duration: DURATION.slow + 0.4, ease: "power2.out", scrollTrigger: once(el), onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString("en-NG"); } });
      });
      gsap.utils.toArray<HTMLElement>("[data-draw]").forEach((el) => {
        const paths = el.querySelectorAll("path, line");
        gsap.from(paths, { drawSVG: "0%", duration: DURATION.slow, stagger: STAGGER * 2, ease: "power2.inOut", scrollTrigger: once(el) });
      });
      gsap.utils.toArray<HTMLElement>("[data-ticker]").forEach((el) => {
        const w = el.scrollWidth / 2;
        const tw = gsap.to(el, { x: -w, duration: Number(el.dataset.ticker) || 60, ease: "none", repeat: -1 });
        el.addEventListener("mouseenter", () => tw.pause());
        el.addEventListener("mouseleave", () => tw.resume());
        ScrollTrigger.create({ onUpdate: (self) => { gsap.to(tw, { timeScale: 1 + Math.min(Math.abs(self.getVelocity()) / 800, 3), duration: 0.3, overwrite: true }); gsap.to(tw, { timeScale: 1, duration: 0.8, delay: 0.3 }); } });
      });
    });
    const refresh = setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => { clearTimeout(refresh); ctx.revert(); };
  }, [path]);

  return null;
}

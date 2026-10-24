"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { hasFinePointer, prefersReducedMotion } from "@/lib/motion";

/** ~60 lines, no library. Ink dot + orange ring that grows into a disc carrying a verb. Public site only. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");
    const d = dot.current!, r = ring.current!, l = label.current!;
    gsap.set([d, r], { xPercent: 0, x: -100, y: -100 });
    const dx = gsap.quickTo(d, "x", { duration: 0.05 }), dy = gsap.quickTo(d, "y", { duration: 0.05 });
    const rx = gsap.quickTo(r, "x", { duration: 0.35, ease: "power3.out" }), ry = gsap.quickTo(r, "y", { duration: 0.35, ease: "power3.out" });
    const move = (e: MouseEvent) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); };
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, label, [data-native]")) {
        root.classList.add("native-cursor"); r.classList.add("hide"); d.classList.add("hide"); return;
      }
      root.classList.remove("native-cursor"); r.classList.remove("hide"); d.classList.remove("hide");
      const el = t.closest<HTMLElement>("[data-cursor]");
      const verb = el?.dataset.cursor || (t.closest("a,button") ? "Go" : "");
      if (verb) {
        l.textContent = verb; r.classList.add("on");
        gsap.to(r, { width: 84, height: 84, marginLeft: -42, marginTop: -42, duration: 0.4, ease: "power3.out", overwrite: "auto" });
      } else {
        r.classList.remove("on");
        gsap.to(r, { width: 34, height: 34, marginLeft: -17, marginTop: -17, duration: 0.4, ease: "power3.out", overwrite: "auto" });
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseover", over); root.classList.remove("has-cursor", "native-cursor"); };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true"><span ref={label} /></div>
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  );
}

/** Buttons lean a few pixels toward the cursor, then settle. No springing. */
export function useMagnetic() {
  useEffect(() => {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]"));
    const cleanups = els.map((el) => {
      const mv = (e: MouseEvent) => {
        const b = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - (b.left + b.width / 2)) * 0.18, y: (e.clientY - (b.top + b.height / 2)) * 0.25, duration: 0.4, ease: "power3.out" });
      };
      const lv = () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "power3.out" });
      el.addEventListener("mousemove", mv); el.addEventListener("mouseleave", lv);
      return () => { el.removeEventListener("mousemove", mv); el.removeEventListener("mouseleave", lv); };
    });
    return () => cleanups.forEach((c) => c());
  });
}

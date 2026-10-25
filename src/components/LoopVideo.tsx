"use client";
import { useEffect, useRef, useState } from "react";
import { VIDEOS, videoSrc } from "@/lib/images";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * A short silent looping clip. Light on data: nothing but the small poster loads until the clip is on screen,
 * and it never plays for people with reduced motion, Data Saver, or a slow (2G/3G) connection: they keep the poster.
 */
export function LoopVideo({ slot, className = "", label }: { slot: string; className?: string; label: string }) {
  const def = VIDEOS[slot];
  const ref = useRef<HTMLVideoElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (prefersReducedMotion() || c?.saveData || (c?.effectiveType && /^(slow-2g|2g|3g)$/.test(c.effectiveType))) return;
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setPlay(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = ref.current; if (!v) return;
    if (play) { v.preload = "auto"; v.play().catch(() => {}); } else v.pause();
  }, [play]);

  if (!def) return null;
  const s = videoSrc(slot);
  return (
    <div className={`relative overflow-hidden border-2 border-ink bg-ink ${className}`} style={{ aspectRatio: def.ratio }}>
      <video key={s.mp4 ?? s.webm} ref={ref} muted loop playsInline preload="none" poster={s.poster} aria-label={label} className="absolute inset-0 w-full h-full object-cover">
        {s.webm && <source src={s.webm} type="video/webm" />}
        {s.mp4 && <source src={s.mp4} type="video/mp4" />}
      </video>
    </div>
  );
}

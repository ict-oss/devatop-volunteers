"use client";
import { useEffect, useRef } from "react";
import { VIDEOS, videoSrc } from "@/lib/images";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * A short silent looping clip that plays the whole time the page is open (the clips are tiny, so there is no reason to hold them back).
 * The one exception is people who asked their device for reduced motion: they keep the still frame.
 * Phones only allow autoplay for silent clips, so it is muted and inline; if a phone still refuses (for example Low Power Mode),
 * it starts at the visitor's first tap or scroll instead.
 */
export function LoopVideo({ slot, className = "", label }: { slot: string; className?: string; label: string }) {
  const def = VIDEOS[slot];
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (prefersReducedMotion()) { v.pause(); v.currentTime = 0; return; } // asked for less motion: keep the still frame
    const start = () => { if (v.paused) v.play().catch(() => {}); };
    start();
    v.addEventListener("canplay", start);
    document.addEventListener("visibilitychange", start); // coming back to the tab
    const once = { once: true, passive: true } as const;
    window.addEventListener("pointerdown", start, once); window.addEventListener("touchstart", start, once); window.addEventListener("scroll", start, once); // last resort when a phone blocked autoplay
    return () => { v.removeEventListener("canplay", start); document.removeEventListener("visibilitychange", start); window.removeEventListener("pointerdown", start); window.removeEventListener("touchstart", start); window.removeEventListener("scroll", start); };
  }, []);

  if (!def) return null;
  const s = videoSrc(slot);
  return (
    <div className={`relative overflow-hidden border-2 border-ink bg-ink ${className}`} style={{ aspectRatio: def.ratio }}>
      <video key={s.mp4 ?? s.webm} ref={ref} autoPlay muted loop playsInline preload="auto" poster={s.poster} aria-label={label} className="absolute inset-0 w-full h-full object-cover">
        {s.webm && <source src={s.webm} type="video/webm" />}
        {s.mp4 && <source src={s.mp4} type="video/mp4" />}
      </video>
    </div>
  );
}

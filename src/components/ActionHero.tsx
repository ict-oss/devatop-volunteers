"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { DURATION, EASE, STAGGER, prefersReducedMotion } from "@/lib/motion";
import { photoSrc, HERO_PHOTOS_IN_LETTERS } from "@/lib/images";
import { probePhoto } from "./Photo";

const WORD = "ACTION".split("");
const HATCH = ["hatch-a", "hatch-b", "hatch-c"];
const SLOT_IDS = ["hero-1", "hero-2", "hero-3"];

/**
 * ACTION set big, hard left, always fully visible (never cropped). Three photo layers show through the letters
 * and cross-fade slowly. Until real photos exist, each layer shows a hatched placeholder.
 * Each letter carries the same word-sized background so the photo reads as one image across the word.
 */
export function ActionHero() {
  const wrap = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const solid = !HERO_PHOTOS_IN_LETTERS;
  const [have, setHave] = useState<boolean[]>([false, false, false]);
  const [size, setSize] = useState(0); // px font-size
  const [dims, setDims] = useState({ w: 0, h: 0, offs: [] as number[] });

  useEffect(() => { if (!HERO_PHOTOS_IN_LETTERS) return; SLOT_IDS.forEach((id, i) => probePhoto(id).then((ok) => ok && setHave((h) => h.map((v, j) => (j === i ? true : v))))); }, []);

  // size the word so all of ACTION fits; then measure each letter's offset
  useLayoutEffect(() => {
    const fit = async () => {
      if (!wrap.current || !word.current) return;
      try { await document.fonts.ready; } catch {}
      const probe = document.createElement("div");
      probe.className = "display";
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;line-height:1";
      probe.textContent = "ACTION";
      document.body.appendChild(probe);
      const natural = probe.getBoundingClientRect().width; probe.remove();
      // as big as it can be while the whole word, including the final N, stays inside the page
      const fs = (wrap.current.clientWidth * 0.97 / natural) * 100;
      setSize(fs);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useLayoutEffect(() => {
    if (!word.current || !size) return;
    const first = word.current.querySelector<HTMLElement>("[data-layer='0']");
    if (!first) return;
    const box = first.getBoundingClientRect();
    const letters = Array.from(first.querySelectorAll<HTMLElement>(".hero-letter"));
    setDims({ w: box.width, h: box.height, offs: letters.map((l) => l.getBoundingClientRect().left - box.left) });
  }, [size]);

  // entrance (once, <1.2s) + slow cross-fade between photo layers
  useEffect(() => {
    if (!size) return;
    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) return;
      gsap.from(".hero-letter", { yPercent: 110, duration: DURATION.slow - 0.2, ease: EASE, stagger: STAGGER });
      if (solid) return;
      const tl = gsap.timeline({ repeat: -1, delay: 2 });
      tl.to("[data-layer='1']", { opacity: 1, duration: DURATION.slow, ease: "none" }, "+=2.6")
        .to("[data-layer='2']", { opacity: 1, duration: DURATION.slow, ease: "none" }, "+=2.6")
        .to(["[data-layer='1']", "[data-layer='2']"], { opacity: 0, duration: DURATION.slow, ease: "none" }, "+=2.6");
    }, wrap);
    return () => ctx.revert();
  }, [size]);

  return (
    <div ref={wrap} className="relative overflow-hidden" data-cursor="Join">
      <div ref={word} className="relative" style={{ fontSize: size ? `${size}px` : "30vw", visibility: size ? "visible" : "hidden" }}>
        {(solid ? [0] : [0, 1, 2]).map((l) => (
          <div key={l} data-layer={l} aria-hidden={l > 0 ? true : undefined} className={`display whitespace-nowrap overflow-hidden ${l > 0 ? "absolute inset-0" : ""}`} style={{ opacity: l === 0 ? 1 : 0, lineHeight: 0.9, paddingTop: "0.02em" }}>
            {l === 0 && <span className="sr-only">Action</span>}
            {WORD.map((c, i) => (
              <span key={i} className={`hero-letter inline-block ${solid ? "text-orange" : `text-transparent ${have[l] ? "" : HATCH[l]}`}`} aria-hidden={true}
                style={solid ? undefined : {
                  WebkitBackgroundClip: "text", backgroundClip: "text",
                  backgroundImage: have[l] ? `url(${photoSrc(SLOT_IDS[l])})` : undefined,
                  backgroundSize: dims.w ? `${dims.w}px ${dims.h}px` : "cover",
                  backgroundPosition: dims.offs[i] != null ? `-${dims.offs[i]}px 0` : "0 0",
                  filter: have[l] ? "grayscale(1) contrast(1.2)" : undefined,
                }}>{c}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

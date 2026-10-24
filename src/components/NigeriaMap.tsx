"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MAP_H, MAP_W, STATES } from "@/lib/nigeria-map";
import { STATE_HOURS, money } from "@/lib/data";
import { photoSrc } from "@/lib/images";
import { prefersReducedMotion } from "@/lib/motion";
import { usePhoto } from "./Photo";

gsap.registerPlugin(ScrollTrigger);

/**
 * Nigeria map filled with volunteer photos (slot: map-fill). States where volunteers have worked
 * burn orange one after another as the map scrolls into view; pointing at a state shows its hours.
 */
export function NigeriaMap() {
  const root = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const has = usePhoto("map-fill");
  const st = STATES.find((s) => s.id === active);

  useEffect(() => {
    if (prefersReducedMotion() || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".state-hot", { opacity: 0, duration: 0.5, stagger: 0.07, ease: "power2.out", scrollTrigger: { trigger: root.current, start: "top 75%", once: true } });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative">
      <svg ref={root} viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full h-auto block" role="img" aria-label="Map of Nigeria. States where Devatop volunteers have worked are orange.">
        <defs>
          <pattern id="mapfill" patternUnits="userSpaceOnUse" width={MAP_W} height={MAP_H}>
            <rect width={MAP_W} height={MAP_H} fill="#cfc8ba" />
            {!has && <path d={`M0 ${MAP_H} L${MAP_W} 0`} stroke="#16130F" strokeOpacity=".12" strokeWidth="2" />}
            {has && <image href={photoSrc("map-fill")} width={MAP_W} height={MAP_H} preserveAspectRatio="xMidYMid slice" style={{ filter: "grayscale(1) contrast(1.2)" }} />}
          </pattern>
          <pattern id="mapHatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
            <rect width="14" height="14" fill="#d9d2c3" /><rect width="2.5" height="14" fill="#16130F" fillOpacity=".22" />
          </pattern>
        </defs>
        <g>
          {STATES.map((s) => (
            <path key={s.id} d={s.d} fill={has ? "url(#mapfill)" : "url(#mapHatch)"} stroke="#F2EDE3" strokeWidth="1.2" strokeLinejoin="round" />
          ))}
        </g>
        <g>
          {STATES.map((s) => {
            const hot = STATE_HOURS[s.id] != null;
            return (
              <path key={s.id} d={s.d} className={hot ? "state-hot" : undefined} data-cursor="See" tabIndex={0} aria-label={`${s.name}: ${hot ? money(STATE_HOURS[s.id]) + " hours" : "no hours yet"}`}
                fill={hot ? "#F05023" : "transparent"} stroke={active === s.id ? "#16130F" : "#F2EDE3"} strokeWidth={active === s.id ? 2.5 : 1.2} strokeLinejoin="round"
                onMouseEnter={() => setActive(s.id)} onFocus={() => setActive(s.id)} onClick={() => setActive(s.id)} onMouseLeave={() => setActive(null)} onBlur={() => setActive(null)}
                style={{ transition: "stroke .2s" }} />
            );
          })}
        </g>
      </svg>
      <div className="pointer-events-none absolute left-0 top-0 min-h-[4.5rem] bg-ink text-paper px-4 py-3" style={{ opacity: st ? 1 : 0.0001 }} aria-live="polite">
        <div className="display text-3xl leading-none">{st?.name ?? "—"}</div>
        <div className="text-sm mt-1">{st ? (STATE_HOURS[st.id] ? `${money(STATE_HOURS[st.id])} hours given` : "No volunteer hours here yet — be the first") : ""}</div>
      </div>
    </div>
  );
}

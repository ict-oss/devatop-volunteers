"use client";
import { useEffect, useState } from "react";
import { PHOTOS_CHANGED, SLOTS, photoOverride, photoSrc } from "@/lib/images";

const cache = new Map<string, boolean>();
let manifest: Promise<Set<string>> | null = null;

// One tiny request (written by `npm run photos`) tells us which slots have a file,
// so empty slots never fire a 404 and visitors on paid data waste nothing.
const loadManifest = () =>
  (manifest ??= fetch("/photos/manifest.json").then((r) => (r.ok ? r.json() : [])).then((a: string[]) => new Set(a)).catch(() => new Set<string>()));

export async function probePhoto(id: string): Promise<boolean> {
  if (photoOverride(id)) return true; // an admin's replacement always counts
  if (cache.has(id)) return cache.get(id)!;
  const ok = (await loadManifest()).has(id);
  cache.set(id, ok);
  return ok;
}

export function usePhoto(id: string) {
  const [ok, setOk] = useState<boolean | null>(cache.has(id) ? cache.get(id)! : null);
  const [, bump] = useState(0);
  useEffect(() => {
    let live = true;
    const check = () => probePhoto(id).then((v) => { if (live) { setOk(v); bump((n) => n + 1); } });
    check();
    window.addEventListener(PHOTOS_CHANGED, check); // an admin replaced an image in this browser
    return () => { live = false; window.removeEventListener(PHOTOS_CHANGED, check); };
  }, [id]);
  return ok;
}

/** A named image slot. Shows the photo if /public/photos/<id>.webp exists, otherwise a labelled placeholder. */
export function Photo({ slot, className = "", alt, ratio, duotone, priority }: { slot: string; className?: string; alt?: string; ratio?: string; duotone?: boolean; priority?: boolean }) {
  const def = SLOTS[slot];
  const ok = usePhoto(slot);
  const isDuo = duotone ?? def?.duotone;
  const empty = ok !== true;
  return (
    <div className={`photo ${empty ? "empty" : ""} ${isDuo ? "duotone" : ""} ${className}`} style={{ aspectRatio: ratio ?? def?.ratio }} data-slot={slot} role={alt ? "img" : undefined} aria-label={alt} aria-hidden={alt ? undefined : true}>
      {ok === true && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoSrc(slot)} alt="" loading={priority ? "eager" : "lazy"} decoding="async" />
      )}
      <div className="slot-label">
        PHOTO SLOT · {slot}{def ? ` · ${def.ratio.replace("/", ":")}` : ""}{empty ? " · drop file in /public/photos" : ""}
      </div>
    </div>
  );
}

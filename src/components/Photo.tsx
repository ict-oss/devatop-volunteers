"use client";
import { useEffect, useState } from "react";
import { SLOTS, photoSrc } from "@/lib/images";

const cache = new Map<string, boolean>();
let manifest: Promise<Set<string>> | null = null;

// One tiny request (written by `npm run photos`) tells us which slots have a file,
// so empty slots never fire a 404 and visitors on paid data waste nothing.
const loadManifest = () =>
  (manifest ??= fetch("/photos/manifest.json").then((r) => (r.ok ? r.json() : [])).then((a: string[]) => new Set(a)).catch(() => new Set<string>()));

export async function probePhoto(id: string): Promise<boolean> {
  if (cache.has(id)) return cache.get(id)!;
  const ok = (await loadManifest()).has(id);
  cache.set(id, ok);
  return ok;
}

export function usePhoto(id: string) {
  const [ok, setOk] = useState<boolean | null>(cache.has(id) ? cache.get(id)! : null);
  useEffect(() => { let live = true; probePhoto(id).then((v) => live && setOk(v)); return () => { live = false; }; }, [id]);
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

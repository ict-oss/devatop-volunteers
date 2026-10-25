"use client";
import { useEffect, useState } from "react";
import { PHOTOS_CHANGED, SLOTS, VIDEOS, photoOverride, photoSrc, setPhotoOverride, videoSrc } from "@/lib/images";
import { useAdmin } from "@/lib/useAdmin";

const MAX_EDGE = 1600; // keeps every image small for volunteers on paid data

/** Shrink to at most 1600px wide and re-save as WebP (also fixes phone rotation and drops GPS data). Returns a data URL. */
async function compress(file: File): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / bmp.width);
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c.toDataURL("image/webp", 0.72);
}

export default function SiteImages() {
  const { can, log } = useAdmin();
  const allowed = can("settings.edit");
  const [, bump] = useState(0);
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [consent, setConsent] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { const f = () => bump((n) => n + 1); window.addEventListener(PHOTOS_CHANGED, f); return () => window.removeEventListener(PHOTOS_CHANGED, f); }, []);
  const say = (id: string, ok: boolean, text: string) => setMsg((m) => ({ ...m, [id]: { ok, text } }));

  async function upload(id: string, file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|avif|heic)$/i.test(file.type)) { say(id, false, "Use a JPG, PNG or WebP picture."); return; }
    if (file.size > 15 * 1024 * 1024) { say(id, false, "That file is over 15 MB. Pick a smaller one."); return; }
    setBusy(id);
    try {
      setPhotoOverride(id, await compress(file));
      log("Site image changed", id); // ids only, never who is in the picture (rule 5)
      say(id, true, "Saved. Open the public site to see it.");
      setConsent((c) => ({ ...c, [id]: false }));
    } catch (e) {
      say(id, false, e instanceof DOMException && e.name === "QuotaExceededError" ? "This browser is out of space for pictures. Reset one you no longer need first." : "We could not read that picture. Try a different file.");
    } finally { setBusy(null); }
  }
  const reset = (id: string) => { if (!confirm(`Put the original picture back for “${id}”?`)) return; setPhotoOverride(id, null); log("Site image reset", id); say(id, true, "Original restored."); };

  if (!allowed) return <div className="max-w-lg py-6"><h1 className="text-5xl">Site images</h1><p className="mt-3">Only a Super Admin can change the pictures on the site.</p></div>;
  return (
    <div className="grid gap-8 max-w-5xl">
      <div>
        <h1 className="text-5xl md:text-7xl">Site images</h1>
        <p className="mt-2 max-w-2xl">Every picture on the public site is a named slot. Replace any of them below. Pictures are shrunk automatically so the site stays light on phones.</p>
        <p className="mt-3 border-2 border-ink p-3 text-sm max-w-2xl"><b>Prototype note:</b> a replacement is saved in this browser only, so only you see it. When the site goes live, the same page will save to Devatop&apos;s own storage and every visitor will see it.</p>
        <p className="mt-3 text-sm max-w-2xl"><b>Safeguarding:</b> adults only. Never use a picture of an identifiable child or a survivor. Everyone in a picture must have agreed to it being used.</p>
      </div>

      <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-10">
        {Object.values(SLOTS).map((s) => {
          const custom = !!photoOverride(s.id);
          return (
            <li key={s.id} className="border-t-2 border-ink pt-3">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-3xl">{s.id}</h2><p className="text-sm opacity-80">{s.where}</p></div>
                <span className={`stamp ${custom ? "stamp-info" : "stamp-wait"}`}>{custom ? "Replaced" : "Original"}</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoSrc(s.id)} alt="" className="mt-3 w-full max-h-56 object-contain bg-paper border border-ink" style={{ aspectRatio: s.ratio }} />
              <p className="text-sm mt-2"><b>What fits:</b> {s.brief} Shape {s.ratio.replace("/", ":")} (it is cropped to fit).</p>
              <label className="flex items-start gap-2 mt-3 text-sm font-bold">
                <input type="checkbox" className="mt-1 w-5 h-5" checked={!!consent[s.id]} onChange={(e) => setConsent((c) => ({ ...c, [s.id]: e.target.checked }))} />
                <span>Everyone in the new picture is an adult and has agreed to its use, or nobody is in it.</span>
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className={`btn btn-sm ${!consent[s.id] || busy === s.id ? "opacity-45 pointer-events-none" : ""}`}>
                  {busy === s.id ? "Saving…" : "Choose a new picture"}
                  <input type="file" accept="image/*" className="sr-only" disabled={!consent[s.id] || busy === s.id} onChange={(e) => { upload(s.id, e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                {custom && <button className="btn btn-sm btn-ghost" onClick={() => reset(s.id)}>Back to original</button>}
              </div>
              {msg[s.id] && <p className={msg[s.id].ok ? "text-sm font-bold mt-2" : "err"} role="status">{msg[s.id].text}</p>}
            </li>
          );
        })}
      </ul>

      <section>
        <h2 className="text-4xl border-t-2 border-ink pt-3">Short clips</h2>
        <p className="mt-2 max-w-2xl text-sm">Silent loops of about 6 seconds. They play only on a fast connection and never for people who turned animation off. Changing a clip from this page needs Devatop&apos;s own storage, which comes with go-live; until then a developer swaps the files in <code>public/video</code>.</p>
        <ul className="mt-5 grid sm:grid-cols-2 gap-6">
          {Object.values(VIDEOS).map((v) => (
            <li key={v.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={videoSrc(v.id).poster} alt="" className="w-full border border-ink" style={{ aspectRatio: v.ratio }} />
              <p className="font-bold mt-2">{v.id}</p><p className="text-sm">{v.where}</p><p className="text-sm opacity-80">{v.brief}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

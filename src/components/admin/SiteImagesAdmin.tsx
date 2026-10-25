"use client";
import { useState } from "react";
import { prepareSiteImageAction, resetSiteImageAction, saveSiteImageAction } from "@/app/actions/admin";
import { SLOTS, VIDEOS, type ReplacedImage } from "@/lib/images";
import { IMAGE_BUCKET, PHOTO_MAX_BYTES, VIDEO_MAX_BYTES, VIDEO_MAX_SECONDS } from "@/lib/siteImages";
import { supabaseBrowser } from "@/lib/auth/supabase-browser";
import { useAdmin } from "@/lib/useAdmin";

const MAX_EDGE = 1600; // keeps every picture small for volunteers on paid data
type Replaced = Record<string, ReplacedImage & { when: string }>;

/** Shrink to at most 1600px wide and save as WebP (also fixes phone rotation and drops GPS data). */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / bmp.width);
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("compress"))), "image/webp", 0.72));
}

/** Read a clip's length and grab a still frame from it (shown before the clip plays, and to people who never play it). */
async function inspectClip(file: File): Promise<{ seconds: number; poster: Blob }> {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.muted = true; v.preload = "auto"; v.src = url;
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error("read")); });
    v.currentTime = Math.min(0.2, v.duration / 2);
    await new Promise<void>((res) => { v.onseeked = () => res(); });
    const scale = Math.min(1, MAX_EDGE / v.videoWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    const poster = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("poster"))), "image/jpeg", 0.7));
    return { seconds: v.duration, poster };
  } finally { URL.revokeObjectURL(url); }
}

/** Admin > Site images on the real system: files go to Devatop's own storage and every visitor sees them. Super Admin only. */
export function SiteImagesAdmin({ replaced }: { replaced: Replaced }) {
  const { can } = useAdmin();
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [consent, setConsent] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Replaced>(replaced);
  const say = (id: string, ok: boolean, text: string) => setMsg((m) => ({ ...m, [id]: { ok, text } }));

  async function send(id: string, files: { path: string; token: string; blob: Blob; type: string }[], extra: object) {
    const st = supabaseBrowser().storage.from(IMAGE_BUCKET);
    for (const f of files) {
      const { error } = await st.uploadToSignedUrl(f.path, f.token, f.blob, { contentType: f.type });
      if (error) throw new Error("upload");
    }
    return saveSiteImageAction({ slotId: id, path: files[0].path, consent: true, ...extra });
  }

  async function uploadPhoto(id: string, file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|avif|heic)$/i.test(file.type)) return say(id, false, "Use a JPG, PNG or WebP picture.");
    if (file.size > 15 * 1024 * 1024) return say(id, false, "That file is over 15 MB. Pick a smaller one.");
    setBusy(id);
    try {
      const blob = await compress(file);
      if (blob.size > PHOTO_MAX_BYTES) return say(id, false, "That picture is still too heavy after shrinking. Pick a simpler one.");
      const prep = await prepareSiteImageAction({ slotId: id });
      if (!prep.ok) return say(id, false, prep.message);
      const r = await send(id, [{ ...prep.data[0], blob, type: "image/webp" }], {});
      if (!r.ok) return say(id, false, r.message);
      say(id, true, "Saved. Every visitor sees it now."); setConsent((c) => ({ ...c, [id]: false })); location.reload();
    } catch { say(id, false, "We could not upload that picture. Check your connection and try again."); }
    finally { setBusy(null); }
  }

  async function uploadClip(id: string, file: File | undefined) {
    if (!file) return;
    const ext = file.type === "video/mp4" ? "mp4" : file.type === "video/webm" ? "webm" : null;
    if (!ext) return say(id, false, "Use an MP4 or WebM clip.");
    if (file.size > VIDEO_MAX_BYTES) return say(id, false, `That clip is over ${VIDEO_MAX_BYTES / 1024 / 1024} MB. Shorten or compress it.`);
    setBusy(id);
    try {
      const { seconds, poster } = await inspectClip(file);
      if (seconds > VIDEO_MAX_SECONDS) return say(id, false, `That clip is ${Math.round(seconds)} seconds. Keep it to ${VIDEO_MAX_SECONDS} seconds or less.`);
      const prep = await prepareSiteImageAction({ slotId: id, ext });
      if (!prep.ok) return say(id, false, prep.message);
      const [clip, still] = prep.data;
      const r = await send(id, [{ ...clip, blob: file, type: file.type }, { ...still, blob: poster, type: "image/jpeg" }], { posterPath: still.path });
      if (!r.ok) return say(id, false, r.message);
      say(id, true, "Saved. Every visitor sees it now."); setConsent((c) => ({ ...c, [id]: false })); location.reload();
    } catch { say(id, false, "We could not read or upload that clip. Try another file."); }
    finally { setBusy(null); }
  }

  async function reset(id: string) {
    if (!confirm(`Put the original back for “${id}”?`)) return;
    setBusy(id);
    const r = await resetSiteImageAction({ slotId: id });
    setBusy(null);
    if (r.ok) { setDone((d) => { const n = { ...d }; delete n[id]; return n; }); say(id, true, "Original restored."); } else say(id, false, r.message);
  }

  if (!can("settings.edit")) return <div className="max-w-lg py-6"><h1 className="text-5xl">Site images</h1><p className="mt-3">Only a Super Admin can change the pictures on the site.</p></div>;

  const consentBox = (id: string, what: string) => (
    <label className="flex items-start gap-2 mt-3 text-sm font-bold">
      <input type="checkbox" className="mt-1 w-5 h-5" checked={!!consent[id]} onChange={(e) => setConsent((c) => ({ ...c, [id]: e.target.checked }))} />
      <span>Everyone in the new {what} is an adult and has agreed to its use, or nobody is in it.</span>
    </label>
  );
  const status = (id: string) => msg[id] && <p className={msg[id].ok ? "text-sm font-bold mt-2" : "err"} role={msg[id].ok ? "status" : "alert"}>{msg[id].text}</p>;

  return (
    <div className="grid gap-8 max-w-5xl">
      <div>
        <h1 className="text-5xl md:text-7xl">Site images</h1>
        <p className="mt-2 max-w-2xl">Every picture and clip on the public site is a named place. Replace any of them below and every visitor sees the change straight away. Pictures are shrunk automatically so the site stays light on phones.</p>
        <p className="mt-3 text-sm max-w-2xl"><b>Safeguarding:</b> adults only. Never use a picture or clip of an identifiable child or a survivor. Everyone shown must have agreed. Your tick is saved with the file, with your name and the date.</p>
        <p className="mt-3 text-sm max-w-2xl"><b>Tip:</b> on the public site, press the <b>I</b> key (shown to signed-in admins) to outline every place and see its name.</p>
      </div>

      <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-10">
        {Object.values(SLOTS).map((s) => {
          const r = done[s.id];
          return (
            <li key={s.id} className="border-t-2 border-ink pt-3">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-3xl">{s.id}</h2><p className="text-sm opacity-80">{s.where}</p></div>
                <span className={`stamp ${r ? "stamp-info" : "stamp-wait"}`}>{r ? "Replaced" : "Original"}</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r?.url ?? `/photos/${s.id}.webp`} alt="" className="mt-3 w-full max-h-56 object-contain bg-paper border border-ink" style={{ aspectRatio: s.ratio }} />
              <p className="text-sm mt-2"><b>What fits:</b> {s.brief} Shape {s.ratio.replace("/", ":")} (it is cropped to fit).</p>
              {consentBox(s.id, "picture")}
              <div className="mt-3 flex flex-wrap gap-2">
                <label className={`btn btn-sm ${!consent[s.id] || busy === s.id ? "opacity-45 pointer-events-none" : ""}`}>
                  {busy === s.id ? "Saving…" : "Choose a new picture"}
                  <input type="file" accept="image/*" className="sr-only" disabled={!consent[s.id] || busy === s.id} onChange={(e) => { uploadPhoto(s.id, e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                {r && <button className="btn btn-sm btn-ghost" disabled={busy === s.id} onClick={() => reset(s.id)}>Back to original</button>}
              </div>
              {status(s.id)}
            </li>
          );
        })}
      </ul>

      <section>
        <h2 className="text-4xl border-t-2 border-ink pt-3">Short clips</h2>
        <p className="mt-2 max-w-2xl text-sm">Silent loops of {VIDEO_MAX_SECONDS} seconds or less (about 6 is best), MP4 or WebM, up to {VIDEO_MAX_BYTES / 1024 / 1024} MB; the smaller the better for phones. They play only on a fast connection and never for people who turned animation off, who see the still frame instead (taken from the start of your clip).</p>
        <ul className="mt-5 grid sm:grid-cols-2 gap-8">
          {Object.values(VIDEOS).map((v) => {
            const r = done[v.id];
            return (
              <li key={v.id} className="border-t-2 border-ink pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="text-3xl">{v.id}</h3><p className="text-sm opacity-80">{v.where}</p></div>
                  <span className={`stamp ${r ? "stamp-info" : "stamp-wait"}`}>{r ? "Replaced" : "Original"}</span>
                </div>
                {r?.kind === "video"
                  ? <video src={r.url} poster={r.poster} muted loop playsInline controls className="mt-3 w-full border border-ink bg-ink" style={{ aspectRatio: v.ratio }} />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={`/video/${v.id}.jpg`} alt="" className="mt-3 w-full border border-ink" style={{ aspectRatio: v.ratio }} />}
                <p className="text-sm mt-2">{v.brief} Shape {v.ratio.replace("/", ":")} (it is cropped to fit).</p>
                {consentBox(v.id, "clip")}
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className={`btn btn-sm ${!consent[v.id] || busy === v.id ? "opacity-45 pointer-events-none" : ""}`}>
                    {busy === v.id ? "Uploading…" : "Choose a new clip"}
                    <input type="file" accept="video/mp4,video/webm" className="sr-only" disabled={!consent[v.id] || busy === v.id} onChange={(e) => { uploadClip(v.id, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {r && <button className="btn btn-sm btn-ghost" disabled={busy === v.id} onClick={() => reset(v.id)}>Back to original</button>}
                </div>
                {status(v.id)}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

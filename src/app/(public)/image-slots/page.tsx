import { SLOTS } from "@/lib/images";
import { Photo } from "@/components/Photo";

export const metadata = { title: "Image guide" };

export default function ImageSlots() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 md:px-8 py-12 md:py-20">
      <p className="font-bold uppercase tracking-widest text-sm text-orange">Prototype page — remove before launch</p>
      <h1 className="text-[length:var(--text-display)] mt-2" data-mask>Where the <em className="accent">photos</em> go</h1>
      <p className="mt-6 max-w-2xl text-[length:var(--text-lead)]">
        Every picture on the site is a named slot. Add a photo with the slot&apos;s name and the slot fills itself, with no code change. Until then you see a hatched placeholder with its name.
      </p>

      <ol className="mt-10 grid md:grid-cols-4 gap-x-8">
        {[
          ["1. Shoot or collect", "Adults only. Never an identifiable child or survivor. Get a signed photo consent for every person (log it in docs/photo-consent.csv)."],
          ["2. Name it after the slot", "Save the original as e.g. raw-photos/hero-1.jpg. Phone photos are fine; the script fixes rotation and strips GPS data."],
          ["3. Run npm run photos", "Compresses to WebP, max 1600px, around 60–150 KB each, into public/photos. Volunteers on paid data stay happy."],
          ["4. Refresh", "Black-and-white treatment is applied by the site itself, so you always upload the colour original. Featured slots get the orange duotone."],
        ].map(([t, d]) => (
          <li key={t} className="border-t border-ink pt-4 pb-6">
            <h2 className="text-3xl">{t}</h2>
            <p className="mt-2 text-sm">{d}</p>
          </li>
        ))}
      </ol>

      <h2 className="text-[length:var(--text-title)] mt-12 mb-6">All {Object.keys(SLOTS).length} slots</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
        {Object.values(SLOTS).map((s) => (
          <figure key={s.id} className="border-t border-ink pt-4">
            <Photo slot={s.id} className="w-full max-h-72" />
            <figcaption className="mt-3">
              <code className="font-bold bg-ink text-paper px-1.5 py-0.5">{s.id}.jpg</code>
              <span className="text-sm ml-2 opacity-70">{s.ratio.replace("/", ":")}{s.duotone ? " · orange duotone" : ""}</span>
              <p className="text-sm mt-2"><b>Appears:</b> {s.where}</p>
              <p className="text-sm"><b>Brief:</b> {s.brief}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-14 border-t border-ink pt-6 max-w-3xl">
        <h2 className="text-3xl">Where do the pictures come from?</h2>
        <ul className="mt-3 grid gap-2 list-disc pl-5">
          <li><b>Now:</b> Devatop&apos;s own archive from outreaches, trainings and campaigns (best), plus devatop.org images you already hold the rights to.</li>
          <li><b>Going forward:</b> a volunteer photographer role in Communications and Media, with a consent form signed on the day.</li>
          <li><b>Never:</b> stock photos of &quot;African children&quot; or anything showing survivors. If there is no real photo yet, the hatched placeholder stays. It looks honest, and it is better than a fake.</li>
          <li><b>Volunteer-uploaded:</b> a profile photo (slot <code>profile-me</code>) appears inside their &quot;YOU&apos;RE IN&quot; screen. In production these go to Supabase Storage, resized on upload.</li>
        </ul>
      </div>
    </div>
  );
}

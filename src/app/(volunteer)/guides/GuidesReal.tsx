"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { markGuideReadAction } from "@/app/actions/volunteer";
import { useLive } from "@/lib/live";

export function GuidesReal() {
  const live = useLive()!; const router = useRouter();
  const [q, setQ] = useState(""); const [open, setOpen] = useState<string | null>(null);
  // the list only holds guides this person may see, so search can never reveal another audience's guide
  const list = useMemo(() => live.guides.filter((g) => !q || (g.title + g.body.join(" ")).toLowerCase().includes(q.toLowerCase())), [live.guides, q]);
  const read = async (id: string) => { await markGuideReadAction(id); router.refresh(); };
  return (
    <div className="grid md:grid-cols-12 gap-10">
      <div className="md:col-span-4">
        <h1 className="text-[length:var(--text-display)]">The <em className="accent">guides</em></h1>
        <label className="label mt-6" htmlFor="q">Search guides</label>
        <input id="q" className="input" placeholder="hours, safeguarding…" value={q} onChange={(e) => setQ(e.target.value)} />
        <p className="why">Search only shows guides you are allowed to see.</p>
      </div>
      <div className="md:col-span-8">
        {list.map((g) => (
          <section key={g.id} className="border-t border-ink">
            <button className="w-full text-left py-4 flex justify-between gap-4 items-center min-h-14" aria-expanded={open === g.id} onClick={() => setOpen(open === g.id ? null : g.id)}>
              <span className="display text-3xl md:text-4xl">{g.title}</span>
              <span className="flex items-center gap-2">{g.mustRead && <span className={`stamp ${g.read ? "stamp-ok" : "stamp-info"}`}>{g.read ? "Read" : "Must read"}</span>}<span className="display text-3xl text-orange">{open === g.id ? "–" : "+"}</span></span>
            </button>
            {open === g.id && (
              <div className="pb-6 max-w-2xl grid gap-3 text-[length:var(--text-lead)]">
                {g.body.map((p, i) => <p key={i}>{p}</p>)}
                <p className="text-sm opacity-70">Last updated {new Date(g.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                {g.mustRead && !g.read && <button className="btn btn-sm btn-ink justify-self-start" onClick={() => read(g.id)}>I have read this</button>}
              </div>)}
          </section>))}
        <div className="border-t border-ink" />
        {list.length === 0 && <p className="py-6">{q ? `No guides match “${q}”.` : "No guides for you yet."}</p>}
      </div>
    </div>
  );
}

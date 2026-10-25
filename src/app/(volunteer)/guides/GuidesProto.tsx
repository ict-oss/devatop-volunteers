"use client";
import { useMemo, useState } from "react";
import { KEYS, useLocal } from "@/lib/store";

type Guide = { id: string; title: string; audience: "volunteers" | "public"; must?: boolean; body: string[]; updated: string };
const GUIDES: Guide[] = [
  { id: "conduct", title: "Code of conduct", audience: "volunteers", must: true, updated: "2026-10-01", body: ["Treat everyone with dignity. No harassment, no discrimination, no exceptions.", "Never take photos of people without consent, and never of children or survivors.", "You represent Devatop on activity days. Be on time, be kind, follow your team lead.", "If you see something wrong, say so. You will not be punished for reporting a concern."] },
  { id: "safeguarding", title: "Safeguarding in plain words", audience: "volunteers", must: true, updated: "2026-10-01", body: ["Safeguarding means keeping children and survivors safe from harm.", "You never meet a young person alone, never share your personal contacts with them, and never promise to keep a secret about harm.", "If a young person tells you about abuse, listen, do not investigate, and tell your coordinator straight away.", "Nobody works with children or survivors until they have finished safeguarding training."] },
  { id: "signup", title: "How to sign up, check in and log hours", audience: "volunteers", updated: "2026-09-20", body: ["Sign up for a call in one tap from the Calls board.", "At events, scan the QR code on arrival and again when you leave. Your hours are recorded automatically.", "Doing remote work? Log your hours from the Hours page. An admin approves them before they count."] },
  { id: "talkam", title: "Using Talkam", audience: "volunteers", updated: "2026-08-14", body: ["Talkam lets people report abuse and get help. If you see am, Talkam.", "Volunteers help people understand how to report. They never take reports on their own."] },
  { id: "safe-field", title: "Staying safe in the field", audience: "volunteers", updated: "2026-08-14", body: ["Travel in pairs. Share your location with your team lead.", "Keep your Devatop ID or shirt visible. Carry water and a charged phone.", "Your contact on the day is listed on your sign-up."] },
];

export function GuidesProto() {
  const [q, setQ] = useState("");
  const [read, setRead] = useLocal<Record<string, boolean>>(KEYS.read, {} as Record<string, boolean>);
  const [open, setOpen] = useState<string | null>("conduct");
  const list = useMemo(() => GUIDES.filter((g) => !q || (g.title + g.body.join(" ")).toLowerCase().includes(q.toLowerCase())), [q]);
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
              <span className="flex items-center gap-2">{g.must && <span className={`stamp ${read[g.id] ? "stamp-ok" : "stamp-info"}`}>{read[g.id] ? "Read" : "Must read"}</span>}<span className="display text-3xl text-orange">{open === g.id ? "–" : "+"}</span></span>
            </button>
            {open === g.id && (
              <div className="pb-6 max-w-2xl grid gap-3 text-[length:var(--text-lead)]">
                {g.body.map((p, i) => <p key={i}>{p}</p>)}
                <p className="text-sm opacity-70">Last updated {g.updated}</p>
                {g.must && !read[g.id] && <button className="btn btn-sm btn-ink justify-self-start" onClick={() => setRead((p) => ({ ...p, [g.id]: true }))}>I have read this</button>}
              </div>
            )}
          </section>
        ))}
        <div className="border-t border-ink" />
        {list.length === 0 && <p className="py-6">No guides match “{q}”.</p>}
      </div>
    </div>
  );
}

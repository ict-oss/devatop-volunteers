"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CallRow } from "@/components/CallRow";
import { SKILLS, STATE_NAMES, type Opportunity } from "@/lib/data";
import { useOpps, useSignups } from "@/lib/useOpps";

export default function Opportunities() {
  const [state, setState] = useState("");
  const [prog, setProg] = useState("");
  const [skill, setSkill] = useState("");
  const [mode, setMode] = useState<"" | "Physical" | "Remote">("");
  const { ids: signups, signUp: doSignUp } = useSignups();
  const [toast, setToast] = useState("");
  const { opps } = useOpps();

  const programmes = useMemo(() => Array.from(new Set(opps.map((o) => o.programme))).sort(), [opps]);
  const list = useMemo(() => opps.filter((o) =>
    (!state || o.state === state) && (!prog || o.programme === prog) && (!skill || o.skills.includes(skill)) && (!mode || o.mode === mode)
  ), [opps, state, prog, skill, mode]);

  const signUp = async (o: Opportunity) => {
    const r = await doSignUp(o);
    setToast(r.message);
    setTimeout(() => setToast(""), 3500);
  };

  return (
    <div>
      <section className="mx-auto max-w-[1500px] px-4 md:px-8 pt-12 md:pt-20">
        <h1 className="text-[length:var(--text-hero)] leading-[0.82]" data-mask>Calls to <em className="accent">action</em></h1>
        <p className="mt-6 text-[length:var(--text-lead)] max-w-2xl">Real roles, real dates. Pick one, tap sign up. New ones drop often. <Link className="underline font-bold" href="/apply">Not a volunteer yet? Apply first.</Link></p>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 md:px-8 mt-10" aria-label="Filters">
        <div className="border-t border-ink pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-native>
          <label className="block"><span className="label">State</span>
            <select className="input" value={state} onChange={(e) => setState(e.target.value)}><option value="">All states</option><option>Remote (any state)</option>{STATE_NAMES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="block"><span className="label">Programme</span>
            <select className="input" value={prog} onChange={(e) => setProg(e.target.value)}><option value="">All programmes</option>{programmes.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="block"><span className="label">Skill</span>
            <select className="input" value={skill} onChange={(e) => setSkill(e.target.value)}><option value="">Any skill</option>{SKILLS.map((s) => <option key={s}>{s}</option>)}</select></label>
          <div><span className="label">Where</span>
            <div className="flex gap-2 flex-wrap">
              {(["", "Physical", "Remote"] as const).map((m) => <button key={m} className="chip" aria-pressed={mode === m} onClick={() => setMode(m)}>{m || "Any"}</button>)}
            </div></div>
        </div>
        <p className="mt-4 font-bold" aria-live="polite">{list.length} open call{list.length === 1 ? "" : "s"}</p>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 md:px-8 pb-24 mt-2">
        {list.map((o) => <div key={o.id} id={o.id}><CallRow o={o} onSignup={signUp} signedUp={signups.includes(o.id)} /></div>)}
        <div className="border-t border-ink" />
        {list.length === 0 && (
          <div className="py-16 max-w-xl">
            <p className="display text-5xl">No open calls right now.</p>
            <p className="mt-3 text-[length:var(--text-lead)]">New ones are added often, so check back soon.</p>
            {(state || prog || skill || mode) && <button className="btn mt-5" onClick={() => { setState(""); setProg(""); setSkill(""); setMode(""); }}>Clear filters</button>}
          </div>
        )}
      </section>
      {toast && <div role="status" className="fixed z-[80] left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 bg-ink text-paper px-5 py-3 font-bold">{toast}</div>}
    </div>
  );
}

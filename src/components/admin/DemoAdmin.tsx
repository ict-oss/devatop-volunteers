"use client";
import { addDemoAction, removeDemoAction } from "@/app/actions/admin";
import { Busy } from "@/components/Spinner";
import { useAct } from "./useAct";

type Summary = { volunteers: number; calls: number; announcements: number; hours: number };

/** Temporary demo volunteers, calls and announcements, so a new site is not empty while Devatop previews it. Everything added here is marked "(Temp)". */
export function DemoAdmin({ summary }: { summary: Summary }) {
  const { act, busy, note } = useAct();
  const there = summary.volunteers > 0 || summary.calls > 0;
  return (
    <div className="grid gap-6 max-w-3xl">
      <div>
        <h1 className="text-5xl md:text-7xl">Demo data</h1>
        <p className="mt-2 text-sm max-w-2xl">Fills the site with made-up volunteers, hours, calls and announcements so the home page numbers, the map and these admin screens show something while you preview. Every demo item has <b>(Temp)</b> in its name or title, so it is easy to spot. Remove it before you tell anyone the numbers are real: the demo hours count in the public figures.</p>
      </div>
      {note}
      <div className="border-2 border-ink p-4 grid gap-1" aria-label="What is there now">
        <b>Right now</b>
        {there ? <p>{summary.volunteers} demo volunteers with {summary.hours} approved hours, {summary.calls} demo calls and {summary.announcements} demo announcements.</p> : <p>No demo data is in the database.</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="btn" disabled={busy} onClick={() => act(addDemoAction(), (r) => r.added || r.calls ? `Added ${r.added} demo volunteers and ${r.calls} demo calls. Refresh the home page to see the numbers.` : "The demo data was already there. Nothing changed.")}>
          {busy ? <Busy>Working…</Busy> : "Add demo data"}
        </button>
        <button className="btn btn-ghost" disabled={busy || !there} onClick={() => { if (confirm("Remove ALL demo data? This deletes the (Temp) volunteers, their hours, the (Temp) calls and announcements. Real volunteers and calls are not touched.")) return act(removeDemoAction(), (r) => `Removed ${r.removed} demo volunteers and the demo calls and announcements.`); }}>
          {busy ? <Busy>Working…</Busy> : "Remove all demo data"}
        </button>
      </div>
      <p className="text-sm opacity-80">Approved demo hours need a deciding admin, so you must be a Super Admin who has signed in (you are). Real people are never changed: demo items are found by their (Temp) marks only.</p>
    </div>
  );
}

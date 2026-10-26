"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { hasContactInfo, type Msg, type Room } from "@/lib/chat";

type Self = { name: string; label: string; staff: boolean };
/** The database-backed rooms: where messages come from and go to. */
export type ChatAdapter = {
  load: (room: string) => Promise<Msg[] | null>;
  reported: () => Promise<Msg[] | null>;
  send: (room: string, text: string) => Promise<string | null>;       // returns an error message, or null
  moderate: (kind: "report" | "dismiss" | "remove", id: string) => Promise<string | null>;
};
const time = (iso: string) => {
  const d = new Date(iso), today = new Date();
  const t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === today.toDateString() ? t : `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${t}`;
};

/** One chat UI for volunteers and admins. Access (which rooms, who can post or moderate) comes in through `rooms`. */
export function ChatUI({ rooms, self, showReports = false, adapter }: { rooms: Room[]; self: Self; showReports?: boolean; adapter: ChatAdapter }) {
  const [remote, setRemote] = useState<Msg[]>([]);
  const [remoteReports, setRemoteReports] = useState<Msg[]>([]);
  const all = remote;
  const [sel, setSel] = useState(rooms[0]?.id ?? "");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const room = rooms.find((r) => r.id === sel) ?? rooms[0];
  const isReports = showReports && sel === "__reports";
  const msgs = useMemo(() => all.filter((m) => m.room === room?.id).sort((a, b) => +new Date(a.at) - +new Date(b.at)), [all, room?.id]);
  const reported = remoteReports;

  useEffect(() => { if (!rooms.find((r) => r.id === sel) && sel !== "__reports") setSel(rooms[0]?.id ?? ""); }, [rooms, sel]);
  // fetch the open room now and every 5 seconds (no websockets needed)
  const refresh = async () => {
    if (sel === "__reports") { const r = await adapter.reported(); if (r) setRemoteReports(r); return; }
    if (!sel) return;
    const r = await adapter.load(sel); if (r) setRemote((p) => [...p.filter((m) => m.room !== sel), ...r]);
  };
  useEffect(() => { refresh(); const t = setInterval(refresh, 5000); return () => clearInterval(t); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, sel]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length, sel]);

  const send = async () => {
    const t = text.trim();
    if (!t || !room?.canPost) return;
    if (t.length > 1000) { setErr("Keep it under 1000 characters."); return; }
    if (!self.staff && room.group !== "Help" && hasContactInfo(t)) { setErr("Please don't share phone numbers or emails in group rooms. Use Support for anything private."); return; }
    const e = await adapter.send(room.id, t); if (e) { setErr(e); return; }
    setText(""); setErr(""); await refresh();
  };
  const report = async (m: Msg) => { if (!confirm("Report this message to the Devatop team?")) return; setErr((await adapter.moderate("report", m.id)) ?? ""); await refresh(); };
  const remove = async (m: Msg) => { if (!confirm(`Remove this message from ${m.who}? This is logged.`)) return; setErr((await adapter.moderate("remove", m.id)) ?? ""); await refresh(); };
  const dismiss = async (m: Msg) => { setErr((await adapter.moderate("dismiss", m.id)) ?? ""); await refresh(); };

  const groups = (["Everyone", "Departments", "Staff", "Help"] as const).map((g) => [g, rooms.filter((r) => r.group === g)] as const).filter(([, r]) => r.length);

  return (
    <div className="chat-grid border-2 border-ink bg-paper h-[75vh] md:h-[calc(100vh-11rem)] min-h-[28rem]">
      <nav aria-label="Rooms" className="flex md:block overflow-x-auto md:overflow-y-auto border-b-2 md:border-b-0 md:border-r-2 border-ink">
        {groups.map(([g, rs]) => (
          <div key={g} className="flex md:block shrink-0">
            <div className="hidden md:block px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-widest opacity-70">{g}</div>
            {rs.map((r) => (
              <button key={r.id} onClick={() => setSel(r.id)} aria-current={sel === r.id} className={`md:w-full text-left px-3 py-2.5 min-h-11 font-bold flex items-center justify-between gap-2 whitespace-nowrap ${sel === r.id ? "bg-ink text-paper" : "hover:bg-rule"}`}>
                <span className="truncate"># {r.name}</span>
              </button>))}
          </div>))}
        {showReports && (
          <div className="flex md:block shrink-0"><div className="hidden md:block px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-widest opacity-70">Moderation</div>
            <button onClick={() => setSel("__reports")} aria-current={sel === "__reports"} className={`md:w-full text-left px-3 py-2.5 min-h-11 font-bold flex justify-between gap-2 whitespace-nowrap ${sel === "__reports" ? "bg-ink text-paper" : "hover:bg-rule"}`}><span>Reported messages</span>{reported.length > 0 && <span className="stamp stamp-bad bg-paper">{reported.length}</span>}</button></div>)}
      </nav>

      <section className="flex flex-col min-h-0 min-w-0" aria-label={isReports ? "Reported messages" : room?.name}>
        <header className="px-4 py-3 border-b-2 border-ink">
          <h2 className="text-3xl leading-none"># {isReports ? "Reported messages" : room?.name}</h2>
          <p className="text-sm mt-1 opacity-80">{isReports ? "Review and remove, or dismiss. Every action is logged." : room?.blurb}</p>
        </header>

        {isReports ? (
          <div className="flex-1 overflow-y-auto p-4 grid gap-3 content-start">
            {reported.map((m) => (
              <div key={m.id} className="border-2 border-alert p-3"><div className="text-sm font-bold">{m.who} · {time(m.at)} · <span className="opacity-70">{rooms.find((r) => r.id === m.room)?.name ?? m.room}</span></div>
                <p className="mt-1 break-words">{m.text}</p>
                <div className="mt-2 flex gap-2"><button className="btn btn-sm btn-ink" onClick={() => remove(m)}>Remove message</button><button className="btn btn-sm btn-ghost" onClick={() => dismiss(m)}>Dismiss report</button></div></div>))}
            {reported.length === 0 && <p>Nothing reported. Nice and calm.</p>}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 grid gap-3 content-start" role="log" aria-live="polite">
              {msgs.map((m) => {
                const mine = m.mine ?? (m.who === self.name && m.staff === self.staff);
                return (
                  <article key={m.id} className={`max-w-[85%] ${mine ? "justify-self-end" : ""}`}>
                    <div className={`text-xs font-bold ${mine ? "text-right" : ""}`}>{m.who} {m.staff && <span className="stamp stamp-info ml-1">{m.label}</span>} <span className="font-normal opacity-60 ml-1">{time(m.at)}</span></div>
                    <div className={`mt-1 px-3 py-2 border-2 border-ink break-words ${m.deleted ? "italic opacity-60" : mine ? "bg-orange" : "bg-white/60"}`}>{m.deleted ? "Message removed by a moderator." : m.text}</div>
                    {!m.deleted && (
                      <div className={`mt-1 flex gap-3 text-xs ${mine ? "justify-end" : ""}`}>
                        {!mine && !self.staff && room?.group !== "Help" && (m.reported ? <span className="opacity-60">Reported</span> : <button className="underline" onClick={() => report(m)}>Report</button>)}
                        {room?.canModerate && !mine && <button className="underline" onClick={() => remove(m)}>Remove</button>}
                      </div>)}
                  </article>);
              })}
              {msgs.length === 0 && <p className="opacity-70">{room?.group === "Help" ? "Tell us what's wrong. Only you and the Devatop team can see this thread." : "No messages yet. Say hello."}</p>}
              <div ref={end} />
            </div>
            <div className="border-t-2 border-ink p-3" data-native>
              {room?.canPost ? (
                <>
                  <div className="flex gap-2 items-end">
                    <label className="flex-1"><span className="sr-only">Message</span>
                      <textarea className="input min-h-12 resize-none" rows={2} placeholder={room.group === "Help" ? "Describe the problem…" : `Message #${room.name}`} value={text} maxLength={1000}
                        onChange={(e) => { setText(e.target.value); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} /></label>
                    <button className="btn" onClick={send} disabled={!text.trim()}>Send</button>
                  </div>
                  {err && <p className="err" role="alert">{err}</p>}
                  {!self.staff && room.group !== "Help" && <p className="why">Be kind. No phone numbers or emails in group rooms. Never share anything about a survivor or a child. Staff can see and remove messages.</p>}
                </>
              ) : <p className="text-sm">Your role can read this room but not post.</p>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

"use client";
import { useMemo, useState } from "react";
import { DEPARTMENTS, STATE_NAMES, fmtDate } from "@/lib/data";
import { isGroupLink, renderEmail, waLink, waShare, type Template } from "@/lib/emails";
import { KEYS, SEED_APPS, useLocal, type Application } from "@/lib/store";
import { useAdmin } from "@/lib/useAdmin";
import { useComms, type OutboxRow } from "@/lib/useComms";
import { rosterFor, useOpps } from "@/lib/useOpps";

type Tab = "send" | "reminders" | "outbox" | "templates" | "settings";
const KIND: Record<string, string> = { received: "Received", guardian: "Guardian", needs_info: "More info", approved: "Approved", not_approved: "Not approved", reminder: "Reminder", thanks: "Thank you", bulk: "Bulk" };

export function MessagesProto() {
  const { admin, can, inScope, log } = useAdmin();
  const comms = useComms();
  const { opps } = useOpps();
  const [apps] = useLocal<Application[]>(KEYS.apps, SEED_APPS);
  const [signups] = useLocal<string[]>(KEYS.signups, []);
  const [tab, setTab] = useState<Tab>("send");
  const [msg, setMsg] = useState("");
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 5000); };
  const canBulk = can("email.bulk"), canEdit = can("settings.edit"), seeContact = can("volunteers.contact");

  /* ---------- bulk ---------- */
  const [status, setStatus] = useState<"Approved" | "Applicants" | "Everyone">("Approved");
  const [state, setState] = useState(""); const [dept, setDept] = useState("");
  const [subject, setSubject] = useState(""); const [body, setBody] = useState("Hi {first_name},\n\n");
  const [post, setPost] = useState(true);
  const audience = useMemo(() => apps.filter((a) => inScope(a) && (!state || a.state === state) && (!dept || a.departments.includes(dept)) &&
    (status === "Everyone" ? a.stage !== "Rejected" : status === "Approved" ? a.stage === "Approved" : a.stage !== "Approved" && a.stage !== "Rejected")), [apps, state, dept, status, inScope]);
  const filterText = [status, state && `state ${state}`, dept && DEPARTMENTS.find((d) => d.id === dept)?.name].filter(Boolean).join(", ");
  const sendBulk = () => {
    if (!canBulk) return;
    if (!subject.trim() || body.trim().length < 15) { flash("Add a subject and a message first."); return; }
    if (audience.length === 0) { flash("No recipients match these filters."); return; }
    if (!confirm(`Send this email to ${audience.length} volunteer${audience.length > 1 ? "s" : ""} (${filterText})? This is logged.`)) return;
    const n = comms.sendBulk(audience.map((a) => ({ to: a.email, toName: `${a.first} ${a.last}`, first: a.first })), subject.trim(), body, admin.name);
    if (post) comms.addAnnouncement(subject.trim(), body.replace(/\{first_name\}/g, "there").trim(), admin.name);
    log("Bulk email", `${n} recipients · ${filterText}${post ? " · posted to announcements" : ""}`);
    flash(`Sent to ${n}${post ? " and posted to the volunteers' announcements board" : ""}.`);
    setSubject(""); setBody("Hi {first_name},\n\n");
  };

  /* ---------- reminders ---------- */
  const mine = opps.filter((o) => inScope({ state: o.state }) || o.mode === "Remote");
  const [oid, setOid] = useState("");
  const ev = mine.find((o) => o.id === oid) ?? mine[0];
  const me = apps.find((a) => a.mine);
  const roster = ev ? rosterFor(ev, me ? `${me.first} ${me.last}` : null, signups.includes(ev.id)) : [];
  const rows = roster.map((r) => ({ ...r, app: r.mine ? me : apps.find((a) => `${a.first} ${a.last}` === r.who) }));
  const remVars = (a: Application) => ({ first_name: a.first, opportunity_title: ev!.title, date: fmtDate(ev!.date), time: "9:00 am (confirm)", location: `${ev!.place}, ${ev!.state}`,
    coordinator_first_name: admin.name.split(" ")[0], coordinator_phone: "0800 000 0000 (confirm)", cancel_link: `${location.origin}/my-opportunities` });
  const sendReminders = () => {
    if (!ev || !canBulk) return;
    const targets = rows.filter((r) => r.app);
    const n = targets.filter((r) => comms.send("reminder", r.app!.email, r.app!.first, remVars(r.app!), admin.name)).length;
    log("Event reminders", `${ev.title} · ${n} emailed`);
    flash(`${n} reminder${n === 1 ? "" : "s"} sent. ${rows.length - targets.length} sign-up${rows.length - targets.length === 1 ? " has" : "s have"} no email on file (sample data).`);
  };
  const waText = (a: Application) => `Hi ${a.first}, reminder from Devatop: ${ev!.title} is on ${fmtDate(ev!.date)}, ${ev!.place}, ${ev!.state}. Can't make it? Cancel here so someone else can take your place: ${location.origin}/my-opportunities`;

  /* ---------- outbox preview ---------- */
  const [open, setOpen] = useState<OutboxRow | null>(null);

  /* ---------- templates ---------- */
  const [tid, setTid] = useState<Template["id"]>("received");
  const tpl = comms.templates.find((t) => t.id === tid)!;
  const [draft, setDraft] = useState<{ id: string; subject: string; body: string } | null>(null);
  const cur = draft && draft.id === tid ? draft : { id: tid, subject: tpl.subject, body: tpl.body };
  const sample = { first_name: "Amaka", applicant_first_name: "Tobi", review_days: comms.settings.reviewDays, dashboard_link: "https://volunteer.devatop.org/dashboard", consent_link: "https://volunteer.devatop.org/guardian-consent/abc123", admin_note: "your NYSC call-up letter", whatsapp_link: comms.settings.whatsappGroup, opportunities_link: "https://volunteer.devatop.org/opportunities", reason: "", reapply_date: "20 January 2027", talkam_link: comms.settings.talkamLink, opportunity_title: "AI4Rights school sessions", date: "7 Nov 2026", time: "9:00 am", location: "Yaba, Lagos", coordinator_first_name: "Ngozi", coordinator_phone: "0803 000 0000", cancel_link: "https://volunteer.devatop.org/my-opportunities", hours: 4, total_hours: 18, record_link: "https://volunteer.devatop.org/hours" };
  const templateHtml = renderEmail(cur, sample, comms.settings).html;
  const bulkHtml = renderEmail({ subject: subject || "Your subject", body: body || "" }, { first_name: audience[0]?.first ?? "Amaka" }, comms.settings).html;
  const [settingsDraft, setSettingsDraft] = useState(comms.settings);
  const bad = !isGroupLink(settingsDraft.whatsappGroup);

  const tabs: [Tab, string][] = [["send", "Send to a group"], ["reminders", "Event reminders"], ["outbox", `Outbox (${comms.outbox.length})`], ["templates", "The 7 emails"], ["settings", "Settings"]];
  return (
    <div className="grid gap-6">
      <div><h1 className="text-5xl md:text-7xl">Messages</h1><p className="mt-1 text-sm">Email covers the official messages. WhatsApp is where volunteers actually read things, so every message has a WhatsApp route too.</p></div>
      <div className="flex gap-2 flex-wrap" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
      {msg && <p role="status" className="font-bold border-l-4 border-orange pl-3">{msg}</p>}

      {tab === "send" && (
        <section className="grid lg:grid-cols-[1fr_1fr] gap-8" aria-label="Bulk email">
          <div className="grid gap-4 content-start">
            <div><span className="label">Who</span><div className="flex gap-2 flex-wrap">{(["Approved", "Applicants", "Everyone"] as const).map((s) => <button key={s} className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>{s === "Approved" ? "Active volunteers" : s}</button>)}</div></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label><span className="label">State</span><select className="input" value={state} onChange={(e) => setState(e.target.value)} disabled={admin.role === "state"}><option value="">All {admin.role === "state" ? admin.scope : "states"}</option>{STATE_NAMES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label><span className="label">Department</span><select className="input" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All</option>{DEPARTMENTS.filter((d) => d.status === "active").map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
            </div>
            <p className="border-2 border-ink p-3"><b className="display text-4xl align-middle mr-2">{audience.length}</b>recipient{audience.length === 1 ? "" : "s"}: {filterText}. People who withdrew consent are never included.</p>
            <label><span className="label">Subject</span><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Calls for the Enugu youth summit" /></label>
            <label><span className="label">Message</span><textarea className="input" rows={7} value={body} onChange={(e) => setBody(e.target.value)} /><span className="why">Use {"{first_name}"} to start with their name. Keep it short enough to read on a phone.</span></label>
            <label className="flex items-center gap-3 min-h-11"><input type="checkbox" className="size-6 accent-[#16130F]" checked={post} onChange={(e) => setPost(e.target.checked)} /><span>Also post to the volunteers&apos; announcements board</span></label>
            <div><button className="btn" disabled={!canBulk} onClick={sendBulk}>Send to {audience.length}</button>{!canBulk && <span className="text-sm ml-3">Your role cannot send bulk email.</span>}</div>
          </div>
          <div>
            <span className="label">Phone preview</span>
            <div className="border-2 border-ink max-w-[375px]"><iframe title="Email preview" className="w-full h-[460px] bg-paper" srcDoc={bulkHtml} /></div>
          </div>
        </section>
      )}

      {tab === "reminders" && ev && (
        <section className="grid gap-4" aria-label="Event reminders">
          <p className="text-sm max-w-2xl">In production a daily job sends this email to everyone signed up for tomorrow&apos;s activities. Here you can send it now, by email, or open WhatsApp with the message ready.</p>
          <label className="max-w-xl"><span className="label">Event</span><select className="input" value={ev.id} onChange={(e) => setOid(e.target.value)}>{mine.map((o) => <option key={o.id} value={o.id}>{o.title} — {fmtDate(o.date)}</option>)}</select></label>
          <div className="flex gap-2 flex-wrap"><button className="btn" disabled={!canBulk || rows.length === 0} onClick={sendReminders}>Email reminders to {rows.filter((r) => r.app).length}</button>
            <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={waShare(`Reminder: ${ev.title} is on ${fmtDate(ev.date)}, ${ev.place}, ${ev.state}. See you there! Details: ${typeof location !== "undefined" ? location.origin : ""}/opportunities`)}>Share event on WhatsApp</a></div>
          <ul className="border-t-2 border-ink">{rows.map((r) => (
            <li key={r.key} className="py-2.5 border-b border-rule flex flex-wrap items-center justify-between gap-3"><span><b>{r.who}</b>{" "}<span className="text-sm opacity-70">{r.app ? (seeContact ? r.app.email : "email on file") : "sample data: no email"}</span></span>
              {r.app && seeContact ? <a className="btn btn-sm btn-ghost" target="_blank" rel="noreferrer" href={waLink(r.app.phone, waText(r.app))}>WhatsApp {r.app.first}</a> : <span className="text-sm opacity-50">{r.app ? "Contact hidden for your role" : "—"}</span>}</li>))}
            {rows.length === 0 && <li className="py-4">Nobody has signed up yet.</li>}</ul>
        </section>
      )}

      {tab === "outbox" && (
        <section className="grid lg:grid-cols-[1fr_auto] gap-6" aria-label="Outbox">
          <div>
            <p className="text-sm mb-2">Every email the platform sends from {comms.settings.senderEmail}. Prototype: nothing leaves your browser.</p>
            <ul className="border-t-2 border-ink">{comms.outbox.map((o) => (
              <li key={o.id} className="border-b border-rule"><button className="w-full text-left py-3 grid grid-cols-[auto_1fr] gap-x-4 min-h-14" onClick={() => setOpen(o)} aria-expanded={open?.id === o.id}>
                <span className="stamp stamp-wait self-start">{KIND[o.kind]}</span><span><b>{o.subject}</b><br /><span className="text-sm opacity-75">to {seeContact ? `${o.toName} <${o.to}>` : o.toName} · {new Date(o.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span></span></button></li>))}</ul>
            {comms.outbox.length === 0 && <p className="py-8">Nothing sent yet. Submit an application or approve one and the email appears here.</p>}
          </div>
          {open && <div className="border-2 border-ink w-[375px] max-w-full"><div className="bg-ink text-paper text-xs p-2 flex justify-between"><span>{open.subject}</span><button onClick={() => setOpen(null)} aria-label="Close preview">✕</button></div><iframe title="Sent email" className="w-full h-[520px] bg-paper" srcDoc={open.html} /></div>}
        </section>
      )}

      {tab === "templates" && (
        <section className="grid lg:grid-cols-[14rem_1fr_auto] gap-6" aria-label="Email templates">
          <ul className="border-t-2 border-ink h-fit">{comms.templates.map((t, i) => <li key={t.id} className="border-b border-rule"><button className={`w-full text-left px-2 py-2.5 min-h-11 font-bold ${tid === t.id ? "bg-ink text-paper" : "hover:bg-rule"}`} onClick={() => setTid(t.id)}>{i + 1}. {t.name}</button></li>)}</ul>
          <div className="grid gap-3 content-start">
            <p className="text-sm"><b>Sent:</b> {tpl.when}.</p>
            <label><span className="label">Subject</span><input className="input" disabled={!canEdit} value={cur.subject} onChange={(e) => setDraft({ ...cur, subject: e.target.value })} /></label>
            <label><span className="label">Body</span><textarea className="input" rows={9} disabled={!canEdit} value={cur.body} onChange={(e) => setDraft({ ...cur, body: e.target.value })} /></label>
            <p className="why">Fills in: {tpl.vars.map((v) => `{${v}}`).join(" ")}</p>
            {canEdit ? <div className="flex gap-2"><button className="btn btn-sm" onClick={() => { comms.saveTemplate(tid, { subject: cur.subject, body: cur.body }); log("Email template edited", tpl.name); setDraft(null); flash(`Saved “${tpl.name}”.`); }}>Save</button>
              <button className="btn btn-sm btn-ghost" onClick={() => { comms.resetTemplate(tid); setDraft(null); log("Email template reset", tpl.name); }}>Reset to default</button></div> : <p className="text-sm">Only a Super Admin can edit email templates.</p>}
          </div>
          <div className="border-2 border-ink w-[375px] max-w-full h-fit"><div className="bg-ink text-paper text-xs p-2">Preview with sample data</div><iframe title="Template preview" className="w-full h-[520px] bg-paper" srcDoc={templateHtml} /></div>
        </section>
      )}

      {tab === "settings" && (
        <section className="grid gap-4 max-w-2xl" aria-label="Settings">
          {!canEdit && <p className="border-2 border-ink p-3">Only a Super Admin can change messaging settings.</p>}
          <label><span className="label">Sender name</span><input className="input" disabled={!canEdit} value={settingsDraft.senderName} onChange={(e) => setSettingsDraft({ ...settingsDraft, senderName: e.target.value })} /></label>
          <label><span className="label">Sender email</span><input className="input" disabled={!canEdit} value={settingsDraft.senderEmail} onChange={(e) => setSettingsDraft({ ...settingsDraft, senderEmail: e.target.value })} /><span className="why">Must be an official Devatop address, never a staff member&apos;s personal one.</span></label>
          <label><span className="label">Volunteers WhatsApp group link</span><input className="input" disabled={!canEdit} value={settingsDraft.whatsappGroup} onChange={(e) => setSettingsDraft({ ...settingsDraft, whatsappGroup: e.target.value })} aria-invalid={bad} />
            <span className="why">Shown after approval, on the dashboard and in the “You&apos;re in” email. Looks like https://chat.whatsapp.com/…</span>{bad && <p className="err">This isn&apos;t a real group link yet. Volunteers will see a placeholder.</p>}</label>
          <div className="grid sm:grid-cols-2 gap-4"><label><span className="label">Review time (days)</span><input className="input" inputMode="numeric" disabled={!canEdit} value={settingsDraft.reviewDays} onChange={(e) => setSettingsDraft({ ...settingsDraft, reviewDays: Number(e.target.value) || 0 })} /></label>
            <label><span className="label">Talkam link</span><input className="input" disabled={!canEdit} value={settingsDraft.talkamLink} onChange={(e) => setSettingsDraft({ ...settingsDraft, talkamLink: e.target.value })} /></label></div>
          <div><button className="btn" disabled={!canEdit} onClick={() => { comms.saveSettings(settingsDraft); log("Messaging settings edited", "sender, WhatsApp group, review time"); flash("Settings saved."); }}>Save settings</button></div>
        </section>
      )}
    </div>
  );
}

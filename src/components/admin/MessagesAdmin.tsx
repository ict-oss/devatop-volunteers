"use client";
import { useEffect, useMemo, useState } from "react";
import { audienceCountAction, resetTemplateAction, saveSettingsAction, saveTemplateAction, sendBulkAction } from "@/app/actions/admin";
import { STATE_NAMES } from "@/lib/data";
import { renderEmail, type TemplateId } from "@/lib/emails";
import type { LogRow, MessagingSettings, TemplateView } from "@/lib/services/messaging";
import { unknownPlaceholders } from "@/lib/services/messaging";
import { useAdmin } from "@/lib/useAdmin";
import { useAct } from "./useAct";

type Tab = "send" | "templates" | "log" | "settings";
const SAMPLE = { first_name: "Amaka", applicant_first_name: "Tobi", dashboard_link: "https://volunteer.devatop.org/dashboard", consent_link: "https://volunteer.devatop.org/guardian-consent/abc123", admin_note: "your NYSC call-up letter", opportunity_title: "Youth summit", date: "Saturday 7 November", time: "09:00", location: "Yaba, Lagos", cancel_link: "https://volunteer.devatop.org/my-opportunities", hours: 4, total_hours: 18, record_link: "https://volunteer.devatop.org/hours", reason: "", reapply_date: "20 January 2027", whatsapp_link: "https://chat.whatsapp.com/…", opportunities_link: "https://volunteer.devatop.org/opportunities" };

export function MessagesAdmin({ templates, settings, log, departments }: { templates: TemplateView[]; settings: MessagingSettings; log: LogRow[]; departments: { id: string; name: string }[] }) {
  const { admin, can } = useAdmin();
  const { act, busy, note } = useAct();
  const [tab, setTab] = useState<Tab>("send");
  const canBulk = can("email.bulk"), canEdit = can("settings.edit");

  // ---- send to a group
  const [who, setWho] = useState<"approved" | "applicants" | "everyone">("approved");
  const [state, setState] = useState(""); const [dept, setDept] = useState("");
  const [subject, setSubject] = useState(""); const [body, setBody] = useState("Hi {first_name},\n\n"); const [announce, setAnnounce] = useState(true);
  const [count, setCount] = useState<{ count: number; max: number } | null>(null);
  const audience = useMemo(() => ({ who, state: state || null, departmentId: dept || null }), [who, state, dept]);
  useEffect(() => { if (!canBulk) return; let live = true; setCount(null); audienceCountAction(audience).then((r) => live && r.ok && setCount(r.data)); return () => { live = false; }; }, [audience, canBulk]);
  const bulkHtml = renderEmail({ subject: subject || "Your subject", body }, { first_name: "Amaka" }, { senderName: settings.senderName, senderEmail: settings.senderEmail, whatsappGroup: settings.whatsappGroup, reviewDays: settings.reviewDays, talkamLink: settings.talkamLink }).html;
  const send = async () => {
    if (!count) return;
    if (!confirm(`Send this email to ${count.count} volunteer${count.count === 1 ? "" : "s"}? This is logged.`)) return;
    const r = await act(sendBulkAction({ audience, subject, body, announce }), (d) => `Sent to ${d.sent}${d.failed ? `, ${d.failed} failed` : ""}${d.skipped ? `, ${d.skipped} not sent because no email provider key is set yet` : ""}${announce ? ". Posted to the announcements board" : ""}.`);
    if (r.ok) { setSubject(""); setBody("Hi {first_name},\n\n"); }
  };

  // ---- templates
  const [tid, setTid] = useState<TemplateId>("received");
  const tpl = templates.find((t) => t.id === tid)!;
  const [draft, setDraft] = useState<{ id: string; subject: string; body: string } | null>(null);
  const cur = draft && draft.id === tid ? draft : { id: tid, subject: tpl.subject, body: tpl.body };
  const typos = unknownPlaceholders(tid, cur.subject, cur.body);
  const tplHtml = renderEmail(cur, SAMPLE, { senderName: settings.senderName, senderEmail: settings.senderEmail, whatsappGroup: settings.whatsappGroup, reviewDays: settings.reviewDays, talkamLink: settings.talkamLink }).html;

  // ---- settings
  const [sd, setSd] = useState(settings);

  const tabs: [Tab, string][] = [["send", "Send to a group"], ["templates", "The 7 emails"], ["log", `Sent log (${log.length})`], ["settings", "Settings"]];
  return (
    <div className="grid gap-6">
      <div><h1 className="text-5xl md:text-7xl">Messages</h1><p className="mt-1 text-sm max-w-2xl">Email covers the official messages. Event reminders go out automatically the day before, at 4 pm Lagos time.</p></div>
      <div className="flex gap-2 flex-wrap" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
      {note}

      {tab === "send" && (
        <section className="grid lg:grid-cols-2 gap-8" aria-label="Bulk email">
          <div className="grid gap-4 content-start">
            <div><span className="label">Who</span><div className="flex gap-2 flex-wrap">{([["approved", "Approved volunteers"], ["applicants", "Applicants"], ["everyone", "Everyone"]] as const).map(([k, l]) => <button key={k} className="chip" aria-pressed={who === k} onClick={() => setWho(k)}>{l}</button>)}</div></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label><span className="label">State</span><select className="input" value={state} onChange={(e) => setState(e.target.value)} disabled={admin.role === "state"}><option value="">All {admin.role === "state" ? admin.scope : "states"}</option>{STATE_NAMES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label><span className="label">Department</span><select className="input" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
            </div>
            <p className="border-2 border-ink p-3"><b className="display text-4xl align-middle mr-2">{count ? count.count : "…"}</b>recipient{count?.count === 1 ? "" : "s"}. People without an email, or who withdrew consent, are never included.{count && count.count > count.max && <span className="err block">Over the limit of {count.max} per send. Narrow it by state or department.</span>}</p>
            <label><span className="label">Subject</span><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Calls for the Enugu youth summit" /></label>
            <label><span className="label">Message</span><textarea className="input" rows={7} value={body} onChange={(e) => setBody(e.target.value)} /><span className="why">Use {"{first_name}"} to start with their name. Keep it short enough to read on a phone.</span></label>
            <label className="flex items-center gap-3 min-h-11"><input type="checkbox" className="size-6 accent-[#16130F]" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} /><span>Also post to the volunteers&apos; announcements board</span></label>
            <div><button className="btn" disabled={!canBulk || busy || !count || count.count === 0 || count.count > count.max || subject.trim().length < 3 || body.trim().length < 15} onClick={send}>{busy ? "Sending…" : `Send to ${count?.count ?? "…"}`}</button>{!canBulk && <span className="text-sm ml-3">Your role cannot send bulk email.</span>}</div>
          </div>
          <div><span className="label">Phone preview</span><div className="border-2 border-ink max-w-[375px]"><iframe title="Email preview" className="w-full h-[460px] bg-paper" srcDoc={bulkHtml} /></div></div>
        </section>
      )}

      {tab === "templates" && (
        <section className="grid lg:grid-cols-[14rem_1fr_auto] gap-6" aria-label="Email templates">
          <ul className="border-t-2 border-ink h-fit">{templates.map((t, i) => <li key={t.id} className="border-b border-rule"><button className={`w-full text-left px-2 py-2.5 min-h-11 font-bold ${tid === t.id ? "bg-ink text-paper" : "hover:bg-rule"}`} onClick={() => { setTid(t.id); setDraft(null); }}>{i + 1}. {t.name}{t.edited ? " ✎" : ""}</button></li>)}</ul>
          <div className="grid gap-3 content-start">
            <p className="text-sm"><b>Sent:</b> {tpl.when}.</p>
            <label><span className="label">Subject</span><input className="input" disabled={!canEdit} value={cur.subject} onChange={(e) => setDraft({ ...cur, subject: e.target.value })} /></label>
            <label><span className="label">Body</span><textarea className="input" rows={9} disabled={!canEdit} value={cur.body} onChange={(e) => setDraft({ ...cur, body: e.target.value })} /></label>
            <p className="why">Fills in: {tpl.vars.map((v) => `{${v}}`).join(" ")}</p>
            {typos.length > 0 && <p className="err">Check the spelling of {typos.map((x) => `{${x}}`).join(" ")}. It would go out blank.</p>}
            {canEdit ? <div className="flex gap-2"><button className="btn btn-sm" disabled={busy || typos.length > 0} onClick={async () => { const r = await act(saveTemplateAction(tid, { subject: cur.subject, body: cur.body }), `Saved “${tpl.name}”.`); if (r.ok) setDraft(null); }}>Save</button>
              <button className="btn btn-sm btn-ghost" disabled={busy || !tpl.edited} onClick={async () => { const r = await act(resetTemplateAction(tid), "Back to the original wording."); if (r.ok) setDraft(null); }}>Reset to default</button></div> : <p className="text-sm">Only a Super Admin can edit email templates.</p>}
          </div>
          <div className="border-2 border-ink w-[375px] max-w-full h-fit"><div className="bg-ink text-paper text-xs p-2">Preview with sample data</div><iframe title="Template preview" className="w-full h-[520px] bg-paper" srcDoc={tplHtml} /></div>
        </section>
      )}

      {tab === "log" && (
        <section aria-label="Sent log">
          <p className="text-sm mb-2 max-w-2xl">Which emails went out and whether they arrived at the email provider. For privacy this log never shows addresses or message text.</p>
          <ul className="border-t-2 border-ink">{log.map((l) => <li key={l.id} className="py-2.5 border-b border-rule flex flex-wrap gap-3 items-center"><span className="stamp stamp-wait">{l.template}</span><span className={`stamp ${l.status === "sent" ? "stamp-ok" : l.status === "skipped" ? "stamp-info" : "stamp-bad"}`}>{l.status}</span><span className="text-sm">{new Date(l.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span></li>)}</ul>
          {log.length === 0 && <p className="py-8">Nothing sent yet.</p>}
          {log.some((l) => l.status === "skipped") && <p className="mt-4 border-2 border-ink p-3 text-sm"><b>Some emails were not sent</b> because no email provider key is set. Add <code>BREVO_API_KEY</code> in Vercel and verify the sender address in Brevo.</p>}
        </section>
      )}

      {tab === "settings" && (
        <section className="grid gap-4 max-w-2xl" aria-label="Settings">
          {!canEdit && <p className="border-2 border-ink p-3">Only a Super Admin can change messaging settings.</p>}
          <label><span className="label">Sender name</span><input className="input" disabled={!canEdit} value={sd.senderName} onChange={(e) => setSd({ ...sd, senderName: e.target.value })} /></label>
          <label><span className="label">Sender email</span><input className="input" disabled={!canEdit} value={sd.senderEmail} onChange={(e) => setSd({ ...sd, senderEmail: e.target.value })} /><span className="why">Must be a sender you verified in Brevo, on a Devatop address.</span></label>
          <label><span className="label">Volunteers WhatsApp group link</span><input className="input" disabled={!canEdit} value={sd.whatsappGroup} onChange={(e) => setSd({ ...sd, whatsappGroup: e.target.value })} /><span className="why">Shown to approved volunteers on their dashboard and in the “You&apos;re in” email. Looks like https://chat.whatsapp.com/…</span></label>
          <div className="grid sm:grid-cols-2 gap-4"><label><span className="label">Review time (days)</span><input className="input" inputMode="numeric" disabled={!canEdit} value={sd.reviewDays} onChange={(e) => setSd({ ...sd, reviewDays: Number(e.target.value) || 0 })} /><span className="why">&ldquo;We&apos;ll reply within N days&rdquo; (confirm).</span></label>
            <label><span className="label">Talkam link</span><input className="input" disabled={!canEdit} value={sd.talkamLink} onChange={(e) => setSd({ ...sd, talkamLink: e.target.value })} /></label></div>
          <div><button className="btn" disabled={!canEdit || busy} onClick={() => act(saveSettingsAction(sd), "Settings saved.")}>Save settings</button></div>
        </section>
      )}
      <p className="text-xs opacity-60">Every change is written to the audit log.</p>
    </div>
  );
}

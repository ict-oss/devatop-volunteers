"use client";
import { useCallback, useMemo } from "react";
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES, isGroupLink, renderEmail, type Settings, type Template, type TemplateId, type Vars } from "./emails";
import { KEYS, newId, nowIso, useLocal } from "./store";

export type OutboxRow = { id: string; at: string; to: string; toName: string; kind: TemplateId | "bulk"; subject: string; body: string; html: string; by: string };
export type Announcement = { id: string; at: string; by: string; title: string; body: string };
const NONE: OutboxRow[] = [];
const NONE_A: Announcement[] = [];
const NONE_T: Partial<Record<TemplateId, Pick<Template, "subject" | "body">>> = {};

/** Prototype mail room: "sending" records the rendered email in the outbox. Swap send() for a server action calling Brevo/Resend. */
export function useComms() {
  const [outbox, setOutbox] = useLocal<OutboxRow[]>(KEYS.outbox, NONE);
  const [saved, setSaved] = useLocal<Partial<Record<TemplateId, Pick<Template, "subject" | "body">>>>(KEYS.templates, NONE_T);
  const [custom, setSettings] = useLocal<Partial<Settings>>(KEYS.settings, {});
  const [announcements, setAnn] = useLocal<Announcement[]>(KEYS.announcements, NONE_A);
  const settings: Settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...custom }), [custom]);
  const templates = useMemo(() => DEFAULT_TEMPLATES.map((t) => ({ ...t, ...saved[t.id] })), [saved]);

  const origin = () => (typeof window === "undefined" ? "" : window.location.origin);
  const baseVars = useCallback((): Vars => ({
    review_days: settings.reviewDays, whatsapp_link: isGroupLink(settings.whatsappGroup) ? settings.whatsappGroup : "(the link is on your dashboard as soon as it is ready)", talkam_link: settings.talkamLink,
    dashboard_link: `${origin()}/dashboard`, opportunities_link: `${origin()}/opportunities`, record_link: `${origin()}/hours`,
  }), [settings]);

  const render = useCallback((id: TemplateId, v: Vars) => renderEmail(templates.find((t) => t.id === id)!, { ...baseVars(), ...v }, settings), [templates, baseVars, settings]);

  const send = useCallback((id: TemplateId, to: string, toName: string, v: Vars, by = "System") => {
    if (!to || !/^\S+@\S+\.\S+$/.test(to)) return false; // no email on file (e.g. phone-only guardian): nothing to send
    const r = render(id, v);
    setOutbox((p) => [{ id: newId(), at: nowIso(), to, toName, kind: id, subject: r.subject, body: r.body, html: r.html, by }, ...p]);
    return true;
  }, [render, setOutbox]);

  const sendBulk = useCallback((rows: { to: string; toName: string; first: string }[], subject: string, body: string, by: string) => {
    const batch = rows.filter((r) => /^\S+@\S+\.\S+$/.test(r.to)).map((r): OutboxRow => {
      const x = renderEmail({ subject, body }, { first_name: r.first }, settings);
      return { id: newId(), at: nowIso(), to: r.to, toName: r.toName, kind: "bulk", subject: x.subject, body: x.body, html: x.html, by };
    });
    setOutbox((p) => [...batch, ...p]);
    return batch.length;
  }, [settings, setOutbox]);

  const addAnnouncement = useCallback((title: string, body: string, by: string) => setAnn((p) => [{ id: newId(), at: nowIso(), by, title, body }, ...p]), [setAnn]);

  return { outbox, setOutbox, templates, saveTemplate: (id: TemplateId, t: Pick<Template, "subject" | "body">) => setSaved((p) => ({ ...p, [id]: t })), resetTemplate: (id: TemplateId) => setSaved((p) => { const n = { ...p }; delete n[id]; return n; }),
    settings, saveSettings: (s: Partial<Settings>) => setSettings((p) => ({ ...p, ...s })), render, send, sendBulk, announcements, addAnnouncement };
}

"use client";
// Prototype persistence: localStorage, so apply -> review -> dashboard works end to end in the preview.
// In production these become Drizzle queries + server actions (docs/developer/architecture.md).
import { useCallback, useMemo, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const sub = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { listeners.delete(cb); window.removeEventListener("storage", cb); };
};

export function useLocal<T>(key: string, initial: T): [T, (next: T | ((p: T) => T)) => void, boolean] {
  const raw = useSyncExternalStore(
    sub,
    () => { try { return localStorage.getItem(key); } catch { return null; } },
    () => null,
  );
  const value = useMemo<T>(() => { try { return raw === null ? initial : (JSON.parse(raw) as T); } catch { return initial; } }, [raw, initial]);
  const set = useCallback((next: T | ((p: T) => T)) => {
    let cur = initial;
    try { const r = localStorage.getItem(key); if (r !== null) cur = JSON.parse(r) as T; } catch {}
    const v = typeof next === "function" ? (next as (p: T) => T)(cur) : next;
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
    listeners.forEach((l) => l());
  }, [key, initial]);
  return [value, set, raw !== null];
}

export function resetDemo() {
  try { Object.keys(localStorage).filter((k) => k.startsWith("dv.")).forEach((k) => localStorage.removeItem(k)); } catch {}
  listeners.forEach((l) => l());
}

/* ---------- types ---------- */
export type Stage = "Submitted" | "Under review" | "Interview" | "Needs info" | "Approved" | "Rejected";
export const STAGES: Stage[] = ["Submitted", "Under review", "Interview", "Approved"];

export type Consent = { key: string; text: string; version: string; at: string };
export type Application = {
  id: string; mine?: boolean; first: string; last: string; email: string; phone: string; state: string; lga: string;
  dob: string; occupation: string; skills: string[]; departments: string[]; availability: string; languages: string[]; heard: string; nysc?: string;
  stage: Stage; submittedAt: string; note?: string; consents: Consent[];
  guardian?: { name: string; contact: string; verified: boolean; at?: string };
  programme?: string;
};
export type HourLog = { id: string; who: string; mine?: boolean; activity: string; date: string; hours: number; status: "pending" | "approved" | "rejected"; method: "QR" | "Coordinator" | "Remote log"; programme?: string; state?: string };
export type AuditRow = { id: string; at: string; who: string; action: string; target: string };

export const ageOf = (dob: string, on = new Date()) => {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(+d)) return null;
  let a = on.getFullYear() - d.getFullYear();
  const m = on.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < d.getDate())) a--;
  return a;
};

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 864e5).toISOString();
const mk = (id: string, first: string, last: string, state: string, lga: string, dob: string, stage: Stage, days: number, skills: string[], departments: string[], extra: Partial<Application> = {}): Application => ({
  id, first, last, email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`, phone: "0803 000 0000", state, lga, dob, occupation: "Student",
  skills, departments, availability: "Weekends", languages: ["English", "Pidgin"], heard: "Instagram", stage, submittedAt: iso(days), consents: [], ...extra,
});

export const SEED_APPS: Application[] = [
  mk("a1", "Chinedu", "Okafor", "Lagos", "Surulere", "2001-03-14", "Submitted", 6, ["Photography", "Video"], ["comms"]),
  mk("a2", "Hadiza", "Bello", "Kano", "Fagge", "1999-11-02", "Under review", 5, ["Translation", "Counselling"], ["talkam"]),
  mk("a3", "Tobi", "Adeyemi", "Lagos", "Ikeja", "2009-06-21", "Submitted", 4, ["Social media"], ["comms"], { guardian: { name: "Mrs Adeyemi", contact: "08030001111", verified: false } }),
  mk("a4", "Ngozi", "Eze", "Enugu", "Enugu North", "2000-01-30", "Interview", 4, ["Event support"], ["events"]),
  mk("a5", "Ibrahim", "Sani", "FCT Abuja", "Gwagwalada", "1997-08-09", "Submitted", 3, ["Data", "Research"], ["research", "ict"]),
  mk("a6", "Funke", "Balogun", "Lagos", "Eti-Osa", "2003-12-12", "Submitted", 2, ["Design", "Social media"], ["comms"]),
  mk("a7", "Emeka", "Nwosu", "Rivers", "Port Harcourt", "2002-05-05", "Submitted", 2, ["Public speaking"], ["field"]),
  mk("a8", "Zainab", "Yusuf", "Kaduna", "Kaduna South", "1998-09-17", "Submitted", 1, ["Teaching"], ["ai4rights"]),
  mk("v1", "Tunde", "Ajayi", "Lagos", "Ikeja", "1998-02-11", "Approved", 40, ["Event support"], ["events", "field"]),
  mk("v2", "Kemi", "Lawal", "Oyo", "Ibadan North", "1996-07-23", "Approved", 38, ["Research", "Writing"], ["research"]),
  mk("v3", "Musa", "Danladi", "Kano", "Fagge", "1999-10-01", "Approved", 35, ["Translation"], ["talkam"]),
  mk("v4", "Blessing", "Ifeanyi", "Lagos", "Yaba", "2002-04-19", "Approved", 30, ["Design", "Social media"], ["comms"]),
  mk("a9", "Seun", "Kolawole", "Lagos", "Yaba", "2008-02-02", "Submitted", 1, ["Writing"], ["comms"], { guardian: { name: "Mr Kolawole", contact: "kolawole.sr@example.com", verified: true, at: iso(1) } }),
];

export const SEED_HOURS: HourLog[] = [
  { id: "h1", who: "Amaka Obi", mine: true, activity: "AI4Rights school session — Yaba", date: "2026-09-12", hours: 4, status: "approved", method: "QR" },
  { id: "h2", who: "Amaka Obi", mine: true, activity: "Anti-trafficking awareness walk — Ikeja", date: "2026-09-26", hours: 6, status: "approved", method: "QR" },
  { id: "h3", who: "Amaka Obi", mine: true, activity: "Social media storyteller (remote)", date: "2026-10-10", hours: 3, status: "approved", method: "Remote log" },
  { id: "h4", who: "Amaka Obi", mine: true, activity: "Youth summit crew — Lagos", date: "2026-10-17", hours: 5, status: "pending", method: "Coordinator" },
  { id: "h5", who: "Tunde Ajayi", activity: "Youth summit crew — Lagos", date: "2026-10-17", hours: 5, status: "pending", method: "Coordinator" },
  { id: "h6", who: "Kemi Lawal", activity: "Policy brief research (remote)", date: "2026-10-15", hours: 4, status: "pending", method: "Remote log" },
  { id: "h7", who: "Musa Danladi", activity: "Talkam community listeners — Kano", date: "2026-10-18", hours: 5, status: "pending", method: "QR" },
  { id: "h8", who: "Blessing Ifeanyi", activity: "Youth summit crew — Lagos", date: "2026-10-17", hours: 5, status: "pending", method: "Coordinator" },
];

export const SEED_AUDIT: AuditRow[] = [];
export const EMPTY_APPS: Application[] = [];

export const KEYS = { apps: "dv.applications", hours: "dv.hours", audit: "dv.audit", draft: "dv.apply-draft", signups: "dv.signups", opps: "dv.opportunities", chat: "dv.chat", outbox: "dv.outbox", templates: "dv.templates", settings: "dv.settings", announcements: "dv.announcements", guardian: "dv.guardian-requests", attendance: "dv.attendance", role: "dv.admin-role", cookies: "dv.cookies", depts: "dv.departments", read: "dv.read" };

export const newId = () => Math.random().toString(36).slice(2, 9);
export const nowIso = () => new Date().toISOString();

export type Attendance = { id: string; oppId: string; who: string; mine?: boolean; checkIn?: string; checkOut?: string; present?: boolean; method: "QR" | "Coordinator" };
export const EMPTY_ATT: Attendance[] = [];

export type GuardianReq = { token: string; applicantFirst: string; guardianName: string; contact: string; status: "pending" | "given" | "refused"; at: string };
export const EMPTY_GREQ: GuardianReq[] = [];

"use client";
import { KEYS, SEED_APPS, SEED_HOURS, newId, nowIso, useLocal, type Application, type HourLog, type Stage } from "./store";

export const DEMO_AMAKA: Application = {
  id: "amaka", mine: true, first: "Amaka", last: "Obi", email: "amaka.obi@example.com", phone: "0803 555 0101", state: "Lagos", lga: "Yaba", dob: "2001-04-18",
  occupation: "Graphic designer", skills: ["Design", "Social media", "Teaching"], departments: ["comms", "ai4rights"], availability: "Weekends", languages: ["English", "Pidgin", "Igbo"],
  heard: "Instagram", stage: "Approved", submittedAt: new Date(Date.now() - 40 * 864e5).toISOString(), consents: [
    { key: "conduct", text: "I have read and agree to the Code of Conduct.", version: "conduct-v1", at: new Date(Date.now() - 40 * 864e5).toISOString() },
    { key: "safeguarding", text: "I have read and agree to the Safeguarding Agreement.", version: "safeguarding-v1", at: new Date(Date.now() - 40 * 864e5).toISOString() },
    { key: "privacy", text: "Privacy Notice and data use consent.", version: "privacy-v1", at: new Date(Date.now() - 40 * 864e5).toISOString() },
  ],
};

export const CERT_CODE = "DVT-7K2M-9QXA";

/** The signed-in volunteer's own application + hours, all from the prototype store. */
export function useMe() {
  const [apps, setApps] = useLocal<Application[]>(KEYS.apps, SEED_APPS);
  const [hours, setHours] = useLocal<HourLog[]>(KEYS.hours, SEED_HOURS);
  const me = apps.find((a) => a.mine) ?? null;
  const myHours = hours.filter((h) => h.mine || (me && h.who === `${me.first} ${me.last}`));
  const approved = myHours.filter((h) => h.status === "approved").reduce((s, h) => s + h.hours, 0);
  const pending = myHours.filter((h) => h.status === "pending").reduce((s, h) => s + h.hours, 0);
  return {
    me, myHours, approved, pending,
    loadDemo: () => { setApps((p) => [...p.filter((a) => !a.mine), DEMO_AMAKA]); },
    setStage: (s: Stage) => setApps((p) => p.map((a) => (a.mine ? { ...a, stage: s } : a))),
    updateMe: (patch: Partial<Application>) => setApps((p) => p.map((a) => (a.mine ? { ...a, ...patch } : a))),
    deleteMe: () => { setApps((p) => p.filter((a) => !a.mine)); setHours((p) => p.filter((h) => !h.mine)); },
    logHours: (h: Omit<HourLog, "id" | "status" | "method" | "who" | "mine">) =>
      setHours((p) => [{ ...h, id: newId(), who: me ? `${me.first} ${me.last}` : "Me", mine: true, status: "pending", method: "Remote log" }, ...p]),
    nowIso,
  };
}

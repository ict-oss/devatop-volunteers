// Shapes shared by the screens. The data itself always comes from the database.
export type Stage = "Submitted" | "Under review" | "Interview" | "Needs info" | "Approved" | "Rejected";
export const STAGES: Stage[] = ["Submitted", "Under review", "Interview", "Approved"];

export type Consent = { key: string; text: string; version: string; at: string };
export type Application = {
  id: string; mine?: boolean; first: string; last: string; email: string; phone: string; state: string; lga: string;
  dob: string; occupation: string; skills: string[]; departments: string[]; availability: string; languages: string[]; heard: string; nysc?: string;
  stage: Stage; submittedAt: string; note?: string; consents: Consent[];
  guardian?: { name: string; contact: string; verified: boolean; at?: string };
  programme?: string;
  /** Age worked out by the database, so the Under-18 rules work even when this admin may not see the date of birth. */
  ageYears?: number | null;
  /** The applicant's answer to "needs more information". */
  reply?: string;
};
export type HourLog = { id: string; who: string; mine?: boolean; activity: string; date: string; hours: number; status: "pending" | "approved" | "rejected"; method: "QR" | "Coordinator" | "Remote log"; programme?: string; state?: string };

/** Age of an application: the database figure if there is one, otherwise worked out from the date of birth. */
export const ageFor = (a: Pick<Application, "dob" | "ageYears">) => (a.ageYears !== undefined ? a.ageYears : ageOf(a.dob));
export const ageOf = (dob: string, on = new Date()) => {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(+d)) return null;
  let a = on.getFullYear() - d.getFullYear();
  const m = on.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < d.getDate())) a--;
  return a;
};


export const newId = () => Math.random().toString(36).slice(2, 9);
export const nowIso = () => new Date().toISOString();

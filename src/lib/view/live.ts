import type { Application, HourLog, Stage } from "../store";
import type { HourView } from "../services/hours";
import type { MyApplicationRow } from "../services/portal";

const STAGE: Record<MyApplicationRow["stage"], Stage> = { submitted: "Submitted", under_review: "Under review", interview: "Interview", needs_info: "Needs info", approved: "Approved", rejected: "Rejected" };
const KEY: Record<string, string> = { code_of_conduct: "conduct", safeguarding: "safeguarding", privacy: "privacy", photo_media: "media" };

/** The signed-in volunteer's own application, in the shape the dashboard (built on the prototype) already reads. */
export function toMe(a: MyApplicationRow): Application {
  return {
    id: a.id, mine: true, first: a.first, last: a.last, email: a.email ?? "", phone: a.phone ?? "", state: a.state, lga: a.lga, dob: a.dob ?? "",
    occupation: "", skills: a.skills, departments: a.departmentIds, availability: a.availability ?? "", languages: a.languages, heard: "",
    stage: STAGE[a.stage], submittedAt: a.submittedAt, note: a.needsInfoNote ?? undefined,
    consents: a.consents.map((c) => ({ key: KEY[c.kind] ?? c.kind, text: "", version: c.version, at: c.at })),
  };
}
export const toHourLog = (h: HourView): HourLog => ({ id: h.id, who: h.who, mine: true, activity: h.activity, date: h.date, hours: h.hours, status: h.status, method: h.method });

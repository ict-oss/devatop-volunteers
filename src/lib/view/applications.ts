import type { Application, Stage } from "../store";
import type { QueueRow } from "../services/review";

const STAGE: Record<QueueRow["stage"], Stage> = { submitted: "Submitted", under_review: "Under review", interview: "Interview", needs_info: "Needs info" };
const KEY: Record<string, string> = { code_of_conduct: "conduct", safeguarding: "safeguarding", privacy: "privacy", photo_media: "media", data_use: "data_use", email_updates: "email_updates" };

/** Database row -> the shape the review screen (built on the prototype) already understands. */
export function toApplication(q: QueueRow): Application {
  return {
    id: q.id, first: q.first, last: q.last, email: q.email ?? "", phone: q.phone ?? "", state: q.state, lga: q.lga,
    dob: q.dob ?? "", ageYears: q.ageYears, occupation: "", skills: q.skills, departments: q.departmentIds,
    availability: q.availability ?? "", languages: q.languages, heard: "", stage: STAGE[q.stage], submittedAt: q.submittedAt,
    consents: q.consents.map((c) => ({ key: KEY[c.kind] ?? c.kind, text: "", version: c.version, at: q.submittedAt })),
    guardian: q.ageYears !== null && q.ageYears < 18 ? { name: q.guardianName ?? "", contact: "", verified: q.guardianVerified } : undefined,
  };
}
export const STAGE_TO_DB = { Approved: "approved", Rejected: "rejected", "Needs info": "needs_info" } as const;

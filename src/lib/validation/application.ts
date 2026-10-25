import { z } from "zod";
import { STATE_NAMES } from "../data";
import { CONSENTS, type ConsentKey } from "../consent-texts";

/** One set of rules for the form (browser) and the server action. The server always re-checks. */
const text = (max: number) => z.string().trim().min(1).max(max);
const keys = CONSENTS.map((c) => c.key) as [ConsentKey, ...ConsentKey[]];

export const applicationSchema = z.object({
  first: text(60), last: text(60),
  phone: z.string().trim().regex(/^[0+][\d\s-]{9,14}$/, "Enter a Nigerian phone number, e.g. 0803 123 4567."),
  state: z.enum(STATE_NAMES as [string, ...string[]]),
  lga: text(80),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => { const t = Date.parse(d); return !isNaN(t) && t <= Date.now() && t > Date.parse("1900-01-01"); }, "That date of birth is not valid."),
  occupation: z.string().trim().max(80).optional().default(""),
  nysc: z.string().trim().max(30).optional().default(""),
  skills: z.array(text(40)).min(1).max(20),
  departmentIds: z.array(z.uuid()).min(1).max(12),
  availability: text(40),
  languages: z.array(text(30)).max(12).default([]),
  heard: z.string().trim().max(60).optional().default(""),
  /** Which consent boxes were ticked. The wording comes from the server (consent-texts.ts). */
  consents: z.array(z.enum(keys)).max(8),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const guardianSchema = z.object({ name: text(80), email: z.string().trim().toLowerCase().email().max(120) });
export type GuardianInput = z.infer<typeof guardianSchema>;

export const ageOn = (dob: string, on = new Date()) => {
  const d = new Date(dob); if (isNaN(+d)) return null;
  let a = on.getUTCFullYear() - d.getUTCFullYear();
  const m = on.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < d.getUTCDate())) a--;
  return a;
};

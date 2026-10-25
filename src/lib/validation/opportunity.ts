import { z } from "zod";
import { STATE_NAMES } from "../data";

/** Shared by the admin form and the server action. */
const dt = z.string().refine((s) => !isNaN(Date.parse(s)), "Pick a valid date and time.");
export const opportunitySchema = z.object({
  title: z.string().trim().min(3, "Give it a title.").max(120), description: z.string().trim().max(1200).default(""),
  programmeId: z.uuid("Pick a programme."), departmentId: z.uuid().nullable().default(null),
  mode: z.enum(["physical", "remote"]), state: z.enum(STATE_NAMES as [string, ...string[]]).nullable().default(null), place: z.string().trim().max(120).default(""),
  startsAt: dt, endsAt: dt.nullable().default(null), signupDeadline: dt,
  slots: z.number().int().min(1, "At least 1 slot.").max(5000), skills: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  commitment: z.string().trim().max(80).default(""), published: z.boolean().default(true),
}).superRefine((o, ctx) => {
  if (o.mode === "physical" && !o.state) ctx.addIssue({ code: "custom", path: ["state"], message: "Pick the state for a physical call." });
  if (Date.parse(o.signupDeadline) > Date.parse(o.startsAt)) ctx.addIssue({ code: "custom", path: ["signupDeadline"], message: "Sign-ups must close before the call starts." });
  if (o.endsAt && Date.parse(o.endsAt) < Date.parse(o.startsAt)) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start." });
});
export type OpportunityInput = z.infer<typeof opportunitySchema>;

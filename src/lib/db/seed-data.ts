/**
 * Starting data for a brand-new database (step 2). Everything here is a PLACEHOLDER Devatop confirms and then edits
 * in the admin section; none of it is read by code as a fixed list (rule 10: departments are rows, never hard-coded).
 * Items marked (confirm) in the requirements document are marked here too.
 */
import { DEFAULT_TEMPLATES, DEFAULT_SETTINGS } from "../emails";

export const SEED_PROGRAMMES = ["AI4Rights", "Talkam", "Programmes and Field Outreach", "Communications and Media", "Policy and Research", "Events and Logistics", "ICT", "Finance", "Monitoring and Evaluation"];

/** (confirm) Section 18 lists 8 departments; the prototype also has Finance and Monitoring and Evaluation, and names one "Policy and Research". */
export const SEED_DEPARTMENTS: { name: string; description: string }[] = [
  { name: "Communications and Media", description: "Social media, writing, design, photography, video, podcast" },
  { name: "ICT", description: "Websites, tech support, data, digital safety training" },
  { name: "Programmes and Field Outreach", description: "Community sensitisation, school visits, campaigns" },
  { name: "Policy and Research", description: "Research, policy briefs, documentation" },
  { name: "Talkam", description: "Supporting human rights reporting and response through Talkam" },
  { name: "AI4Rights", description: "Data-rights and AI awareness sessions" },
  { name: "Events and Logistics", description: "Planning and running events, trainings and outreaches" },
  { name: "Partnerships and Fundraising", description: "Donor research, proposals, partner outreach" },
  { name: "Finance", description: "Bookkeeping support, budgets, receipts and financial reporting" },
  { name: "Monitoring and Evaluation", description: "Data collection, impact tracking, surveys and learning reports" },
];

/** Keys match the database policies: min_age and review_days are public, whatsapp_group is for active volunteers, the rest for admins. */
export const SEED_SETTINGS: Record<string, unknown> = {
  min_age: 16,                       // (confirm) lowest age accepted
  review_days: DEFAULT_SETTINGS.reviewDays, // (confirm) "we'll reply within N days"
  whatsapp_group: "",                // the real invite link is pasted in Admin > Messages; empty hides the button
  sender_name: DEFAULT_SETTINGS.senderName,
  sender_email: DEFAULT_SETTINGS.senderEmail, // (confirm) must be a verified Devatop sender in Brevo or Resend
  talkam_link: DEFAULT_SETTINGS.talkamLink,
};

export const SEED_TRAININGS = [
  { name: "Orientation", required: true, renewAfterDays: null as number | null },
  { name: "Safeguarding", required: true, renewAfterDays: 365 as number | null }, // (confirm) renewal period
];

export const SEED_TEMPLATES = DEFAULT_TEMPLATES.map((t) => ({ id: t.id, subject: t.subject, body: t.body }));

type SeedGuide = { title: string; audience: "volunteers" | "admins" | "public"; mustRead?: boolean; published: boolean; body: string[] };
/** Volunteer guides are the ones in the prototype. Admin guides are drafts (unpublished) until Devatop reviews them. */
export const SEED_GUIDES: SeedGuide[] = [
  { title: "Code of conduct", audience: "volunteers", mustRead: true, published: true, body: ["Treat everyone with dignity. No harassment, no discrimination, no exceptions.", "Never take photos of people without consent, and never of children or survivors.", "You represent Devatop on activity days. Be on time, be kind, follow your team lead.", "If you see something wrong, say so. You will not be punished for reporting a concern."] },
  { title: "Safeguarding in plain words", audience: "volunteers", mustRead: true, published: true, body: ["Safeguarding means keeping children and survivors safe from harm.", "You never meet a young person alone, never share your personal contacts with them, and never promise to keep a secret about harm.", "If a young person tells you about abuse, listen, do not investigate, and tell your coordinator straight away.", "Nobody works with children or survivors until they have finished safeguarding training."] },
  { title: "How to sign up, check in and log hours", audience: "volunteers", published: true, body: ["Sign up for a call in one tap from the Calls board.", "At events, scan the QR code on arrival and again when you leave. Your hours are recorded automatically.", "Doing remote work? Log your hours from the Hours page. An admin approves them before they count."] },
  { title: "Using Talkam", audience: "volunteers", published: true, body: ["Talkam lets people report abuse and get help. If you see am, Talkam.", "Volunteers help people understand how to report. They never take reports on their own."] },
  { title: "Staying safe in the field", audience: "volunteers", published: true, body: ["Travel in pairs. Share your location with your team lead.", "Keep your Devatop ID or shirt visible. Carry water and a charged phone.", "Your contact on the day is listed on your sign-up."] },
  { title: "Admin handbook: reviewing applications", audience: "admins", published: false, body: ["Open the queue oldest first. Read the application, then approve, reject or ask for more information. Each takes under a minute.", "An applicant under 18 cannot be approved until a parent or guardian has confirmed by code. The system refuses it otherwise.", "Every decision is written to the audit log with your name and the time. (Draft: Devatop to review.)"] },
  { title: "Admin handbook: running an event and approving hours", audience: "admins", published: false, body: ["Create the opportunity with slots, place, date, skills and deadline. Show the QR code at the venue; volunteers scan in and out.", "Mark attendance from the sign-up list on your phone. Hours from check-in stay pending until an admin approves them. You cannot approve your own hours.", "Only approved hours count towards totals, certificates and reports. (Draft: Devatop to review.)"] },
  { title: "Admin handbook: a safeguarding concern", audience: "admins", published: false, body: ["If a volunteer or participant reports harm, stay calm, listen, and do not investigate.", "Tell the safeguarding lead straight away and write down only what was said, in the person's own words. (Draft: Devatop to add its safeguarding lead and procedure.)"] },
];

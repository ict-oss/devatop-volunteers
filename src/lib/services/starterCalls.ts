import { sql } from "drizzle-orm";
import { opportunitySchema, type OpportunityInput } from "../validation/opportunity";
import { createOpportunity } from "./opportunities";
import { rowsOf, type Db } from "./db";

/**
 * The roles Devatop needs people for, ready to publish as calls so the Calls page is never empty.
 * These are real calls (not demo data): an admin can edit, unpublish or delete any of them in Admin > Opportunities.
 * Dates are a few weeks ahead; change them to the real start dates.
 */
type Starter = { title: string; programme: string; mode: "remote" | "physical"; state?: string; place?: string; inDays: number; slots: number; skills: string[]; commitment: string; description: string };
export const STARTER_CALLS: Starter[] = [
  { title: "AI4Rights Community Manager", programme: "AI4Rights", mode: "remote", inDays: 14, slots: 3, skills: ["Social media", "Writing", "Counselling"], commitment: "5 hrs per week",
    description: "Look after the AI4Rights online community: welcome new members, answer their questions, share updates and keep the space respectful and safe. You work with the AI4Rights team and report to the programme lead. You are patient, calm and comfortable running WhatsApp or social media groups." },
  { title: "Content Creator, Devatop Centre for African Development", programme: "Communications and Media", mode: "remote", inDays: 14, slots: 4, skills: ["Writing", "Design", "Video", "Photography"], commitment: "6 hrs per week",
    description: "Turn Devatop's work into posts, short videos, graphics and stories that make people act. You plan with the communications team and follow our safeguarding rules: never show survivors or identifiable children, and always have consent from the adults you feature." },
  { title: "AI4Rights Facilitator", programme: "AI4Rights", mode: "physical", state: "Lagos", place: "Schools and community venues", inDays: 21, slots: 10, skills: ["Teaching", "Public speaking"], commitment: "4 hrs, Saturdays",
    description: "Lead AI4Rights sessions that help young people understand their data rights and stay safe online. Full training and a facilitator guide are provided before your first session, and an experienced lead is always with you." },
  { title: "Social Media Volunteer", programme: "Communications and Media", mode: "remote", inDays: 14, slots: 6, skills: ["Social media", "Writing"], commitment: "3 hrs per week",
    description: "Schedule and write posts for Devatop's accounts, reply to comments kindly and report anything worrying to the team. No experience needed if you are consistent and careful with words." },
  { title: "Talkam Community Volunteer", programme: "Talkam", mode: "remote", inDays: 21, slots: 8, skills: ["Translation", "Counselling", "Public speaking"], commitment: "4 hrs per week",
    description: "Help people in your community learn about Talkam and how to report abuse safely. You complete safeguarding training first, you never handle a survivor's case alone, and you pass every report to the trained team." },
  { title: "Field Outreach Volunteer", programme: "Programmes and Field Outreach", mode: "physical", state: "FCT Abuja", place: "Markets, schools and communities", inDays: 21, slots: 15, skills: ["Event support", "Public speaking"], commitment: "6 hrs per outreach",
    description: "Join awareness walks and community visits against human trafficking and gender-based violence. A trained adult leads every outreach. You carry materials, talk to people and help the day run smoothly." },
  { title: "Policy and Research Assistant", programme: "Policy and Research", mode: "remote", inDays: 28, slots: 4, skills: ["Research", "Writing", "Data"], commitment: "5 hrs per week",
    description: "Find and summarise reports, laws and data for Devatop's policy briefs, and keep our documentation tidy. Good for students and graduates who enjoy reading and checking facts." },
  { title: "Events and Logistics Volunteer", programme: "Events and Logistics", mode: "physical", state: "Lagos", place: "Event venues", inDays: 28, slots: 12, skills: ["Event support", "Photography"], commitment: "1 day per event",
    description: "Help plan and run trainings, summits and outreaches: set up venues, welcome guests, manage registration, take attendance with the QR code and keep to the schedule." },
  { title: "ICT Support and Digital Safety Volunteer", programme: "ICT", mode: "remote", inDays: 28, slots: 4, skills: ["Web / tech", "Teaching"], commitment: "3 hrs per week",
    description: "Keep Devatop's tools working and teach digital safety basics: strong passwords, privacy settings and spotting scams. You follow our data protection rules and never access personal records unless your role allows it." },
  { title: "Monitoring and Evaluation Data Collector", programme: "Monitoring and Evaluation", mode: "remote", inDays: 35, slots: 5, skills: ["Data", "Research"], commitment: "4 hrs per week",
    description: "Collect and clean survey and attendance data, and help turn it into short learning reports so Devatop can see what works. Careful, honest record keeping matters more than speed." },
  { title: "Partnerships and Fundraising Assistant", programme: "Partnerships and Fundraising", mode: "remote", inDays: 35, slots: 3, skills: ["Fundraising", "Research", "Writing"], commitment: "4 hrs per week",
    description: "Research donors and partners, help draft proposals and keep a simple tracker of conversations. You work under the partnerships lead and never contact funders on your own." },
  { title: "Translator: Hausa, Yoruba, Igbo and Pidgin", programme: "Communications and Media", mode: "remote", inDays: 21, slots: 6, skills: ["Translation", "Writing"], commitment: "3 hrs per week",
    description: "Translate Devatop's safety messages, posts and guides so more people can understand them in their own language. Tell us which languages you read and write best when you sign up." },
];

/** Adds the starter calls that are not there yet (matched by title), so running it twice does nothing the second time. */
export async function addStarterCalls(db: Db, now = new Date()): Promise<{ added: number; skipped: number }> {
  const programmes = rowsOf<{ id: string; name: string }>(await db.execute(sql`select id, name from programmes where active order by name`));
  const have = new Set(rowsOf<{ title: string }>(await db.execute(sql`select title from opportunities`)).map((r) => r.title));
  let added = 0, skipped = 0;
  for (const c of STARTER_CALLS) {
    const programme = programmes.find((p) => p.name === c.programme) ?? programmes[0];
    if (have.has(c.title) || !programme) { skipped++; continue; }
    const start = new Date(now.getTime() + c.inDays * 864e5); start.setUTCHours(9, 0, 0, 0);
    const deadline = new Date(start.getTime() - 864e5);
    const input: OpportunityInput = opportunitySchema.parse({
      title: c.title, description: c.description, programmeId: programme.id, departmentId: null, mode: c.mode, state: c.mode === "physical" ? c.state ?? null : null,
      place: c.place ?? "", startsAt: start.toISOString(), endsAt: null, signupDeadline: deadline.toISOString(), slots: c.slots, skills: c.skills, commitment: c.commitment, published: true,
    });
    await createOpportunity(db, input);
    added++;
  }
  return { added, skipped };
}

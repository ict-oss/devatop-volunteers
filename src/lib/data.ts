// ILLUSTRATIVE DATA ONLY. Swap for Drizzle queries on Supabase (see docs/developer/architecture.md).
// Anything marked (confirm) in the requirements doc is a fact Devatop must check before launch.

export const REVIEW_DAYS = 7; // (confirm)
export const MIN_AGE = 16; // (confirm)

export const STATE_NAMES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu",
  "FCT Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun",
  "Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
];

export const SKILLS = ["Writing", "Design", "Photography", "Video", "Social media", "Research", "Data", "Web / tech", "Teaching", "Public speaking", "Event support", "Translation", "Counselling", "Fundraising"];
export const LANGUAGES = ["English", "Pidgin", "Yoruba", "Igbo", "Hausa", "Efik", "Tiv", "Fulfulde", "Other"];
export const HEARD = ["Instagram", "X / Twitter", "WhatsApp", "A friend", "Campus / NYSC", "Devatop event", "Radio / TV", "Other"];

export type Department = { id: string; name: string; blurb: string; status: "active" | "archived"; members: number };
export const DEPARTMENTS: Department[] = [
  { id: "comms", name: "Communications and Media", blurb: "Social media, writing, design, photography, video, podcast", status: "active", members: 214 },
  { id: "ict", name: "ICT", blurb: "Websites, tech support, data, digital safety training", status: "active", members: 96 },
  { id: "field", name: "Programmes and Field Outreach", blurb: "Community sensitisation, school visits, campaigns", status: "active", members: 388 },
  { id: "research", name: "Policy and Research", blurb: "Research, policy briefs, documentation", status: "active", members: 71 },
  { id: "talkam", name: "Talkam", blurb: "Supporting human rights reporting and response through Talkam", status: "active", members: 142 },
  { id: "ai4rights", name: "AI4Rights", blurb: "Data-rights and AI awareness sessions", status: "active", members: 118 },
  { id: "events", name: "Events and Logistics", blurb: "Planning and running events, trainings and outreaches", status: "active", members: 163 },
  { id: "partners", name: "Partnerships and Fundraising", blurb: "Donor research, proposals, partner outreach", status: "active", members: 44 },
  { id: "finance", name: "Finance", blurb: "Bookkeeping support, budgets, receipts and financial reporting", status: "active", members: 19 },
  { id: "me", name: "Monitoring and Evaluation", blurb: "Data collection, impact tracking, surveys and learning reports", status: "active", members: 27 },
];

export type Opportunity = {
  id: string; title: string; programme: string; state: string; place: string; mode: "Physical" | "Remote";
  date: string; commitment: string; skills: string[]; deadline: string; slots: number; taken: number; blurb: string; urgent?: boolean;
};
export const OPPORTUNITIES: Opportunity[] = [
  { id: "ai4r-lagos-nov", title: "AI4Rights facilitator — school sessions", programme: "AI4Rights", state: "Lagos", place: "Yaba & Surulere", mode: "Physical", date: "2026-11-07", commitment: "4 hrs / Saturday", skills: ["Teaching", "Public speaking"], deadline: "2026-11-02", slots: 12, taken: 9, blurb: "Run a one-hour data-rights session for secondary-school clubs. Full facilitator script and training provided.", urgent: true },
  { id: "outreach-abuja", title: "Field outreach — anti-trafficking awareness walk", programme: "Programmes and Field Outreach", state: "FCT Abuja", place: "Wuse Market", mode: "Physical", date: "2026-11-14", commitment: "6 hrs", skills: ["Event support", "Public speaking"], deadline: "2026-11-09", slots: 30, taken: 18, blurb: "Hand out materials, hold the line, talk to traders and commuters. Team leads on every group." },
  { id: "comms-remote", title: "Social media storyteller", programme: "Communications and Media", state: "Remote (any state)", place: "From home", mode: "Remote", date: "2026-11-30", commitment: "3 hrs / week", skills: ["Writing", "Social media", "Design"], deadline: "2026-11-20", slots: 6, taken: 2, blurb: "Turn field notes into posts, threads and short videos that people share." },
  { id: "talkam-kano", title: "Talkam community listeners", programme: "Talkam", state: "Kano", place: "Nassarawa & Fagge", mode: "Physical", date: "2026-11-21", commitment: "5 hrs", skills: ["Translation", "Counselling"], deadline: "2026-11-15", slots: 10, taken: 4, blurb: "Help people understand how to report abuse through Talkam, in Hausa and English." },
  { id: "research-remote", title: "Policy brief researcher", programme: "Policy and Research", state: "Remote (any state)", place: "From home", mode: "Remote", date: "2026-12-05", commitment: "5 hrs / week for 4 weeks", skills: ["Research", "Writing", "Data"], deadline: "2026-11-25", slots: 4, taken: 1, blurb: "Support a brief on online recruitment of young people into trafficking." },
  { id: "event-enugu", title: "Youth summit — event support crew", programme: "Events and Logistics", state: "Enugu", place: "Enugu city", mode: "Physical", date: "2026-11-28", commitment: "1 day", skills: ["Event support", "Photography"], deadline: "2026-11-22", slots: 20, taken: 11, blurb: "Registration desk, QR check-in, ushering, photography. Lunch provided (confirm).", urgent: true },
  { id: "ict-remote", title: "Digital safety trainer", programme: "ICT", state: "Remote (any state)", place: "Online sessions", mode: "Remote", date: "2026-12-12", commitment: "2 hrs / session", skills: ["Web / tech", "Teaching"], deadline: "2026-12-01", slots: 8, taken: 3, blurb: "Teach young people how to spot fake job offers and protect their accounts." },
  { id: "outreach-ph", title: "Port Harcourt campus campaign", programme: "Programmes and Field Outreach", state: "Rivers", place: "UNIPORT", mode: "Physical", date: "2026-12-03", commitment: "1 day", skills: ["Event support", "Social media"], deadline: "2026-11-27", slots: 25, taken: 25, blurb: "Campus awareness campaign. Slots are full — join the waitlist." },
];

export const PROGRAMMES = ["AI4Rights", "Talkam", "Programmes and Field Outreach", "Communications and Media", "Policy and Research", "Events and Logistics", "ICT", "Finance", "Monitoring and Evaluation"];

// hours given per state (illustrative) — drives the orange states on the map
export const STATE_HOURS: Record<string, number> = {
  lagos: 2840, federalcapitalterritory: 2210, oyo: 760, rivers: 690, kano: 640, kaduna: 520, enugu: 910, anambra: 470, ogun: 410, edo: 380,
  delta: 330, plateau: 290, kwara: 240, osun: 210, akwaibom: 260, crossriver: 180, benue: 150, niger: 140, borno: 120, imo: 200, abia: 160, ondo: 170,
};
export const TOTALS = { hours: Object.values(STATE_HOURS).reduce((a, b) => a + b, 0), volunteers: 1236, states: Object.keys(STATE_HOURS).length };

export const ROLL = ["Amaka O.", "Tunde A.", "Hadiza M.", "Chidi E.", "Ngozi U.", "Ibrahim S.", "Funke B.", "Emeka N.", "Zainab Y.", "Seun K.", "Blessing I.", "Musa D.", "Adaeze C.", "Kemi L.", "Peter T.", "Halima G."];

export const FAQS = [
  ["Who can volunteer?", `Anyone in Nigeria who shares the cause. If you're under 18, a parent or guardian must give consent, and the lowest age we accept is ${MIN_AGE} (confirm).`],
  ["Is it paid?", "No. Volunteering is unpaid. Transport support for field activities may be available (confirm)."],
  ["Can I volunteer online?", "Yes. Comms, design, research and tech roles are often remote. Filter calls to action by “Remote”."],
  ["I'm a corps member or student. Can I get a letter?", "Yes. Your dashboard gives you an hours statement and certificate, and you can request a letter from there."],
  ["How long does approval take?", `Usually within ${REVIEW_DAYS} days (confirm). Your dashboard always shows where your application stands.`],
  ["What happens to my data?", "We use it only to run the volunteer programme. You can download it, correct it or delete your account from your dashboard at any time. Our hosting providers store data outside Nigeria; the privacy policy explains this."],
  ["Will I work with children or survivors?", "Only in specific roles, and only after safeguarding training and checks."],
  ["Can I stop volunteering?", "Yes, any time. Set your profile to inactive, or delete your account."],
];

export const money = (n: number) => n.toLocaleString("en-NG");
export const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

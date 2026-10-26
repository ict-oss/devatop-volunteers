// Fixed lists and small helpers. Nothing here is sample data: departments, calls, volunteers and numbers all come from the database.

export const STATE_NAMES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu",
  "FCT Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun",
  "Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
];

export const SKILLS = ["Writing", "Design", "Photography", "Video", "Social media", "Research", "Data", "Web / tech", "Teaching", "Public speaking", "Event support", "Translation", "Counselling", "Fundraising"];
export const LANGUAGES = ["English", "Pidgin", "Yoruba", "Igbo", "Hausa", "Efik", "Tiv", "Fulfulde", "Other"];
export const HEARD = ["Instagram", "X / Twitter", "WhatsApp", "A friend", "Campus / NYSC", "Devatop event", "Radio / TV", "Other"];

export type Opportunity = {
  id: string; title: string; programme: string; state: string; place: string; mode: "Physical" | "Remote";
  date: string; commitment: string; skills: string[]; deadline: string; slots: number; taken: number; blurb: string; urgent?: boolean;
};
/** Reads the minimum age and review time from the settings (Admin > Messages > Settings), so the page never disagrees with the rules. */
export const faqs = (minAge: number, reviewDays: number) => [
  ["Who can volunteer?", `Anyone in Nigeria who shares the cause. If you're under 18, a parent or guardian must give consent, and the lowest age we accept is ${minAge}.`],
  ["Is it paid?", "No. Volunteering is unpaid. Transport support for field activities may be available."],
  ["Can I volunteer online?", "Yes. Comms, design, research and tech roles are often remote. Filter calls to action by “Remote”."],
  ["I'm a corps member or student. Can I get a letter?", "Yes. Your dashboard gives you an hours statement and certificate, and you can request a letter from there."],
  ["How long does approval take?", `Usually within ${reviewDays} days. Your dashboard always shows where your application stands.`],
  ["What happens to my data?", "We use it only to run the volunteer programme. You can download it, correct it or delete your account from your dashboard at any time. Our hosting providers store data outside Nigeria; the privacy policy explains this."],
  ["Will I work with children or survivors?", "Only in specific roles, and only after safeguarding training and checks."],
  ["Can I stop volunteering?", "Yes, any time. Set your profile to inactive, or delete your account."],
];

export const money = (n: number) => n.toLocaleString("en-NG");
export const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// npm run db:seed
// Fills a new database with the starting programmes, departments, settings, trainings, email templates and guides.
// Safe to run twice: it does nothing if the database was already seeded. Prints counts only, never data or secrets.
import postgres from "postgres";
import { seedOnce } from "../src/lib/db/seed";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is missing. Create .env.local (see .env.example) and try again."); process.exit(1); }

// wrapped in a function: the script runs as CommonJS on some computers (Node 24 + tsx), where top-level await is not allowed
async function main(url: string) {
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    const seeded = await sql.begin(async (tx) => seedOnce((text, params) => tx.unsafe(text, params as never[])));
    if (!seeded) console.log("Already seeded: nothing changed. (Edit departments, settings and guides in the admin section.)");
    else {
      const n = async (t: string) => (await sql.unsafe(`select count(*)::int as n from ${t}`))[0].n;
      console.log(`Seeded: ${await n("programmes")} programmes, ${await n("departments")} departments, ${await n("trainings")} trainings, ${await n("email_templates")} email templates, ${await n("app_settings")} settings, ${await n("guides")} guides.`);
    }
  } catch (e) {
    console.error(`Seeding failed: ${(e as Error).message}`);
    process.exitCode = 1;
  } finally { await sql.end({ timeout: 5 }); }
}
main(url);

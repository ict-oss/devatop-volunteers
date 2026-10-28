// npm run db:demo          adds 10 TEMPORARY demo volunteers (so the home numbers and Admin screens show something)
// npm run db:demo:remove   removes exactly those demo volunteers again. Prints counts only.
import postgres from "postgres";
import { demoCount, removeDemo, seedDemo } from "../src/lib/db/demo";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is missing. Create .env.local (see .env.example) and try again."); process.exit(1); }
const mode = process.argv[2] === "remove" ? "remove" : "add";

// wrapped in a function: the script runs as CommonJS on some computers (Node 24 + tsx), where top-level await is not allowed
async function main(url: string) {
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      const run = async (text: string, params?: unknown[]) => [...(await tx.unsafe(text, (params ?? []) as never[]))] as Record<string, unknown>[];
      if (mode === "remove") console.log(`Removed ${await removeDemo(run)} demo volunteers.`);
      else {
        const r = await seedDemo(run);
        if (r.added === 0 && r.calls === 0) console.log(`Demo volunteers are already there (${await demoCount(run)}). Nothing changed.`);
        else console.log(`Added ${r.added} demo volunteers and ${r.calls} demo calls, all marked (Temp).${r.withHours || r.added === 0 ? "" : " No hours were added because no admin exists yet: sign in as a Super Admin, then run npm run db:demo:remove and npm run db:demo again."} Remove them before launch: npm run db:demo:remove`);
      }
    });
  } catch (e) {
    console.error(`Failed: ${(e as Error).message}`);
    process.exitCode = 1;
  } finally { await sql.end({ timeout: 5 }); }
}
main(url);

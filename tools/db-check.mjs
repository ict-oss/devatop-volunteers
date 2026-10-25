// npm run db:check
// Connects to the database in .env.local and reports whether the Devatop schema is there. Never prints passwords or data.
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is missing. Create .env.local (see .env.example) and try again."); process.exit(1); }

let host = "(unreadable address)";
try { host = new URL(url).host; } catch { console.error("DATABASE_URL is not a valid address. Copy it again from Supabase > Settings > Database."); process.exit(1); }

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15, onnotice: () => {} });
try {
  const [{ version }] = await sql`select version()`;
  console.log(`Connected to ${host}\n${version.split(",")[0]}`);
  const [{ n: tables }] = await sql`select count(*)::int as n from pg_tables where schemaname = 'public'`;
  const [{ n: rls }] = await sql`select count(*)::int as n from pg_tables where schemaname = 'public' and rowsecurity`;
  console.log(`Tables in public schema: ${tables} (row-level security on for ${rls})`);
  if (tables === 0) console.log("No tables yet. Run: npm run db:migrate");
  else {
    const [{ n: perms }] = await sql`select count(*)::int as n from role_permissions`.catch(() => [{ n: -1 }]);
    const [{ n: policies }] = await sql`select count(*)::int as n from pg_policies where schemaname = 'public'`;
    console.log(`Permission rows: ${perms} (expect 83) | Security policies: ${policies}`);
    console.log(tables >= 30 && rls === tables && perms === 83 ? "OK: the Devatop schema is installed and protected." : "The schema looks incomplete. Run: npm run db:migrate");
  }
} catch (e) {
  console.error(`Could not connect to ${host}: ${e.message}`);
  if (/ENOTFOUND|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH/.test(String(e.code ?? e.message))) console.error("Tip: if you used the 'Direct connection' string, your network may not support IPv6. Use the 'Session pooler' string from Supabase instead.");
  if (/password|authentication/i.test(e.message)) console.error("Tip: check the database password (reset it in Supabase > Settings > Database if unsure).");
  process.exitCode = 1;
} finally { await sql.end({ timeout: 5 }); }

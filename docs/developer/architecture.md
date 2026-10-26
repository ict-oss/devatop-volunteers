# Architecture

Three areas in one Next.js app (public, volunteer portal, admin), one PostgreSQL database on Supabase.

## Where the rules live

1. **The database** (`src/lib/db/migrations/0001_*`): row-level security, and triggers for the rules that must never break (under-18 needs a verified guardian, only approved hours count, consents are append-only, certificates only from approved hours, two Super Admins minimum, departments are never lost). Even the service role cannot break the hard ones.
2. **`src/lib/permissions.ts`**: the permissions matrix. It also seeds the database (`npm run db:permissions`) and a test fails if the two differ.
3. **`src/lib/services/*`**: every query and business rule, as plain functions taking a Drizzle `db` or transaction. They run as the signed-in person through `asUser()` (`src/lib/db/rls.ts`), so the database applies row-level security to them.
4. **`src/app/actions/*`**: server actions. Each one checks the exact permission (`adminCaller("hours.approve")`), validates with Zod, runs a service as the person, then sends any email.
5. **Pages**: server components load data and hand it to client components. Hiding a button is never the check.

## Request flow

browser → `src/proxy.ts` (session refresh, idle timeout) → page (server component: `adminCaller` or `getCaller`) → `asCaller(person, tx => service(tx, ...))` → Postgres (role `authenticated`, claims `sub` and `aal`).

`db()` / `trusted()` is the database owner and **bypasses** row-level security: only for sending email, the cron job, the audit log for exports, and reading admin sign-in emails. Never `await` a trusted query inside an `asCaller` callback.

## One system, no prototype

Every screen reads and writes the database. The earlier clickable prototype (sample data in browser storage, `*Proto.tsx`, `store.ts`) has been removed. Screens read props from the server or `LiveContext` (`src/lib/live.tsx`, filled by `src/lib/server/live.ts`). The only things kept in the browser are the cookie choice and an unfinished application form (`src/lib/useLocal.ts`).

## Auth

Supabase Auth, emailed one-time code (no passwords, no SMS). Admins add an authenticator-app code (TOTP); the database treats an admin as an admin only at assurance level `aal2`. Routing rules are pure functions in `src/lib/auth/routing.ts`.

## Email

`src/lib/email/notify.ts` renders one of the seven templates (editable in Admin > Messages, stored in `email_templates`) and sends through Brevo. The outcome (template and status, never an address or body) goes to `email_log`.

## Testing

`tests/db` and `tests/services` run the real migrations in an in-memory Postgres (PGlite), so the same SQL that runs on Supabase is tested. `tests/auth` covers sign-in routing. `tools/e2e` drives the whole app in a browser against a local fake of Supabase Auth and Brevo.

# Devatop Volunteers Platform

Volunteer platform for Devatop Centre for Africa Development, at volunteer.devatop.org.
Three areas: public site, volunteer portal, admin section.
Source of truth for features: `docs/requirements.md` (the original PDF is next to it). If this file and that one disagree, ask.

## Where we are (update this section at the end of every session)

**Built and tested**
- A clickable prototype of all three areas on sample data stored in the browser (localStorage). It stays the default: with `AUTH_ENABLED` unset the whole site behaves as before, so reviewers on the Vercel link are not affected.
- The real system, switched on by `AUTH_ENABLED=true` (set in Vercel and `.env.local` at go-live). Every screen below reads and writes the database as the signed-in person (row-level security applies; scope in the query):
  - Sign-in by emailed code, two-factor for admins, 30-minute admin idle timeout, `/admin/not-allowed`.
  - Application on the database (3-step form, consents with exact wording, under-18 guardian by emailed link), admin review queue (approve / reject / needs info, with the emails), approval puts the volunteer in their departments.
  - Volunteer dashboard, calls and sign-ups with waitlist, hours (remote log, approval), QR check-in/out, certificates (issue, PDF with QR, public verify page), profile, "download my data", delete account, guides with read receipts, chat rooms (database decides access), announcements.
  - Admin: overview, volunteers, opportunities, attendance + QR, hours, certificates, departments (add/rename/merge/archive/restore), messages (send to a group, edit the seven emails, WhatsApp link and sender settings, sent log), reports with logged exports, audit log, site images and clips (stored in Supabase Storage).
  - Daily reminder cron: `/api/cron/reminders` (Vercel cron in `vercel.json`, protected by `CRON_SECRET`).
- How it is built (read this before changing anything): `src/lib/services/*` hold ALL database logic as plain functions that take a Drizzle `db`/transaction; they are tested against the real migrations in PGlite (`tests/services/`, `tests/db/`). `src/app/actions/*` are thin server actions (check the permission, validate with Zod, run a service as the person via `asCaller`). Pages are server components that pick the real component or the prototype one with `authEnabled()`. Screens built on the prototype keep working through hooks (`useMe`, `useOpps`, `useSignups`, `useComms`) that return real data from `LiveContext` (`src/lib/live.tsx`, filled by `src/lib/server/live.ts`).
- Rule when writing server code: never `await` a query on the trusted connection (`trusted()`) inside an `asCaller` callback. Finish the person's query first (the local test database has one connection and would deadlock).
- Local end-to-end run with no accounts: `npx tsx tools/e2e/harness.ts` (in-memory Postgres + fake Supabase Auth + fake Brevo), start the app with the printed variables plus `AUTH_ENABLED=true DB_POOL_MAX=1`, then `node tools/e2e/scenario.cjs` (needs Playwright). The code `123456` is accepted everywhere.
- A Supabase project exists (owner: Devatop). `npm run db:migrate`, `npm run db:check`, then `npm run db:seed` once. Secrets live in `.env.local` (never committed) and in Vercel environment variables.
- Images: stand-in artwork in `public/photos/`, silent clips in `public/video/` (`node tools/standins/make.mjs` regenerates). Admin > Site images replaces a picture or a silent clip (prototype: that browser only; with `AUTH_ENABLED=true`: uploaded to the public Supabase Storage bucket `site-images`, recorded in the `site_images` table with who confirmed consent, shown to every visitor via `LiveContext.images`). The bucket is created by the app on first upload. Replace stand-ins with real, consented photos. `HERO_PHOTOS_IN_LETTERS` in `src/lib/images.ts` switches the ACTION letters from solid orange to photos.

**Go-live checklist (see docs/developer/deploy.md)**
1. Supabase: email code on, authenticator two-factor on, email template shows the code, Site URL set, SMTP sender (Brevo) set.
2. `npm run db:migrate && npm run db:seed` on the live database; sign in once with each of the first two Super Admin emails, then run the SQL in `docs/developer/database.md`.
3. Vercel variables: everything in `.env.example` (`BREVO_API_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` = Session pooler). Verify the sender address in Brevo.
4. Set `AUTH_ENABLED=true`, redeploy, sign in as a Super Admin, set the WhatsApp link in Admin > Messages > Settings.

**Not done yet (in this order)**
1. Replace `src/lib/store.ts` / prototype components once the real system is live (delete `*Proto.tsx`, `useLocal` use, `data.ts` sample data).
2. Phase 2 and later: department-lead "Team Lead" volunteer role screens, join-another-department requests, tags and bulk actions, vetting notes, documents upload, training completion screens, PWA, WhatsApp Business API, email to volunteers when a department changes.
3. Real photos and clips uploaded through Admin > Site images (replace stand-ins), a tested backup restore (record the date in `docs/developer/runbook.md`), and fill in `docs/developer/handover.md` with the real account owners.
4. Facts marked "(confirm)" must be checked by Devatop (sender address, review days, minimum age 16, department list, event times, coordinator phone, safeguarding renewal period).

## Stack
- Next.js 16 (App Router), TypeScript strict. Note: Next 16 calls middleware "proxy" (`src/proxy.ts`, exported `proxy`).
- Tailwind CSS v4 (tokens in `src/app/globals.css`), custom components (no shadcn yet).
- PostgreSQL on Supabase, Drizzle ORM, migrations in `src/lib/db/migrations`.
- Supabase Auth (email one-time code; no SMS) + TOTP two-factor for admins.
- Zod for validation (to be shared by forms and server), Brevo or Resend for email, `qrcode` for QR, `fflate` for `.xlsx` export.
- GSAP (ScrollTrigger, DrawSVG) + Lenis: public site only. Vitest for tests.

## Commands
- `npm run dev`: run locally (http://localhost:3000)
- `npm test`: all tests (database rules, services, sign-in rules; no accounts needed)
- `npm run lint`: type-check (`tsc --noEmit`)
- `npm run db:migrate`: apply migrations to the database in `.env.local`
- `npm run db:check`: verify the connection and that the schema is installed
- `npm run db:seed`: fill a NEW database with starting programmes, departments, settings, trainings, email templates and guides (runs once; re-running does nothing)
- `npm run db:generate`: create a migration from schema changes; `npm run db:permissions` regenerates the permissions seed
- `npm run photos`: compress photos from `raw-photos/` into `public/photos/`

## Structure
- `src/app/(public)`: home, opportunities, about, faqs, contact, privacy, apply, verify, guardian-consent, image-slots (forwards to Admin > Site images)
- `src/app/(volunteer)`: dashboard, my-opportunities, hours, certificates, chat, guides, profile, checkin
- `src/app/(admin)/admin`: overview, applications, opportunities, attendance, hours, volunteers, reports, messages, chat, departments, audit
- `src/lib/permissions.ts`: the only place access rules live (also seeds the database)
- `src/lib/db`, `src/lib/auth`, `src/lib/emails.ts`, `src/lib/export.ts`

## Rules that must never be broken
1. Every admin page and server action calls `requireAdmin(action)` / `can(admin, action)` from `src/lib/permissions.ts`. Checks run on the server. Hiding a button is not a check.
2. Programme and state scope is applied in the database query (row-level security), not after loading.
3. Volunteers can only read and change their own records.
4. Every admin write adds a row to `audit_logs` (the database triggers do this).
5. No personal data (names, phones, emails, dates of birth) in URLs, logs or error messages.
6. An under-18 volunteer cannot be approved without a verified `guardian_consents` row. Enforced in the database too.
7. Only approved hours count toward totals, certificates and reports.
8. Every consent stores the text version and a timestamp (append-only).
9. Never use photos of identifiable children or survivors in seed data or UI.
10. Departments are rows in the `departments` table. Never hard-code department names; archive or merge instead of deleting.

## Design rules
- Follow section 16 of `docs/requirements.md` and the tokens in `globals.css`.
- Fonts: Big Shoulders (display; Google renamed it from "Big Shoulders Display"), Fraunces Italic (one accent word), Atkinson Hyperlegible Next (body). Never Inter, Roboto, Arial or Poppins.
- Colours: Talkam Orange #F05023, Ink #16130F, Newsprint #F2EDE3, Stamp Green #0B6E4F (status only), Alert Red #B42318 (errors only). No gradients, glows, glass cards or heavy shadows.
- Text on orange is Ink. White on orange only at 24px bold and above.
- Motion and the custom cursor on the public site only. Respect `prefers-reduced-motion` and `pointer: coarse`. No motion in the admin section.
- Mobile first. Test every page at 375px wide.
- Put custom CSS classes inside `@layer components` in `globals.css`, otherwise they override Tailwind utilities like `md:hidden`.

## How to work
- One feature per branch, tests from the acceptance criteria (requirements section 17) before calling it done.
- Database changes: edit `schema.ts`, `npm run db:generate`, add rules/policies in a custom migration, add a test in `tests/db/`. Show schema changes for review before building pages on them.
- Never commit secrets. Variables go in `.env.local`; list every new one in `.env.example`.
- When unsure about a product decision, ask instead of guessing.

## Gotchas
- Windows 260-character path limit: keep the repo in a short path (for example `C:\dv\devatop-volunteers`); deep folders break git and esbuild.
- Use the Supabase **Session pooler** connection string for `DATABASE_URL` (the direct address needs IPv6).
- Facts marked "(confirm)" in the copy (sender address, review days, minimum age 16, event times, coordinator phone) must be checked by Devatop before launch.
- The prototype has no login: anyone with the Vercel link can open `/admin`. Until auth is wired, share the link only with reviewers.

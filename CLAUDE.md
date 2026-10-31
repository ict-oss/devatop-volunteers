# Devatop Volunteers Platform

Volunteer platform for Devatop Centre for Africa Development, at volunteer.devatop.org.
Three areas: public site, volunteer portal, admin section.
Source of truth for features: `docs/requirements.md` (the original PDF is next to it). If this file and that one disagree, ask.

## Where we are (update this section at the end of every session)

**Built and tested**
- The real system is the only system: there is no prototype mode, no sample data and no `AUTH_ENABLED` flag. Every screen below reads and writes the database as the signed-in person (row-level security applies; scope in the query):
  - Sign-in with email and password: one page with "Sign in" and "Create account" tabs (`/login`, `/signup`), show/hide password, live password tick-list, spinners and an "Opening your account…" state (new accounts go straight to `/apply`); reset by emailed link. A thin progress bar (`NavProgress`) and `loading.tsx` screens show while any page loads. two-factor (authenticator app) for admins, 30-minute admin idle timeout, `/admin/not-allowed`.
  - Application on the database (3-step form, consents with exact wording, under-18 guardian by emailed link), admin review queue (approve / reject / needs info, with the emails), approval puts the volunteer in their departments.
  - Volunteer dashboard, calls and sign-ups with waitlist, hours (remote log, approval), QR check-in/out, certificates (issue, PDF with QR, public verify page), profile, "download my data", delete account, guides with read receipts, chat rooms (database decides access), announcements.
  - Admin: overview, volunteers (suspend, reactivate, alumni), admins (Super Admin adds, changes and removes admins; the database keeps two Super Admins), opportunities, attendance + QR, hours, certificates, departments (add/rename/merge/archive/restore), messages (send to a group, edit the seven emails, WhatsApp link and sender settings, sent log), reports with logged exports, audit log, site images and clips (stored in Supabase Storage).
  - The site's own emails (approval, reminders, thanks, guardian link, group messages) are OFF unless `EMAIL_ENABLED=true` (needs Brevo). With them off: under-18 applicants are given the guardian link to pass on, Admin > Messages posts announcements only, and the reminder cron is not scheduled (`vercel.json` has no `crons`; the route `/api/cron/reminders` stays, protected by `CRON_SECRET`). Sign-in codes are sent by Supabase either way.
- How it is built (read this before changing anything): `src/lib/services/*` hold ALL database logic as plain functions that take a Drizzle `db`/transaction; they are tested against the real migrations in PGlite (`tests/services/`, `tests/db/`). `src/app/actions/*` are thin server actions (check the permission, validate with Zod, run a service as the person via `asCaller`). Pages are server components. Older screens read their data through hooks (`useMe`, `useOpps`, `useSignups`, `useComms`) that return real data from `LiveContext` (`src/lib/live.tsx`, filled by `src/lib/server/live.ts`).
- Rule when writing server code: never `await` a query on the trusted connection (`trusted()`) inside an `asCaller` callback. Finish the person's query first (the local test database has one connection and would deadlock).
- Local end-to-end run with no accounts: `npx tsx tools/e2e/harness.ts` (in-memory Postgres + fake Supabase Auth + fake Brevo), start the app with the printed variables plus `DB_POOL_MAX=1` (the single-connection test database occasionally trips on overlapping requests, so a rare failed step can be a harness hiccup: rerun it), then `node tools/e2e/scenario.cjs` (needs Playwright). The code `123456` is accepted everywhere.
- A Supabase project exists (owner: Devatop). `npm run db:migrate`, `npm run db:check`, then `npm run db:seed` once. Secrets live in `.env.local` (never committed) and in Vercel environment variables.
- Images: stand-in artwork in `public/photos/`, silent clips in `public/video/` (`node tools/standins/make.mjs` regenerates). Admin > Site images replaces a picture or a silent clip (uploaded to the public Supabase Storage bucket `site-images`, recorded in the `site_images` table with who confirmed consent, shown to every visitor via `LiveContext.images`). The bucket is created by the app on first upload. Replace stand-ins with real, consented photos. `HERO_PHOTOS_IN_LETTERS` in `src/lib/images.ts` switches the ACTION letters from solid orange to photos.

**Go-live checklist (see docs/developer/deploy.md)**
1. Supabase (Authentication): Email provider on with **Confirm email OFF** and minimum password length 8, authenticator two-factor (TOTP) on, Site URL and Redirect URLs set to the live address. No SMTP or email template is needed to sign in. "Forgot password" does send a reset email: Supabase's built-in sender allows only a few an hour, so set Brevo as the SMTP before a real launch.
2. `npm run db:migrate && npm run db:seed` on the live database; each of the first two Super Admins creates an account at `/signup`, then run the SQL in `docs/developer/database.md`.
3. Vercel variables: everything in `.env.example` that you need (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` = Session pooler, `CRON_SECRET`; `BREVO_API_KEY` and `EMAIL_ENABLED=true` only when you switch the site's emails on).
4. Redeploy, sign in as a Super Admin, set the WhatsApp link in Admin > Messages > Settings, add the other admins in Admin > Admins, and upload real photos in Admin > Site images.

**Not done yet (in this order)**
1. Phase 2 and later: department-lead "Team Lead" volunteer role screens, join-another-department requests, tags and bulk actions, vetting notes, documents upload, training completion screens, PWA, WhatsApp Business API, email to volunteers when a department changes.
2. Real photos and clips uploaded through Admin > Site images (replace stand-ins), a tested backup restore (record the date in `docs/developer/runbook.md`), and fill in `docs/developer/handover.md` with the real account owners.
3. Facts marked "(confirm)" must be checked by Devatop: the full question list with where to change each answer is `docs/confirm-with-devatop.md`.

## Stack
- Next.js 16 (App Router), TypeScript strict. Note: Next 16 calls middleware "proxy" (`src/proxy.ts`, exported `proxy`).
- Tailwind CSS v4 (tokens in `src/app/globals.css`), custom components (no shadcn yet).
- PostgreSQL on Supabase, Drizzle ORM, migrations in `src/lib/db/migrations`.
- Supabase Auth (email + password, no SMS) + TOTP two-factor for admins. The requirements document said passwordless; Devatop asked for passwords instead.
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
- The site is an installable web app (PWA): `src/app/manifest.ts`, `public/sw.js` (caches only `/offline.html`, never personal pages), logos in `public/brand/`, tab icon `src/app/icon.png` + `favicon.ico`, install icons in `public/icons/` and the certificate mark `src/lib/pdf/brandMark.ts` are all generated from the two supplied logo files by `node tools/make-brand.mjs <devatop file> <talkam file>`.
- Starter calls: Admin > Opportunities > "Publish the starter calls" adds the 12 roles Devatop needs (AI4Rights Community Manager, Content Creator, AI4Rights Facilitator and more, `src/lib/services/starterCalls.ts`). They are real calls, editable like any other.
- Temporary demo data: Admin > Demo data (Super Admin) adds and removes 24 volunteers, calls, hours and announcements, all marked "(Temp)" (`src/lib/db/demo.ts`); also `npm run db:demo` / `db:demo:remove`. Remove before launch.
- No em dashes, en dashes or spaced hyphens in text people read on the site (owner's rule): use a comma, colon or full stop.
- The home page numbers (volunteers, hours, states, map, the Roll) are real and start at zero on a new site. There are no invented testimonials: add real ones only with the volunteer's consent on record.

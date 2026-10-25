# Devatop Volunteers Platform

Volunteer platform for Devatop Centre for Africa Development, at volunteer.devatop.org.
Three areas: public site, volunteer portal, admin section.
Source of truth for features: `docs/requirements.md` (the original PDF is next to it). If this file and that one disagree, ask.

## Where we are (update this section at the end of every session)

**Built and tested**
- A clickable prototype of all three areas on sample data stored in the browser (localStorage): public site, 3-step apply flow with under-18 guardian step, volunteer dashboard, admin (applications, opportunities, attendance + QR check-in, hours, volunteers, departments, reports + Excel/CSV/print exports, messages: the 7 emails + bulk email + WhatsApp links, chat rooms, audit log, role switcher). It is deployed from `main` on Vercel for review.
- The real backend, written and tested but **NOT yet wired into the pages**:
  - `src/lib/db/schema.ts`: Drizzle schema, about 30 tables.
  - `src/lib/db/migrations/`: `0000` schema, `0001` rules and row-level security, `0002` permissions seed (generated from `src/lib/permissions.ts`).
  - `src/lib/auth/`: Supabase clients, email-code sign-in, two-factor (TOTP), server guards (`requireAdmin`), session proxy (`proxy.ts`, switched on by `src/proxy.ts` when `AUTH_ENABLED=true`).
  - `src/lib/db/rls.ts`: `asUser()` runs Drizzle queries under row-level security.
  - `tests/db/`: 50 tests against the real migrations in a local Postgres (PGlite). Run `npm test`.
- A Supabase project exists (owner: Devatop). Migrations run with `npm run db:migrate`; `npm run db:check` verifies. Secrets live in `.env.local` (never committed) and in Vercel environment variables.

- **Auth and roles (step 1) is built and tested, but switched OFF.** `/login` (email code), `/auth/continue`, `/admin/two-factor`, `/admin/not-allowed`, `src/proxy.ts`, a server guard in the admin layout. All routing rules are plain functions in `src/lib/auth/routing.ts` (tested in `tests/auth/`). While `AUTH_ENABLED` is unset the prototype stays open to reviewers. **To go live:** set `AUTH_ENABLED=true` (Vercel + `.env.local`), after the Supabase settings in `docs/developer/database.md` are on and the first two Super Admins exist. Sign-in is email-code only (no SMS provider, by decision). Not done yet: each admin page calling `requireAdmin(its action)` (done as each page moves onto the database, step 5). The admin layout still shows the prototype role switcher.

- **Images and clips:** every image slot (`src/lib/images.ts`) now has stand-in artwork in `public/photos/` (abstract, no people; regenerate with `node tools/standins/make.mjs`, needs Playwright + ffmpeg). Two silent looping clips in `public/video/` (`LoopVideo`: plays only on fast connections, never with reduced motion). Admin > Site images (`/admin/images`, Super Admin) replaces any slot; in the prototype a replacement lives in that browser only (localStorage). **To do at cutover:** save replacements to Supabase Storage (needs a small `site_images` table: show the schema for review first) so every visitor sees them; replace the stand-ins with real, consented photos (log consent in `docs/photo-consent.csv`).
- The home hero word ACTION is now fitted so the whole word (including the final N) always shows, and is capped at half the screen height.

**Next, in this order (requirements section 15)**
1. (done, see above) Auth and roles. Remaining for go-live: Supabase auth settings, first two Super Admins, test the real login by hand, then set `AUTH_ENABLED=true`.
2. Seed file: programmes, departments, settings (`min_age`, `review_days`, `whatsapp_group`), guides.
3. Application flow on the database (consents, guardian link, OTP).
4. Admin review, volunteer dashboard, opportunities and sign-ups, QR check-in, hours, certificates (PDF with QR), real emails (Brevo/Resend), reminder cron.
5. Replace `src/lib/store.ts` (localStorage) page by page; delete it when nothing imports it.
6. Remaining: guides editor, "download my data", photos in Supabase Storage, PWA, backups with a tested restore, developer docs (README, architecture, deploy, runbook, handover).

## Stack
- Next.js 16 (App Router), TypeScript strict. Note: Next 16 calls middleware "proxy" (`src/proxy.ts`, exported `proxy`).
- Tailwind CSS v4 (tokens in `src/app/globals.css`), custom components (no shadcn yet).
- PostgreSQL on Supabase, Drizzle ORM, migrations in `src/lib/db/migrations`.
- Supabase Auth (email one-time code; no SMS) + TOTP two-factor for admins.
- Zod for validation (to be shared by forms and server), Brevo or Resend for email, `qrcode` for QR, `fflate` for `.xlsx` export.
- GSAP (ScrollTrigger, DrawSVG) + Lenis: public site only. Vitest for tests.

## Commands
- `npm run dev`: run locally (http://localhost:3000)
- `npm test`: database tests (no accounts needed)
- `npm run lint`: type-check (`tsc --noEmit`)
- `npm run db:migrate`: apply migrations to the database in `.env.local`
- `npm run db:check`: verify the connection and that the schema is installed
- `npm run db:generate`: create a migration from schema changes; `npm run db:permissions` regenerates the permissions seed
- `npm run photos`: compress photos from `raw-photos/` into `public/photos/`

## Structure
- `src/app/(public)`: home, opportunities, about, faqs, contact, privacy, apply, verify, guardian-consent, image-slots (prototype helper, remove before launch)
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

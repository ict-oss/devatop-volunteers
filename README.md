# Devatop Volunteers Platform

Volunteer platform for Devatop Centre for Africa Development (volunteer.devatop.org): a public site, a volunteer portal and an admin section in one Next.js app. Source of truth for features: the *Devatop Volunteers Platform: Feature Requirements* document.

> **Status:** the real system: sign-in with email and password, two-factor for admins, applications, review, calls, hours, QR check-in, certificates, messages and an Admin section, all on the database. There is no sample data and no prototype mode; the site needs its Supabase settings (see `docs/developer/deploy.md`).

## Run it locally (about 5 minutes)

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # database rules, services and sign-in rules (local Postgres, no accounts needed)
npm run lint         # type-check
```

The site needs the variables in `.env.example` (a Supabase project). For a run with no accounts at all, see the local end-to-end run in `CLAUDE.md`.

## Put it online (for review)

Set the variables in `docs/developer/deploy.md` in Vercel before the first deploy.

1. Create a GitHub **organisation or account owned by an official Devatop email** (never a staff member's personal account) and push this folder to a new repository.
2. Create a Vercel account with the same Devatop email, choose **Add New > Project**, import the repository and press **Deploy**. Framework (Next.js) and build settings are detected automatically.
3. Every push to `main` redeploys. Use the generated `*.vercel.app` address to review; point `volunteer.devatop.org` at it later.

To go live, follow the checklist in `CLAUDE.md` and `docs/developer/deploy.md`.

## Images

Photos are named slots. Put colour originals in `raw-photos/` named after the slot (see Admin > Site images), run `npm run photos`, and they appear. Adults only, never an identifiable child or survivor; every person photographed needs a consent record.

## Where things are

| Path | What |
| --- | --- |
| `src/app/(public)` `(volunteer)` `(admin)/admin` | the three areas |
| `src/lib/permissions.ts` | the permissions matrix (also seeds the database) |
| `src/lib/db/schema.ts` | Drizzle schema (about 30 tables) |
| `src/lib/db/migrations/` | SQL: schema, rules and row-level security, permissions seed |
| `src/lib/auth/` | Supabase sign-in, two-factor, session guards, session proxy |
| `tests/db/` | database tests: every rule, run against the real migrations |
| `src/lib/services/` | all database logic (tested against the real migrations) |
| `src/app/actions/` | server actions: permission check, validation, then a service |
| `docs/developer/` | architecture, deploy, runbook, handover, database |
| `tools/` | map and photo scripts, permissions generator, seed, local end-to-end harness (`tools/e2e`) |

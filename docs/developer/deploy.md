# Deploying

One Next.js app on **Vercel**, one database on **Supabase**, email through **Brevo**. All accounts belong to an official Devatop email, never a person's own.

## Every change

1. Work on a branch; open a pull request into `main`. The `Checks` workflow runs `npm run lint` and `npm test`; both must be green.
2. Vercel builds a **preview** for the branch. Open it and try the change on a phone.
3. Merge. Vercel deploys `main` to production.

## Environment variables (Vercel > Project > Settings > Environment Variables)

Copy every line of `.env.example`. The ones people forget:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Supabase **Session pooler** string (the direct address needs IPv6) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public; baked in at build time, so **redeploy** after changing them |
| `SUPABASE_SERVICE_ROLE_KEY` | secret; used only to delete a person's sign-in when they delete their account |
| `NEXT_PUBLIC_SITE_URL` | the live address; used in email links and QR codes |
| `BREVO_API_KEY` | without it no email is sent (the sent log shows "skipped") |
| `CRON_SECRET` | 16+ random characters; Vercel Cron sends it so only Vercel can run the daily reminders |
| `AUTH_ENABLED` | `true` turns the real system on. Unset or `false` shows the clickable prototype |

## Database

`npm run db:migrate` applies the SQL in `src/lib/db/migrations` (needs `DATABASE_URL` in `.env.local`). `npm run db:check` confirms 34 tables, row-level security on all of them and 83 permission rows. `npm run db:seed` fills a new database once. Never edit the live database by hand except the first-Super-Admin SQL in `database.md`.

## Turning the real system on (first time)

See the go-live checklist in `CLAUDE.md`. In short: Supabase auth settings, migrate, seed, first two Super Admins, Vercel variables, then `AUTH_ENABLED=true` and redeploy.

## Rolling back

Vercel > Deployments > pick the last good one > Promote to Production. Setting `AUTH_ENABLED` back to `false` returns to the prototype without touching data.

## The daily reminder job

`vercel.json` schedules `/api/cron/reminders` at 15:00 UTC (16:00 Lagos). Vercel's Hobby plan allows one run a day. To test by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/reminders` returns counts only.

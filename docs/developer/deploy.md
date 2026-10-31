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

## Database

`npm run db:migrate` applies the SQL in `src/lib/db/migrations` (needs `DATABASE_URL` in `.env.local`). `npm run db:check` confirms 34 tables, row-level security on all of them and 83 permission rows. `npm run db:seed` fills a new database once. Never edit the live database by hand except the first-Super-Admin SQL in `database.md`.

## Turning the real system on (first time)

See the go-live checklist in `CLAUDE.md`. In short: Supabase auth settings, migrate, seed, first two Super Admins, Vercel variables, redeploy.

## Rolling back

Vercel > Deployments > pick the last good one > Promote to Production.

## The daily reminder job

`vercel.json` schedules `/api/cron/reminders` at 15:00 UTC (16:00 Lagos). Vercel's Hobby plan allows one run a day. To test by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/reminders` returns counts only.


## Pictures and clips (Admin > Site images)

Uploads go to a public Supabase Storage bucket called `site-images`. You do not create it: the app creates it the first time a Super Admin uploads (it uses `SUPABASE_SERVICE_ROLE_KEY`, so that variable must be set). The bucket accepts WebP and JPEG pictures and MP4 or WebM clips up to 5 MB. Nobody can write to it from a browser with their own login; the server first checks the admin's permission, then gives a one-time upload link for one exact file name. Each replacement is a row in `site_images` (slot, file, who confirmed consent and when) and is in the audit log. "Back to original" deletes the row and the file.


## The site's own emails are off by default

`EMAIL_ENABLED` is unset, so the site sends no emails of its own: no "application received", approval, reminder, thank-you or guardian email, and no bulk email. Sign-in codes still arrive, because Supabase sends them (its built-in sender is fine for testing but limited to a few emails an hour, so set Brevo as Supabase's SMTP before a real launch).

What people see instead:
- **Under-18 applicants** get a one-time link on the application page to pass to their parent or guardian themselves (WhatsApp or text). The link works once and expires after 7 days. Because the applicant holds the link, this is weaker proof than an email to the guardian's own address; switch email on before launch if Devatop needs the stronger check.
- **Admins** can post an announcement on Admin > Messages; volunteers see it on their dashboard. Group email, the seven templates and the sent log appear only when email is on.
- **Reminders** are not sent. The daily job is not scheduled (`vercel.json` has no `crons`).

To switch email on later: verify the sender in Brevo, set `BREVO_API_KEY` and `EMAIL_FROM`, set `EMAIL_ENABLED=true`, put this back in `vercel.json` and redeploy:

```json
{ "crons": [{ "path": "/api/cron/reminders", "schedule": "0 15 * * *" }] }
```

## Temporary demo data (preview only)

A Super Admin can fill the site with made-up data from **Admin > Demo data** (button "Add demo data"), and delete all of it again with "Remove all demo data". No terminal is needed. (`npm run db:demo` and `npm run db:demo:remove` do the same from a computer.)

It adds 24 demo volunteers across 24 states with approved hours (so the home page numbers and the map fill in), some pending hours, 6 demo calls with sign-ups, and 2 announcements. Every demo item is marked: "(Temp)" after the volunteer's first name, in the title of each call and announcement and in the hours' activity text, and demo volunteers have an email ending `@demo.devatop.invalid`. Adding twice is safe. Removing deletes exactly those items and nothing real.

The demo hours count in the public figures, so **remove the demo data before you tell anyone the numbers are real.** Run `npm run db:seed` first so the departments and programmes exist. Approved hours need a deciding admin, which is why you must be signed in as a Super Admin.

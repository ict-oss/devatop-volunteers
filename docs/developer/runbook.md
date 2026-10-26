# Runbook

What to do when something goes wrong. Keep this next to the handover document.

## The site is down or very slow
1. Vercel dashboard > Deployments: is the latest deployment "Ready"? If not, open its log. If the latest one broke things, **Promote** the previous good deployment.
2. Supabase dashboard > Project health. If the database is paused or over its limits, fix that first.
3. Still stuck: Promote the last good deployment (Vercel > Deployments), and tell the developer which page and what you saw (never include names or emails in the message).

## Nobody receives emails
Admin > Messages > **Sent log**. "skipped" means no `BREVO_API_KEY` is set. "failed" means Brevo refused: check the key, that the sender address is verified in Brevo, and Brevo's daily limit. Volunteers can still sign in only if Supabase's own email works: Supabase > Authentication > SMTP Settings must point at Brevo or Resend.

## An admin is locked out (lost phone, lost authenticator)
Another Super Admin cannot reset two-factor from the app. In Supabase > Authentication > Users, open the person and delete their authenticator factor; on their next sign-in they set up a new one. Never share one login between people.

## Making someone an admin or removing them
Run in the Supabase SQL editor (the database refuses to leave fewer than two Super Admins):
```sql
insert into public.admin_roles (user_id, role) select id, 'volunteer_coordinator' from auth.users where email = 'person@devatop.org';
-- roles: super_admin, programme_manager, volunteer_coordinator, state_lead (needs state), department_lead (needs department_id), viewer
delete from public.admin_roles where user_id = (select id from auth.users where email = 'person@devatop.org');
```

## A volunteer wants their data deleted and cannot sign in
Ask them to sign in once more and use Profile > Delete my account. If they truly cannot, a Super Admin runs in the SQL editor `select public.delete_my_account()` is not available to staff by design; instead delete the user in Supabase > Authentication > Users, then run the cleanup the privacy policy promises (hours stay as anonymous totals; certificates are revoked).

## Backups and restore
Supabase Pro takes daily backups. Also keep a copy elsewhere: weekly `pg_dump "$DATABASE_URL" > devatop-$(date +%F).sql`, stored away from Supabase and Vercel. **Test the restore** at least once before launch: create a scratch Supabase project, `psql` the dump into it, run `npm run db:check` against it, and sign in. Record the date you tested here.

## Rotating keys
- Supabase service role key: Supabase > Settings > API > reset, then update `SUPABASE_SERVICE_ROLE_KEY` in Vercel and redeploy.
- Brevo key: create a new one, update `BREVO_API_KEY`, delete the old.
- `CRON_SECRET`: change in Vercel and redeploy (Vercel Cron picks up the new value).

## Reminders did not go out
Vercel > Project > Cron Jobs shows the last run. Test by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/reminders` (returns counts only). Reminders go to confirmed sign-ups for tomorrow (Lagos time), once each.

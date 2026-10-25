# Database

PostgreSQL on Supabase, Drizzle ORM. Schema: `src/lib/db/schema.ts`. SQL: `src/lib/db/migrations/`. Tests: `tests/db/` (they run the real migrations in a local Postgres, so no account is needed: `npm test`).

## Three ideas to hold on to

1. **Identity is Supabase's `auth.users`.** `public.users` has the same id and holds the app role (volunteer or admin). Admin powers live in `admin_roles`.
2. **Personal data is split by who may see it.** Row-level security works on rows, not columns, so the permissions matrix became separate tables: `volunteer_profiles` (names, state, skills), `volunteer_contacts` (phone, email), `volunteer_private` (date of birth). A Viewer sees names only; a State Lead sees phones but not dates of birth.
3. **The important rules live in the database**, not only in code. Even the service role cannot break the hard rules.

## The rules the database enforces (each has a test)

| Rule | Where |
| --- | --- |
| An under-18 cannot submit or be approved without a verified guardian consent | triggers on `applications` |
| Only an admin can approve hours; admins cannot decide their own; only approved hours count | trigger on `hour_logs`, views and reports filter `status = 'approved'` |
| Consent records are append-only; a withdrawal is a new row | trigger on `consents` |
| A certificate cannot be issued for hours that are not approved, and never edited afterwards | trigger on `certificates` |
| Never fewer than two Super Admins | trigger on `admin_roles` |
| A department with history cannot be deleted; archive or merge | trigger on `departments`, `merge_departments()` |
| Sign-ups respect capacity, deadline and active status; cancelling promotes the waitlist | triggers on `signups` |
| Hours from QR check-in are recorded automatically but stay pending | `check_in()`, `check_out()` |
| Audit log is append-only and holds ids, never personal data | triggers + `audit_logs` |
| No phone numbers or emails in group chat rooms | trigger on `chat_messages` |
| Admins only count as admins with two-factor (assurance level aal2) | `is_aal2()` |

## Who can see what

`src/lib/permissions.ts` holds the matrix. `npm run db:permissions` writes it into migration `0002`, and a test fails if the two ever differ. Scope (own state, own department, own programme) is applied inside the query by `in_scope()` and `opp_in_scope()`.

## Working with it

- **Change the schema:** edit `schema.ts`, run `npm run db:generate`, then add policies and rules in a custom migration (`npx drizzle-kit generate --custom --name=...`). Add a test in `tests/db/`.
- **Query as a person:** `asUser(db(), { sub, aal }, (tx) => ...)` from `src/lib/db/rls.ts` runs the query under row-level security. The plain `db()` connection is the database owner and **bypasses** it: use it only for trusted server jobs.
- **Apply to Supabase:** put the Session pooler connection string in `.env.local` as `DATABASE_URL`, then `npm run db:migrate` and `npm run db:check`.
- **First Super Admins:** both people sign in once with an email code, then run in Supabase's SQL editor:

```sql
insert into public.admin_roles (user_id, role)
select id, 'super_admin' from auth.users where email in ('first@devatop.org', 'second@devatop.org');
```

## Supabase settings that must be switched on

Authentication: email one-time code (set the email template to show the code), TOTP multi-factor, Site URL and redirect URLs set to the live address, a custom SMTP sender (Brevo or Resend). SMS needs a phone provider.
Backups: daily backups on a paid plan, plus a copy stored away from the main server, and a restore tested once before launch.

## Known limits

- Hosting is outside Nigeria (the privacy policy must say so).
- The prototype pages still use `src/lib/store.ts` (browser storage) until they are moved onto this database one feature at a time.
- Guardian links expire after 7 days in the database; the prototype does not enforce it.

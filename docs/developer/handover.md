# Handover

The last volunteers site was lost because access was lost. This file is the antidote: fill it in, keep it in the repository, and update it whenever an account changes hands. **Passwords are never written here**; they live in Devatop's shared password manager.

| What | Account owner (official Devatop email) | Where the login is kept | Notes |
| --- | --- | --- | --- |
| Domain (devatop.org, volunteer.devatop.org) | | | DNS records point volunteer.devatop.org at Vercel |
| GitHub organisation and this repository | | | at least two owners |
| Vercel (hosting) | | | Pro plan; project `devatop-volunteers`; production branch `main` |
| Supabase (database, sign-in) | | | project name and region; billing plan; daily backups on |
| Brevo (email) | | | sender `volunteers@devatop.org` verified |
| Password manager | | | who can open it |
| Monitoring / error alerts | | | (Sentry, if added) |

## Two Super Admins, always
The database refuses to leave fewer than two. Current Super Admins: ______ and ______.

## Handing over to the next developer
1. Add them as an owner of the GitHub organisation, Vercel and Supabase using their official Devatop email.
2. Walk them through `README.md`, `docs/developer/architecture.md`, `deploy.md`, `runbook.md`.
3. Have them run the app locally, run `npm test` and deploy a trivial change to a preview.
4. Rotate any keys the outgoing developer saw (see the runbook).
5. Remove the outgoing developer's access everywhere and note the date here.

## Decisions still waiting for Devatop (marked "(confirm)" in the code)
Sender address, how many days a review takes, minimum age (16), the department list, safeguarding training renewal period, event times and coordinator contact in reminders, WhatsApp group link, the real photos and their consent records (`docs/photo-consent.csv`).

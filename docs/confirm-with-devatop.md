# Facts Devatop must confirm before launch

Everything below is a guess made while building. Each needs a yes or a correction from Devatop. When you have the answers, the last column says where to change it (most are editable by a Super Admin with no developer).

| # | Question for Devatop | What the site says now | Where to change it |
|---|---|---|---|
| 1 | Which email address do volunteers see messages from, and is it verified with Brevo? (Only matters once the site's emails are switched on.) | `volunteers@devatop.org`, sender name "Devatop Volunteers" | Admin > Messages > Settings, and `EMAIL_FROM` in Vercel |
| 2 | How many days do you promise to reply to an application? | 7 days | Admin > Messages > Settings ("Review time"); FAQ text in `src/lib/data.ts` (`REVIEW_DAYS`) |
| 3 | Lowest age you accept. Under 18 needs a parent or guardian. | 16 | `min_age` setting; FAQ text in `src/lib/data.ts` (`MIN_AGE`); the rule is also checked in the database |
| 4 | The list of departments volunteers can join. Add, rename or remove any. | Communications and Media, ICT, Programmes and Field Outreach, Policy and Research, Talkam, AI4Rights, Events and Logistics, Partnerships and Fundraising, Finance, Monitoring and Evaluation | Admin > Departments (no developer needed) |
| 5 | Usual start time and place for events, shown in reminders and on calls. | "9:00 am" in the sample reminder; each call has its own time | Each call in Admin > Opportunities; email wording in Admin > Messages |
| 6 | Coordinator name and phone number volunteers can call on the day of an event. | Placeholder `0800 000 0000` in the reminder sample | Admin > Messages > the reminder email; and the Contact page |
| 7 | How often must volunteers renew safeguarding training? | Every 365 days (Orientation never expires) | Seeded in the training list; ask a developer to change it, or tell us the answer |
| 8 | Public email and social media links on the Contact page. | `volunteers@devatop.org`; "Instagram · X · LinkedIn · Talkam (links to confirm)" | `src/app/(public)/contact/page.tsx` |
| 9 | Is transport support available for field activities? | FAQ says "may be available (confirm)" | FAQ text in `src/lib/data.ts` |
| 10 | The WhatsApp group link volunteers are invited to. | Placeholder link | Admin > Messages > Settings |
| 11 | Talkam link used in emails. | `https://devatop.org` | Admin > Messages > Settings |
| 12 | Under-18 guardian consent: is a link passed on by the applicant acceptable, or must it be emailed to the guardian's own address? | Applicant passes the link on (email is off) | Switch on email (see `docs/developer/deploy.md`) for the stronger check |
| 13 | Real, consented photos and short clips (adults only, no identifiable children or survivors). | Stand-in artwork | Admin > Site images |
| 14 | Logos: are the two logo files supplied the approved versions? A transparent-background original (SVG or high-resolution PNG) would look sharper than the JPEGs we received. | Devatop logo in the header, footer, browser tab, phone install icon and certificates; Talkam logo in the footer | `node tools/make-brand.mjs <devatop file> <talkam file>` rebuilds every logo and icon |

---
title: "Devatop Volunteers Platform"
subtitle: "Feature Register, Status Report and Terms of Reference"
author: "Prepared for Devatop Centre for African Development"
date: "31 October 2026"
---

# Contents

1. About this document
2. Summary
3. The platform
4. Who can do what (admin roles)
5. Feature register (public website, registration, volunteer portal, admin, communication, reports, data protection, technical, departments, guides, quality, not-yet-built list)
6. Key journeys (as built)
7. Safeguarding and security rules built in
8. Data held (summary)
9. What Devatop needs to do (go-live checklist, tools, questions)
10. Known issues and risks
11. Terms of Reference (background, objectives, scope, roles, deliverables, work plan, method, acceptance, assumptions, change control, reporting)

Appendices: A pages and addresses, B settings, C documents, D glossary

\newpage

# 1. About this document

## 1.1 Purpose

This document is the single reference for the Devatop Volunteers Platform (volunteer.devatop.org). It does three jobs:

1. It describes **what the platform is** and who uses it.
2. It lists **every feature**, saying clearly which ones are **done**, which are **done but need a setup step from Devatop**, and which are **not done yet**.
3. It sets out the **Terms of Reference (ToR)** for the remaining work: the scope, the specific deliverables, how each one is accepted, who does what, and what could go wrong.

## 1.2 Who should read it

| Reader | What to read first |
|---|---|
| Devatop leadership and funders | Section 2 (summary), Section 9 (what you must do), Section 11 (Terms of Reference) |
| Programme and department leads | Section 5 (feature register), Section 6 (roles) |
| Developers and technical partners | Section 3 (platform), Section 7 (security), Section 8 (data), Appendix A and B |
| Safeguarding and data protection officers | Section 7 |

## 1.3 Sources and how up to date it is

This document is written from the original *Devatop Volunteers Platform: Feature Requirements* (38 pages, kept in `docs/`) and from the code, tests and settings as they stand on 31 October 2026. Where the original requirements and the finished platform differ, the difference is noted in Section 10.

## 1.4 Status words used throughout

| Status | Meaning |
|---|---|
| **Done** | Built, tested, and working in the platform. |
| **Done, needs setup** | Built and tested, but it only works live after Devatop (or the technical owner) does a setup step, for example connecting an email service. |
| **Partly done** | Some of the feature exists; what is missing is said in the notes. |
| **Not done** | Not built yet. Phase tags (MVP, Phase 2, Phase 3) come from the original requirements. |

\newpage

# 2. Summary

## 2.1 In one paragraph

The platform has three areas: a **public website** that convinces people to volunteer, a **volunteer portal** where approved volunteers manage their activity, and an **admin section** where Devatop staff run the programme. Almost all the MVP (Phase 1) features are built and tested, together with several Phase 2 items, and a short list of MVP items is still open (Section 5.12, items 1 to 7). What stands between the platform and a full public launch is mostly **setup and content** (real photos, the answers to the confirmation questions, email service, backups), plus a small number of **Phase 2 and Phase 3 features** that are not built yet.

## 2.2 Numbers at a glance

| Measure | Result |
|---|---|
| Automated checks (database rules, services, sign-in rules) | 259 passing |
| Full browser walk-through (sign-up to certificate, 59 steps) against a local copy | Passing (the local test database occasionally fails one overlapping step; a rerun passes) |
| MVP features in the original requirements | Almost all built; seven small to medium items still open (Section 5.12, items 1 to 7) |
| Phase 2 features built early | Onboarding checklist, shift capacity and waitlist, audit log, download my data, installable web app, in-app chat, department management |
| Phase 2 and Phase 3 features not yet built | See Section 5.12 |
| Items Devatop must supply or decide before launch | 14 questions (Section 9.3) plus photos and accounts |

## 2.3 What is blocking a confident public launch

1. **The contact form does not send messages yet.** It shows "Message sent" but delivers nothing. This must be fixed before launch (Section 10.2).
2. **Real, consented photos and clips** are still stand-in artwork.
3. **Facts to confirm** (sender email, review days, minimum age, coordinator phone and others).
4. **Email service** (Brevo) is switched off. The platform works without it, but approval emails, reminders and bulk email are off until it is connected.
5. **Backups and a tested restore** are not yet in place.
6. **Temporary demo data** may still be in the live database. It is marked "(Temp)" and is removed in one click (Admin, Demo data). It must be removed before real numbers are quoted.

\newpage

# 3. The platform

## 3.1 The three areas

| Area | Who uses it | What it is for |
|---|---|---|
| **Public website** | Anyone | Explains Devatop, shows impact numbers and open calls, takes applications, lets anyone check a certificate |
| **Volunteer portal** | Applicants and approved volunteers (signed in) | Application status, calls and sign-ups, hours, certificates, guides, chat, profile |
| **Admin section** | Devatop staff (signed in with two-factor) | Review applications, run calls, take attendance, approve hours, issue certificates, message people, report, manage departments and admins |

## 3.2 How people get in

* Anyone can browse the public pages.
* A person creates an **account** with an **email address (their username) and a password**, either on the sign-in page or in the first step of the application.
* **Admins** also confirm a code from an authenticator app (two-factor). Admin sessions end after 30 minutes without activity.
* A **Sign out** button is in every signed-in area.

## 3.3 Technology

| Part | Choice | Why |
|---|---|---|
| Website and server | Next.js 16 (React), TypeScript | One codebase for all three areas, fast on phones |
| Hosting | Vercel | Automatic deployment on every merge |
| Database and sign-in | Supabase (PostgreSQL) | Secure, row-level security, backups available |
| Database code | Drizzle ORM and plain SQL migrations | Rules are kept in the database, not only in code |
| Email | Brevo or Resend (not connected yet) | Official messages |
| Files | Supabase Storage (public bucket for site pictures and clips) | Admins replace pictures without a developer |
| Testing | Vitest (259 checks) and a Playwright browser walk-through | Every feature is checked before it is merged |

## 3.4 Look and feel

The design follows "Known by Action": Big Shoulders headlines, one Fraunces italic accent word, Atkinson Hyperlegible body text, and the colours Talkam Orange, Ink and Newsprint. Mobile first, light on data (clips are about 70 KB), motion only on the public site, and respect for "reduced motion" settings. Text on the site avoids em dashes and en dashes (the owner's rule).

## 3.5 Ownership and handover

The original requirements insist that the domain, hosting, repository and database belong to an **official Devatop email**, never a staff member's personal account, and that there are **at least two Super Admins**. The database enforces the second point: it refuses any change that would leave fewer than two Super Admins once two exist. The handover document (`docs/developer/handover.md`) is drafted and still needs the real account owners filled in.

\newpage

# 4. Who can do what (admin roles)

| Role | Purpose | Scope |
|------------------|----------------------------------------------------|--------------------|
| **Super Admin** | Everything, including admins, settings, site pictures, demo data | Whole platform |
| **Programme Manager** | Runs one programme: volunteers, calls, hours, certificates, reports, guides, departments | Their programme |
| **Volunteer Coordinator** | Reviews applications, schedules, takes attendance, approves hours, sends messages | Whole platform |
| **State or Chapter Lead** | Manages volunteers and calls in one state | Their state only |
| **Department Lead** | Manages volunteers, calls, attendance, hours and guides for one department | Their department only |
| **Viewer** | Read-only dashboards and lists | Whole platform |

All rules live in one file (`src/lib/permissions.ts`) and are also written into the database as row-level security, so hiding a button is never the only protection. Phone numbers, emails and dates of birth are shown only to roles that need them.

Detailed permission list (what each role may do):

| Action | Super | Programme | Coordinator | State | Department | Viewer |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| See the admin overview | Yes | Yes | Yes | Yes | Yes | Yes |
| List volunteers | Yes | Yes | Yes | Yes | Yes | Yes |
| See phone and email | Yes | Yes | Yes | Yes | Yes | No |
| See date of birth | Yes | Yes | Yes | No | No | No |
| Approve or reject applications | Yes | Yes | Yes | Yes | Yes | No |
| Approve under-18 applicants | Yes | No | Yes | No | No | No |
| Suspend, reactivate, mark alumni | Yes | Yes | No | No | No | No |
| Create and edit calls | Yes | Yes | Yes | Yes | Yes | No |
| Take attendance | Yes | Yes | Yes | Yes | Yes | No |
| Approve hours | Yes | Yes | Yes | Yes | Yes | No |
| Issue certificates | Yes | Yes | Yes | No | No | No |
| Send bulk email or announcements | Yes | Yes | Yes | Yes | Yes | No |
| See reports | Yes | Yes | Yes | Yes | Yes | Yes |
| Export reports | Yes | Yes | Yes | Yes | Yes | No |
| Export personal data | Yes | No | No | No | No | No |
| Manage departments (add, merge, archive) | Yes | Yes | No | No | No | No |
| Assign people to departments | Yes | No | Yes | Yes | Yes | No |
| Write guides | Yes | Yes | Yes | No | Yes | No |
| See the audit log | Yes | Yes | No | No | No | No |
| Manage admins | Yes | No | No | No | No | No |
| Edit settings, pictures, demo data | Yes | No | No | No | No | No |
| Manage trainings | Yes | Yes | Yes | No | No | No |

\newpage

# 5. Feature register

Each table gives the feature, what it does, its status, and notes. "Phase" is the phase given in the original requirements.

## 5.1 Public website

| Feature | What it does | Phase | Status | Notes |
|----------------|--------------------------------------|------|----------|--------------------------|
| Home page | Hero headline, "Become a volunteer" button, short animated clip, impact numbers, map, open calls, how it works, departments, the Roll, final call to action | MVP | **Done** | Numbers and map read the real database |
| Impact numbers | Total hours, volunteers and states reached | MVP | **Done** | Only approved hours count. Start at zero on a new site |
| Map of Nigeria with hours by state | Orange states where volunteers have worked, top five list, point at a state for hours | MVP | **Done** | Totals only, no names |
| The Roll | Names ("Amaka O.") of volunteers who opted in | MVP | **Done** | Hidden until at least one volunteer opts in |
| Opportunities board | Open calls with place, remote or physical, commitment, skills, deadline; filter by state, programme, skill, remote or physical; sign up | MVP | **Done** | Calls come from the database |
| Starter calls | One click publishes 12 roles Devatop needs (AI4Rights Community Manager, Content Creator, AI4Rights Facilitator and nine more) | Extra | **Done** | Real, editable calls |
| FAQs | Plain answers on who can volunteer, minimum age, pay, approval time, data, children and survivors | MVP | **Done** | Age and review days come from settings. Wording needs Devatop to confirm |
| About page | Who Devatop is, how volunteering works, departments, safe by design | MVP | **Done** | Departments come from the database. Story copy needs Devatop to confirm |
| Contact page | Email, socials, enquiry form | MVP | **Partly done** | The form is shown but does not deliver messages yet (Section 10.2) |
| Privacy policy and cookie banner | Privacy page, "Essential only" or "Allow analytics" choice | MVP | **Done** | Choice is remembered on the device |
| Certificate check page | Type a code or scan the QR; shows name, hours and dates only | MVP | **Done** | Shows nothing else about the person |
| Installable web app (PWA) | "Add to home screen", friendly offline page, app icons from the Devatop logo | Phase 2 | **Done** | Caches only the offline page, never personal pages |
| Logos and tab icon | Devatop and Talkam logos in header and footer, browser tab icon | Extra | **Done** | Rebuilt from supplied JPEGs. A higher quality original would look sharper |
| Animated clips | Silent looping clips on the home and About pages that always play (except for people who asked for reduced motion) | Extra | **Done** | 72 KB home clip made in code, no people |
| Picture slots | Named places for photos, replaced by admins | Extra | **Done** | Real photos still to be uploaded |
| Programme pages | What each programme does and how volunteers fit in | Phase 2 | **Not done** | |
| Events calendar | Upcoming outreaches and trainings in a calendar view | Phase 2 | **Not done** | The calls board covers the need in the meantime |
| Stories and gallery | Volunteer testimonials and photos | Phase 3 | **Not done** | Deliberately left out until real, consented stories exist |
| Volunteer of the Month | Spotlight on the public site | Phase 3 | **Not done** | |

## 5.2 Registration and onboarding

| Feature | What it does | Phase | Status | Notes |
|----------------|--------------------------------------|------|----------|--------------------------|
| Create account | Email and password, live password checklist, show or hide password | MVP | **Done** | Replaces the emailed one-time code in the original requirements (Devatop's decision) |
| Sign in and sign out | Email and password, clear loading states, sign out button everywhere | MVP | **Done** | |
| Forgot password | Emailed reset link | MVP | **Done, needs setup** | Needs Supabase email limits raised (Brevo SMTP) for real use |
| Application form | Three steps: about you, skills and availability, consents. Name, phone, email, state, LGA, date of birth, occupation, skills, departments, availability, languages, how you heard, NYSC code | MVP | **Done** | Saved in the browser while typing, wiped once sent |
| Consent records | Code of conduct, safeguarding agreement, privacy and data use, optional media consent; each stored with the exact wording, version and time | MVP | **Done** | Append-only in the database |
| Under-18 applicants | Date of birth check, minimum age, parent or guardian consent link, cannot be approved without verified consent | MVP | **Done** | With email off, the applicant passes the link on by WhatsApp or copy. Stronger proof needs email on |
| Application status tracking | Submitted, Under review, Interview, Needs info, Approved, Rejected, shown on the dashboard | MVP | **Done** | An email at each stage is built (Section 5.5) |
| "Needs more information" reply | Applicant answers an admin's question | MVP | **Done** | |
| Onboarding checklist | "Start here" ticks itself off (orientation, safeguarding training, WhatsApp group, guides, first sign-up) | Phase 2 | **Done** | Built early |
| Custom application fields | Admins add their own questions | MVP | **Not done** | |
| Document upload | ID, CV, NYSC call-up or school letter | Phase 2 | **Not done** | |
| References | Referee details for roles with children or survivors | Phase 2 | **Not done** | |
| Digital signature of the safeguarding agreement | Signed before approval | MVP | **Partly done** | Agreement is accepted with a timestamped consent record, not a drawn or typed signature |

## 5.3 Volunteer portal

| Feature | What it does | Phase | Status | Notes |
|----------------|--------------------------------------|------|----------|--------------------------|
| Dashboard | Status, next step, hours, milestones, announcements, sign-ups, certificate prompt | MVP | **Done** | |
| Profile | Edit phone, state, availability, skills; see consents | MVP | **Partly done** | Photo upload is not built |
| Calls and sign-ups | Browse, sign up, waitlist when full, cancel | MVP | **Done** | Capacity and waitlist were Phase 2, built early |
| My hours | Approved and pending totals, per activity, log remote hours for approval | MVP | **Done** | Only approved hours count |
| QR check-in and check-out | Scan the event QR code, hours recorded as pending until approved | MVP | **Done** | Works in a time window around the event |
| Certificates | Issue from approved hours, PDF with QR and unique code, public check page | MVP | **Done** | |
| Hours statement and recommendation letter | Download an hours statement, request a letter | MVP | **Not done** | Certificate exists, statement and letter do not |
| Guides | Must-read and optional guides with read receipts | MVP | **Done** | |
| In-app chat | Rooms by department and for everyone, a private support room, report and remove | Extra | **Done** | Database decides who sees what |
| Announcements board | Posts from admins | MVP | **Done** | |
| Download my data | One file with everything held about the person | Phase 2 | **Done** | Built early |
| Delete my account | Withdraws consent and deletes personal data | MVP | **Done** | Consent records stay as anonymous proof |
| WhatsApp group link | Shown after approval and on the dashboard | MVP | **Done, needs setup** | Admin pastes the real link in Messages, Settings |
| Milestones and badges | First action, 10, 50, 100 hours | Phase 3 | **Partly done** | Milestones shown; badges and ID card not built |
| Digital volunteer ID | ID card with QR for events | Phase 2 | **Not done** | |
| Resources library | Handbooks, slides, recorded trainings, brand guidelines | Phase 2 | **Not done** | Guides cover part of this |
| Notifications inbox | Announcements, reminders and approvals in one place | Phase 2 | **Partly done** | Announcements exist; no inbox |
| Post-activity feedback | Short form after each activity | Phase 2 | **Not done** | |
| Team Lead role screens | A volunteer who leads a team: see members, post announcements, take attendance | Phase 2 | **Not done** | |
| Ask to join another department | Request from the profile, Department Lead accepts | Phase 2 | **Not done** | |

## 5.4 Admin section

| Feature | What it does | Phase | Status | Notes |
|----------------|--------------------------------------|------|----------|--------------------------|
| Overview ("Today") | What needs you: pending applications and hours, events this week, totals | MVP | **Done** | Inside each admin's scope |
| Application review queue | Search, filter by state and department, approve, reject, ask for more information, bulk approve | MVP | **Done** | Under-18 rule enforced in the database |
| Volunteer database | List with state, departments, approved hours, status | MVP | **Done** | Contact details only for roles allowed |
| Volunteer status | Applicant, Active, Inactive, Suspended, Alumni; suspend, reactivate, mark alumni | MVP | **Done** | Suspending cancels upcoming sign-ups |
| Tags and groups | Label volunteers (for example "Abuja team") | Phase 2 | **Not done** | |
| Bulk actions beyond approving | Message, tag or export many volunteers at once | Phase 2 | **Partly done** | Bulk approve and group messages exist |
| Vetting notes and interview scheduling | Private notes for sensitive roles | Phase 2 | **Not done** | |
| Opportunities | Create, edit, publish or unpublish calls with slots, place, skills, deadline | MVP | **Done** | |
| Attendance | Coordinator marks attendance from a list, QR link to show at the event | MVP | **Done** | |
| Hours approval | Approve, edit or reject; batch decisions | MVP | **Done** | |
| Manual assignment | Admins assign volunteers directly | Phase 2 | **Not done** | |
| Certificates | Issue for volunteers with approved hours | MVP | **Done** | |
| Messages | Post announcements, send email to filtered groups, edit the seven emails, WhatsApp link and sender settings, sent log | MVP | **Done, needs setup** | Email part needs the email service (Section 5.5) |
| Reports | Totals, breakdowns, export to CSV, Excel and PDF, every export logged | MVP | **Done** | Filters by programme, state, event and period are limited |
| Departments | Add, rename, merge, archive, restore; delete only if never used | MVP | **Done** | Always asks for confirmation and logs it |
| Department member management | A Department Lead adds, moves and removes people in their department | MVP (section 18) | **Not done** | Leads can see and act on their people, but cannot move them yet |
| Admins | Super Admin adds, changes and removes admins; two Super Admins always kept | MVP | **Done** | |
| Site images and clips | Replace any picture or clip; consent tick saved with who and when | Extra | **Done** | Stored in Supabase Storage |
| Chat moderation | Review reported messages, remove | Extra | **Done** | |
| Audit log | Who did what and when; ids only, no personal data | Phase 2 | **Done** | Built early |
| Demo data | Add or remove clearly marked "(Temp)" volunteers, calls, hours and announcements | Extra | **Done** | Temporary tool for previews |
| Admin handbook and start-here checklist for new admins | Guides for running the programme | MVP | **Not done** | |
| Guide editor | Admins write and edit guides inside the platform | MVP (section 19) | **Not done** | Guides are seeded in the database; editing screen is missing |
| Training tracking | Who has completed orientation and safeguarding, with a screen to record it | Phase 2 | **Partly done** | Tables and checklist exist; no completion screens |
| Block sensitive roles until training is done | Enforced rule | Phase 2 | **Not done** | |
| Renewal reminders | Reminders for anything that needs renewing | Phase 3 | **Not done** | |

## 5.5 Communication

| Feature | What it does | Phase | Status | Notes |
|----------------|--------------------------------------|------|----------|--------------------------|
| Seven automated emails | Application received, guardian consent, needs more information, approved, not approved, activity reminder, thank you | MVP | **Done, needs setup** | Switched off until `EMAIL_ENABLED=true` and a Brevo key are set |
| Bulk email to filtered groups | By state, department, who | MVP | **Done, needs setup** | Same switch. Without it, the message is posted as an announcement |
| Announcements board | Posts on the volunteer dashboard | MVP | **Done** | Works without email |
| Daily reminder job | Reminds people of activities the next day | MVP | **Done, needs setup** | Built and tested; not scheduled until email is on |
| Editable email wording | Admins edit each template | MVP | **Done** | |
| Sent log | Template and outcome only, never the address or body | MVP | **Done** | |
| Message templates (saved messages) | Reusable coordinator messages | Phase 2 | **Not done** | |
| Email to volunteers when a department changes | Told when merged or moved | Phase 2 | **Not done** | Department changes are logged |
| SMS and WhatsApp Business API | Reminders and broadcasts from the platform | Phase 3 | **Not done** | WhatsApp group links work today |

## 5.6 Reports and analytics

| Feature | Phase | Status | Notes |
|----------------------------------------|--------|------------|--------------------------------|
| Overview dashboard (total and active volunteers, new this month, total hours, upcoming events) | MVP | **Done** | |
| Export to Excel, CSV and PDF | MVP | **Done** | Personal data export is Super Admin only and always logged |
| Reports by programme, state, event and period | Phase 2 | **Partly done** | Breakdowns exist; more filters to add |
| Retention (who stopped and when) | Phase 3 | **Not done** | |
| Value of volunteer time | Phase 3 | **Not done** | |
| Demographics (gender, age range, state) for donors | Phase 3 | **Not done** | Gender is not collected yet |

## 5.7 Data protection and security

| Requirement | Status | How it is met |
|------------------------------|----------|--------------------------------------------------|
| Proof of consent | **Done** | Every consent stores exact wording, version, timestamp; cannot be edited |
| Right to withdraw and delete | **Done** | Delete my account withdraws consent and removes personal data |
| Minors | **Done** | Date of birth, minimum age setting, guardian consent required before approval, enforced in the database |
| Access to own data | **Done** | Download my data |
| Privacy policy and cookie consent | **Done** | Privacy page, cookie banner, analytics off unless allowed |
| HTTPS everywhere, hashed passwords | **Done** | Provided by Vercel and Supabase |
| Two-factor for all admins | **Done** | Authenticator app, required before any admin page opens |
| Sensitive details only for roles that need them | **Done** | Separate database tables per sensitivity, row-level security |
| Session timeout for admins | **Done** | 30 minutes idle |
| No personal data in URLs, logs or error messages | **Done** | Fixed messages; health page reports only yes or no and counts |
| Audit log of admin actions | **Done** | Database triggers, append-only |
| Hosting outside Nigeria disclosed | **Done** | Stated in the privacy information and FAQ |

## 5.8 Technical requirements and ownership

| Requirement | Phase | Status | Notes |
|----------------------------------|--------|------------|------------------------------------|
| Mobile first and light on data | MVP | **Done** | Small images and clips, progress bar and loading screens |
| Accounts under an official Devatop email | MVP | **To confirm** | Devatop to confirm who owns Vercel, Supabase, GitHub and the domain |
| At least two Super Admins | MVP | **Done** | Enforced by the database |
| Automatic daily backups, stored away from the server, restore tested | MVP | **Not done** | Depends on the Supabase plan; a restore test must be recorded in the runbook |
| Handover document | MVP | **Partly done** | Drafted; needs real account owners |
| Installable web app | Phase 2 | **Done** | |
| Google Calendar for events | Phase 3 | **Not done** | |
| Email marketing tool (Brevo or Mailchimp) | Phase 3 | **Partly done** | Brevo sending is built; list sync is not |
| Google Sheets export | Phase 3 | **Not done** | CSV and Excel exports exist |
| Link with Devatop's main website | Phase 3 | **Partly done** | Footer logo links to devatop.org |

## 5.9 Departments and roles (requirements section 18)

| Feature | Status | Notes |
|----------------------------------------|------------|--------------------------------------|
| Departments are database rows, never hard-coded | **Done** | Ten starting departments, all editable |
| Add, rename, merge, archive, restore, delete only if unused | **Done** | Super Admin and Programme Manager |
| Volunteers pick departments when applying; approver confirms | **Done** | |
| Calls, guides and announcements tagged to a department | **Done** | |
| Reports and exports filter by department | **Partly done** | |
| Department Lead admin role (scoped to the department) | **Done** | Sees only that department's volunteers and calls |
| Add, move and remove members as a Department Lead | **Not done** | Planned: a "My department" page (Section 11.5, deliverable D2) |
| Team Lead volunteer role | **Not done** | Phase 2 |
| Ask to join another department | **Not done** | Phase 2 |
| Email affected volunteers on a department change | **Not done** | Phase 2 |

## 5.10 About and guides (requirements section 19)

| Feature | Status | Notes |
|----------------------------------------|------------|--------------------------------------|
| Public About page | **Done** | |
| "Start here" checklist for new volunteers | **Done** | |
| Guides in the volunteer portal | **Done** | Read receipts recorded |
| Department guide pages | **Not done** | Phase 2 |
| "Start here" checklist for new admins | **Not done** | |
| Admin handbook | **Not done** | |
| Developer documentation | **Done** | Architecture, database, deploy, runbook, handover in `docs/developer/` |

## 5.11 Quality and operations

| Item | Status | Notes |
|----------------------------------|------------|--------------------------------------------|
| Automated tests | **Done** | 259 checks, including the real database rules |
| Browser walk-through of the whole journey | **Done** | 59 steps against a local copy of the services |
| Automatic check on every change (GitHub) | **Done** | Type check and tests run on every pull request |
| Health page | **Done** | `/api/health` shows missing settings, database problems and counts behind the home page |
| Friendly error page with reference code | **Done** | |
| Developer and runbook documents | **Done** | Backup and restore steps to be recorded once tested |

## 5.12 Not-yet-built features at a glance

| # | Feature | Phase | Size (estimate) |
|----|------------------------------------------------------------|----------------|----------------|
| 1 | Contact form that really delivers messages | MVP | Small |
| 2 | Department Lead "My department" page (add, move, remove people) | MVP, section 18 | Medium |
| 3 | Guide editor and admin handbook | MVP, section 19 | Medium |
| 4 | Hours statement download and recommendation letter request | MVP | Medium |
| 5 | Profile photo upload | MVP | Small |
| 6 | Custom application fields | MVP | Medium |
| 7 | Backups and a tested restore | MVP | Small, mostly setup |
| 8 | Tags and groups, fuller bulk actions | Phase 2 | Medium |
| 9 | Vetting notes and interview scheduling | Phase 2 | Medium |
| 10 | Document upload and references | Phase 2 | Medium to large |
| 11 | Training completion screens and the rule that blocks sensitive roles | Phase 2 | Medium |
| 12 | Team Lead volunteer role and ask-to-join-another-department | Phase 2 | Medium |
| 13 | Manual assignment of volunteers to calls | Phase 2 | Small |
| 14 | Digital volunteer ID with QR | Phase 2 | Small to medium |
| 15 | Resources library | Phase 2 | Medium |
| 16 | Notifications inbox and post-activity feedback | Phase 2 | Medium |
| 17 | Saved message templates and department-change emails | Phase 2 | Small to medium |
| 18 | Programme pages and events calendar | Phase 2 | Medium |
| 19 | Reports: more filters, retention, value of time, demographics | Phase 2 and 3 | Medium |
| 20 | Stories and gallery, Volunteer of the Month | Phase 3 | Medium |
| 21 | Renewal reminders | Phase 3 | Small |
| 22 | SMS and WhatsApp Business API | Phase 3 | Large (provider and cost decisions) |
| 23 | Google Calendar, Sheets export, email list sync | Phase 3 | Medium each |

Size guide: Small is roughly one to two working days, Medium three to five, Large one to two weeks or more of focused work, including tests and documentation. These are planning estimates, not commitments.

\newpage

# 6. Key journeys (as built)

| Journey | Steps |
|------------------|------------------------------------------------------------------------|
| **Become a volunteer** | Open Apply, create an account (email and password), fill three steps, accept consents. Under 18: the parent or guardian opens a one-time link and consents. An admin reviews and approves. The volunteer lands on the dashboard with a "Start here" checklist. |
| **Take part in a call** | Browse Calls, sign up (or join the waitlist), attend, scan the QR code to check in and out. Hours appear as pending. An admin approves. Hours count in totals. |
| **Remote work** | Log hours with a short description. An admin approves, edits or rejects. |
| **Get a certificate** | After approved hours, an admin issues the certificate. The volunteer downloads a PDF with a QR code. Anyone can check the code on the public page. |
| **Run a call (admin)** | Create the call (or publish the starter calls), publish, open Attendance on the day, show the QR link, approve hours afterwards. |
| **Leave** | Profile, "Delete my account" withdraws consent and removes personal data. |

# 7. Safeguarding and security rules built in

These ten rules are checked by automated tests and cannot be switched off from the screens:

1. Every admin page and action checks the person's permission on the server.
2. Programme, state and department limits are applied inside the database query.
3. Volunteers can read and change only their own records.
4. Every admin write is added to the audit log by the database.
5. No names, phones, emails or dates of birth in web addresses, logs or error messages.
6. An under-18 volunteer cannot be approved without verified guardian consent (enforced in the database too).
7. Only approved hours count toward totals, certificates and reports.
8. Every consent stores the exact wording, version and time, and cannot be edited.
9. No photos or clips of identifiable children or survivors; every upload needs a consent tick from the admin, saved with who and when.
10. Departments are data. They are archived or merged, never hard-coded or casually deleted.

# 8. Data held (summary)

| Group | What it holds | Who can see it |
|---|---|---|
| Accounts | Sign-in identity, role | The person; Super Admins for admin roles |
| Volunteer profile | Name, state, LGA, skills, languages, availability, status, Roll choice | Roles that may list volunteers (within scope) |
| Contact details | Phone, email, address | Roles with contact access only |
| Private details | Date of birth, NYSC code | Roles with date-of-birth access only |
| Applications | Stage, chosen departments, reply to "needs info" | The applicant and reviewers in scope |
| Consents | Kind, action, wording, version, time | The person; reviewers in scope; append-only |
| Guardian requests | Guardian name and contact, decision, expiry | The applicant; the guardian through a one-time link |
| Calls, sign-ups, attendance | Calls, who signed up, check-in and out | Public calls; sign-ups to the person and admins in scope |
| Hours | Activity, date, hours, method, status, decision | The person; approvers in scope; only approved count publicly (totals) |
| Certificates | Code, holder, hours, dates, revoked time | The person; public check shows name, hours and dates only |
| Messages and chat | Announcements, bulk email record, chat rooms | By room rules decided in the database |
| Site images | Slot, file, who confirmed consent, when | Public (files); Super Admins change |
| Audit log | Who did what, when (ids only) | Roles with audit access; nobody can edit |

\newpage

# 9. What Devatop needs to do (current status and actions)

## 9.1 Go-live checklist

| # | Step | Owner | Status |
|----|----------------------------------------------------|----------------|----------------------|
| 1 | Supabase Authentication: email sign-in on, "Confirm email" off, minimum password length 8, authenticator two-factor on, Site URL and Redirect URLs (including `/auth/reset`) set | Technical owner | To confirm |
| 2 | Run database updates (`npm run db:migrate`) and the starting data (`npm run db:seed`) | Technical owner | Done on the live database; repeat after each release that adds a migration |
| 3 | Vercel variables set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `CRON_SECRET` | Technical owner | Set. `DATABASE_URL` should be the **Transaction pooler** string (port 6543) on Vercel |
| 4 | First two Super Admins create accounts at `/signup`, then run the one SQL line that grants the role | Devatop | In progress |
| 5 | Each Super Admin signs in and sets up two-factor | Super Admins | In progress |
| 6 | Add the other admins (Admin, Admins) | Super Admin | Pending |
| 7 | Set the WhatsApp group link (Admin, Messages, Settings) | Super Admin | Pending |
| 8 | Publish the starter calls and edit their dates and places | Programme leads | Pending |
| 9 | Upload real, consented photos and clips (Admin, Site images) | Communications lead | Pending |
| 10 | Remove the temporary demo data (Admin, Demo data) before quoting real numbers | Super Admin | Pending |
| 11 | Connect an email service: Brevo account, verified sender, set `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_ENABLED=true`, restore the reminder job in `vercel.json` | Technical owner | Optional now, required for a real launch |
| 12 | Backups: confirm the Supabase plan, copy stored elsewhere, do and record one restore test | Technical owner | Pending |
| 13 | Fill in `docs/developer/handover.md` with the real account owners | Devatop | Pending |

## 9.2 Day-to-day tools for the owner

| Need | Where |
|---|---|
| See if the site is healthy | `/api/health` (settings, database, department count, what the home page numbers are based on) |
| Fill the site for a preview | Admin, Demo data, "Add demo data" |
| Remove all demo data | Admin, Demo data, "Remove all demo data" |
| Add the real roles Devatop needs | Admin, Opportunities, "Publish the starter calls" |
| Change a picture or clip | Admin, Site images |
| Add or change an admin | Admin, Admins |
| Suspend a volunteer | Admin, Volunteers |

## 9.3 Questions Devatop must answer

(Also in `docs/confirm-with-devatop.md`, with where each answer is changed.)

| # | Question | Current assumption |
|----|--------------------------------------------------------|------------------------------|
| 1 | Sender email address for messages, verified with the email service | volunteers@devatop.org |
| 2 | How many days Devatop promises to reply to an application | 7 |
| 3 | Lowest age accepted (under 18 needs a guardian) | 16 |
| 4 | The real list of departments | Ten starting departments |
| 5 | Usual event times and places | Each call sets its own |
| 6 | Coordinator name and phone number for event days | Placeholder |
| 7 | Safeguarding training renewal period | 365 days |
| 8 | Public email and social links on the contact page | volunteers@devatop.org; socials to add |
| 9 | Is transport support available for field activities | FAQ says it may be |
| 10 | The WhatsApp group link | Not set |
| 11 | Talkam link used in emails | https://devatop.org |
| 12 | Under-18 consent: link passed on by the applicant, or emailed to the guardian | Applicant passes it on (email is off) |
| 13 | Real photos and clips | Stand-in artwork |
| 14 | Are the supplied logo files the approved versions (a higher quality original is preferred) | JPEGs supplied |

\newpage

# 10. Known issues and risks

## 10.1 Differences from the original requirements

| Original requirement | What was built | Reason |
|----------------------------|--------------------------------|------------------------------------|
| Passwordless sign-in with an emailed or phone code | Email and password | Devatop's decision; avoids dependence on an email or SMS service just to sign in |
| OTP check to block fake sign-ups | Account creation with a password; email confirmation optional | Same reason. Confirmation can be turned on in Supabase |
| Phone or email verification | Email only; no SMS | Devatop has no SMS provider |
| Emails at every stage | Built, switched off by default | Needs the email service; announcements and links cover the gap |

## 10.2 Known issues

| # | Issue | Impact | Planned fix |
|----|------------------------------------|------------------------------|------------------------------|
| 1 | **The contact form shows "Message sent" but does not deliver the message** | Visitors think they reached Devatop but nobody receives it | Deliverable D1: store messages and show them in Admin, and email them when email is on |
| 2 | Database connection limit on Vercel | If too many connections are open, every page fails with a short error | Done in code (fewer connections per copy); also use the Transaction pooler string |
| 3 | The local test database sometimes fails one overlapping step | Only affects the developer's test run; rerun passes | Documented |
| 4 | Stand-in artwork on picture slots | Site looks unfinished | Upload real photos (Section 9.1) |
| 5 | Demo data may be present | Public numbers include made-up hours | Remove before launch |

## 10.3 Risks

| Risk | Likelihood | Effect | What reduces it |
|----------------------------------|--------------|------------|----------------------------------------|
| Losing access to accounts, as happened to the previous site | Medium | Severe | Official Devatop email for every account, two Super Admins, shared password manager, handover document |
| No backup when something goes wrong | Medium | Severe | Daily backups, a copy kept elsewhere, one tested restore |
| Reaching the database connection limit during a campaign | Medium | High | Transaction pooler, small pools, health page, upgrade plan if traffic grows |
| Emails land in spam or hit free limits | High until Brevo is set up | Medium | Verify the sender and domain in Brevo, set Brevo as Supabase SMTP |
| A photo or clip of an identifiable child or survivor is uploaded | Low | Severe | Upload confirmation tick, written rule, named reviewer for uploads |
| Under-18 consent link is passed on by the applicant (not emailed to the guardian) | Medium | Medium | Switch email on if Devatop needs the stronger proof |
| Free-tier Supabase project pauses after inactivity | Medium on free plan | High | Use a paid plan or keep the project active |

\newpage

# 11. Terms of Reference

## 11.1 Background

Devatop Centre for African Development works against human trafficking, gender-based violence and other abuses across Nigeria, through programmes such as AI4Rights and Talkam, and depends on young volunteers. The previous volunteer site was lost when access to it was lost. Devatop therefore needs a platform it owns, that is safe for volunteers (some of them under 18), that records consent properly, and that gives funders honest numbers.

## 11.2 Objectives

1. Let people apply to volunteer in minutes on a phone, safely and with proof of consent.
2. Let Devatop staff review, place, schedule, record and recognise volunteers, each seeing only what their role needs.
3. Produce trustworthy hours, certificates and reports for grants and donors.
4. Protect volunteers' personal data in line with the Nigeria Data Protection Act 2023.
5. Keep Devatop in control: accounts, code, data and backups owned by Devatop, documented so a new person can take over.

## 11.3 Scope of work

### In scope: Phase 1 (MVP) and early Phase 2 features already **delivered**

Public website; accounts and sign-in; application with consents and under-18 guardian consent; admin review queue; volunteer dashboard; calls with capacity and waitlist; attendance with QR check-in and check-out; hours with approval; certificates with public verification; announcements; admin roles with two-factor and idle timeout; departments as data; reports and exports; audit log; guides with read receipts; chat; download and delete my data; installable web app; site pictures and clips managed by admins; health page; developer documentation; automated tests.

### In scope: **close-out of Phase 1** (to deliver next)

The MVP items that are still open: the contact form (D1), the Department Lead "My department" page (D2), guide editor and admin handbook (D3), hours statement and recommendation letter (D4), profile photo and custom application fields (D5), and backups with a tested restore (D6). Setup tasks for Devatop are in Section 9.

### In scope: **Phase 2** (after close-out)

Tags and groups with fuller bulk actions; vetting notes and interview scheduling; document upload and references; training completion screens and the sensitive-roles rule; Team Lead role and ask-to-join-another-department; manual assignment; digital volunteer ID; resources library; notifications inbox and post-activity feedback; saved message templates and department-change emails; programme pages and events calendar; more report filters.

### In scope: **Phase 3** (later)

Stories and gallery; Volunteer of the Month; renewal reminders; retention, value of time and demographics reports; SMS and WhatsApp Business API; Google Calendar, Google Sheets export and email list sync.

### Out of scope

* Writing Devatop's policies (privacy policy text, safeguarding agreement text, code of conduct); Devatop supplies and approves them.
* Producing photographs, video or testimonial content.
* A native mobile app in the app stores (the installable web app covers this).
* Running the platform day to day, moderating content, or answering volunteers' questions.
* Paying for third-party services (hosting, email, SMS providers); Devatop holds those accounts.
* Legal advice on data protection; a qualified adviser should review the privacy documents before launch.

## 11.4 Roles and responsibilities

| Party | Responsibilities |
|---|---|
| **Devatop project owner** (to be named) | Decides priorities, approves each deliverable, supplies content and answers the confirmation questions, holds all accounts under an official email |
| **Devatop Super Admins** (at least two) | Run the live platform, add admins, remove demo data, upload photos and clips with consent |
| **Programme and department leads** | Review the workflows for their areas and give feedback on the screens they use |
| **Safeguarding lead** (to be named) | Approves the consent wording, the under-18 process and what media may be published |
| **Developer or technical partner** | Builds and tests each deliverable, documents it, keeps the platform healthy, hands over |
| **Platform providers** (Vercel, Supabase, email provider) | Hosting, database, sign-in and email delivery, under Devatop's accounts |

## 11.5 Deliverables

Each deliverable is accepted only when its acceptance criteria are met, the automated tests pass, a browser walk-through of the affected journey passes, and the project owner signs it off.

### Close-out deliverables (Phase 1)

| ID | Deliverable | Acceptance criteria | Size |
|------|----------------------|------------------------------------------------------------|--------|
| **D1** | **Working contact form** | A message sent on the Contact page is stored and visible to Super Admins in a new Admin inbox; a copy is emailed when email is on; the visitor sees an honest confirmation; spam is limited (rate limit and a hidden field); no personal data in logs | Small |
| **D2** | **"My department" page for Department Leads** | A Department Lead sees only their department; can list members, add an existing volunteer who asked to join, remove or move a member, and mark a member as Team Lead; every change asks for confirmation, shows how many people it affects, is written to the audit log and (when email is on) emails the volunteer; other departments' people are never visible | Medium |
| **D3** | **Guide editor and admin handbook** | Admins with the guides permission create, edit, order, publish and archive guides for the right audience (public, volunteers, a department, admins); a "start here" checklist for new admins; an admin handbook covering reviewing applications, running a call, approving hours, issuing certificates and safeguarding; changes are audited | Medium |
| **D4** | **Hours statement and recommendation letter** | A volunteer downloads a PDF statement of approved hours by activity and date, with a verification code; can request a recommendation letter; an admin approves and downloads the letter; only approved hours appear | Medium |
| **D5** | **Profile photo and custom application fields** | A volunteer uploads, replaces and removes a photo (size limited, consent tick, stored safely); a Super Admin adds, orders and removes extra application questions that appear in the form and in the review screen | Medium |
| **D6** | **Backups and a tested restore** | Daily backups confirmed on the chosen plan; a copy stored away from the main server; one full restore into a test project completed, timed and recorded in the runbook with the date and who did it | Small (setup and test) |

### Launch readiness deliverables

| ID | Deliverable | Acceptance criteria |
|------|------------------------|--------------------------------------------------------------|
| **L1** | Go-live checklist completed | Every row in Section 9.1 marked done, `/api/health` shows ready, demo data removed |
| **L2** | Email switched on | Verified sender and domain; test email for each of the seven templates received (and not in spam); reminder job scheduled; guardian email path tested with a real address |
| **L3** | Content and facts signed off | All 14 questions in Section 9.3 answered; About, FAQ and privacy wording approved by Devatop; real photos and clips uploaded with consent ticks |
| **L4** | Handover pack | `handover.md` complete with real owners and where logins are kept; two people from Devatop have signed in and performed an approval, a call, an hours approval and a certificate without help |
| **L5** | Safeguarding and privacy review | The safeguarding lead and a data protection adviser review consent wording, under-18 process, retention and the privacy notice; actions recorded |

### Phase 2 deliverables

| ID | Deliverable | Acceptance criteria (summary) |
|--------|--------------------------|------------------------------------------------------------|
| **P2.1** | Tags, groups and bulk actions | Tag volunteers; filter by tag; bulk approve, message, tag and export with a confirmation showing the number affected; all logged |
| **P2.2** | Vetting notes and interviews | Private notes visible only to roles with the right permission; interview date recorded and shown to the applicant |
| **P2.3** | Documents and references | Applicant uploads ID, CV or letters to private storage; referee details collected for roles with children or survivors; only permitted roles can open files |
| **P2.4** | Training completion and role gating | Admins record completion with date and renewal date; a volunteer cannot sign up to flagged roles until required training is complete; enforced in the database |
| **P2.5** | Team Lead and join requests | A volunteer asks to join another department; the Department Lead accepts or declines; Team Leads see their member list, post announcements and recommend hours |
| **P2.6** | Manual assignment | Admins assign volunteers to calls; volunteers are told; capacity respected |
| **P2.7** | Volunteer ID, resources library, notifications inbox, feedback | ID card with QR for check-in; downloadable resources by audience; one inbox for announcements, reminders and approvals; short feedback form after each activity with results in reports |
| **P2.8** | Templates and department-change emails | Saved coordinator messages; affected volunteers emailed on merge or move |
| **P2.9** | Programme pages and events calendar | Programme pages managed in Admin; a calendar view of calls |
| **P2.10** | Report filters | Reports by programme, state, event, department and period; exports respect scope |

### Phase 3 deliverables

| ID | Deliverable | Acceptance criteria (summary) |
|--------|--------------------------|------------------------------------------------------------|
| **P3.1** | Stories and gallery, Volunteer of the Month | Stories published only with a consent record; removal on request within a set time |
| **P3.2** | Renewal reminders and advanced reports | Reminders for expiring training; retention, value of volunteer time (rate set by Devatop) and demographics reports |
| **P3.3** | SMS and WhatsApp Business API | Provider chosen by Devatop; opt-in recorded; reminders and broadcasts sent and logged; costs shown before sending |
| **P3.4** | Integrations | Google Calendar sync for calls; Google Sheets export; email list sync with Brevo or Mailchimp |

## 11.6 Work plan and sequence

| Stage | Contents | Indicative duration |
|---|---|---|
| **Stage 1: Launch readiness** | L1 to L5 and D6, with Devatop completing Section 9 | 2 to 4 weeks (mostly waiting on content, accounts and answers) |
| **Stage 2: MVP close-out** | D1 to D5 (D1 first because it is a visible gap) | 3 to 5 weeks |
| **Stage 3: Phase 2** | P2.1 to P2.10 in the order Devatop ranks them | 8 to 12 weeks |
| **Stage 4: Phase 3** | P3.1 to P3.4, as budget and need allow | To be planned |

Durations are planning estimates and depend on how quickly Devatop returns decisions and content. Each stage ends with a demonstration to the project owner and written sign-off.

## 11.7 Working method

* One feature per branch, merged through a pull request that shows what changed in plain words.
* Database changes are shown for review before pages are built on them.
* Tests are written from the acceptance criteria; a change is not "done" until the tests and the browser walk-through pass.
* Nothing that holds personal data is added without a rule for who may see it, a test for that rule, and a line in the audit log.
* Every release that changes the database says so, with the exact command to run.
* The documents in `docs/` are updated in the same change as the feature.

## 11.8 Acceptance and sign-off

1. The developer demonstrates the deliverable against its acceptance criteria.
2. The project owner (and, where relevant, the safeguarding lead) tests it on a phone.
3. Defects found are logged and fixed; the deliverable is re-tested.
4. The project owner signs off in writing (an email is enough) naming the deliverable and date.
5. Sign-off is required before the next stage that depends on it starts.

## 11.9 Assumptions and dependencies

* Devatop owns the accounts (hosting, database, repository, domain, email service) under an official email, and gives the technical partner the access needed.
* Devatop answers the confirmation questions and supplies approved wording and media in good time.
* Supabase and Vercel remain available at a plan that supports the expected traffic.
* The email service is paid for or within a free allowance that covers Devatop's volume.
* The minimum volunteer age, the review time and the department list can change; all are settings or data, not code.

## 11.10 Change control

Any change to scope, deliverables or priorities is written down, sized, and agreed by the project owner before work starts. Requests that touch safeguarding or data protection are reviewed by the safeguarding lead first. Items from the original requirements may be moved between phases by agreement.

## 11.11 Reporting

At the end of each stage the developer provides: what was delivered against the acceptance criteria, test results, what changed in the database (and the exact command to apply it), updated documents, known issues, and the proposed next stage.

\newpage

# Appendix A: Pages and addresses

| Area | Page | Address |
|---|---|---|
| Public | Home | `/` |
| Public | Calls | `/opportunities` |
| Public | About, FAQs, Contact, Privacy | `/about`, `/faqs`, `/contact`, `/privacy` |
| Public | Apply | `/apply` |
| Public | Check a certificate | `/verify` and `/verify/CODE` |
| Public | Guardian consent (one-time link) | `/guardian-consent/TOKEN` |
| Sign-in | Sign in, create account, forgot password, new password | `/login`, `/signup`, `/login/forgot`, `/auth/reset` |
| Sign-in | Admin two-factor, not allowed | `/admin/two-factor`, `/admin/not-allowed` |
| Volunteer | Dashboard, calls, hours, certificates, chat, guides, profile, check-in | `/dashboard`, `/my-opportunities`, `/hours`, `/certificates`, `/chat`, `/guides`, `/profile`, `/checkin/ID` |
| Admin | Today, applications, opportunities, attendance, hours, volunteers, certificates, reports, messages, chat, departments, admins, site images, audit log, demo data | `/admin` and `/admin/applications`, `/admin/opportunities`, `/admin/attendance`, `/admin/hours`, `/admin/volunteers`, `/admin/certificates`, `/admin/reports`, `/admin/messages`, `/admin/chat`, `/admin/departments`, `/admin/admins`, `/admin/images`, `/admin/audit`, `/admin/demo` |
| Technical | Health check | `/api/health` |

# Appendix B: Settings (environment variables)

| Name | Purpose | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Where the site talks to Supabase | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for storage and deleting accounts | Yes |
| `DATABASE_URL` | Database connection (Transaction pooler on Vercel, Session pooler on a developer computer) | Yes |
| `NEXT_PUBLIC_SITE_URL` | The live address, used in links and QR codes | Yes |
| `CRON_SECRET` | Protects the daily reminder job | Yes |
| `EMAIL_ENABLED`, `BREVO_API_KEY`, `EMAIL_FROM` | Turn the site's own emails on | Only when email is on |
| `DB_POOL_MAX` | Connections per copy of the site (default 3) | No |

# Appendix C: Documents in the repository

| File | What it is |
|---|---|
| `docs/requirements.md` and the PDF | The original feature requirements |
| `docs/confirm-with-devatop.md` | The questions Devatop must answer, and where each answer is changed |
| `docs/developer/architecture.md` | How the platform is built |
| `docs/developer/database.md` | The database, first admins, required Supabase settings |
| `docs/developer/deploy.md` | Variables, deploying, demo data, database connections |
| `docs/developer/runbook.md` | Backups, restore, keys, what to do when it breaks |
| `docs/developer/handover.md` | Account owners and where logins are kept (to be completed) |
| `CLAUDE.md` | Working rules and current status for the developer assistant |

# Appendix D: Glossary

| Term | Meaning |
|---|---|
| **Call (call to action, opportunity)** | A role or activity volunteers can sign up for |
| **Approved hours** | Hours an admin has approved; the only hours that count anywhere |
| **Department** | A group such as Communications and Media; stored as data |
| **Roll** | The public list of volunteers who agreed to be named |
| **Row-level security** | Database rules that decide, row by row, who may see or change data |
| **Two-factor** | A second check, a code from an authenticator app, required for admins |
| **Transaction pooler / Session pooler** | Two Supabase ways of connecting to the database; the first allows many more clients |
| **PWA** | Installable web app: works like an app without an app store |
| **Pull request** | A proposed change shown for review before it is merged |

# Devatop Volunteers Platform: Feature Requirements

> Plain-text extract of `Devatop-Volunteers-Platform-Feature-Requirements.pdf` (38 pages, 24 Oct 2026, by Olukayode Israel).
> The extract flattens the tables, so some columns run together (the permissions matrix in section 17 especially).
> **The PDF is the authority** for tables, the sitemap (section 10), the volunteer journey (section 11) and the homepage wireframe (section 16). Read the PDF page for any of those.

```text
Devatop Volunteers Platform -- Feature Requirements

Devatop Volunteers Platform -- Feature
Requirements

 Oct 24, 2026 · @Olukayode Israel

Overview

Devatop needs a new volunteers platform that lets people apply, get approved, take part
in activities and get recognised, while staff manage everything from one admin section.
The previous volunteers website was lost and could not be recovered, so this build also
has to make sure Devatop owns and can always access the platform.
Who uses it

    Visitors: people learning about Devatop and deciding whether to volunteer.
    Volunteers: approved people taking part in programmes, events and remote tasks.
    Admins: Devatop staff and coordinators who review, schedule, track and report.
How to read this document: features marked MVP are needed at launch. Everything else
can come in later phases (see Build phases at the end).

1. Public website

The public side convinces people to volunteer and shows them where they fit.

Feature              What it does                                         Phase
Home page                                                                 MVP
Opportunities board  Who Devatop is, why volunteer, impact numbers        MVP
                     (volunteers, hours, states reached), clear "Become
FAQs                 a Volunteer" button                                  MVP
Contact form                                                              MVP
                     Open roles (comms, AI4Rights facilitators, field
                     outreach, event support) with location, remote or
                     physical, time commitment, skills and deadline;
                     filter by state, programme and skill

                     Who can volunteer, minimum age, whether it is
                     paid, whether corps members and SIWES students
                     can use it for logbooks

                     Enquiries, plus links to Devatop's main website and
                     socials

                                                                                 Page 1 of 38
Devatop Volunteers Platform -- Feature Requirements

Feature              What it does                                       Phase
Programme pages                                                         Phase 2
Events calendar      What each programme does and how volunteers fit    Phase 2
Stories and gallery  in                                                 Phase 3

                     Upcoming outreaches, trainings and campaigns
                     people can sign up for

                     Volunteer testimonials and photos from activities

2. Registration and onboarding

Every volunteer goes through one application flow, and nobody works with children or
survivors until they have signed the safeguarding agreement.

Feature                                              What it does                                  Phase
Application form                                                                                   MVP
                                                     Name, phone, email, state and LGA,
Email or phone verification                          occupation, skills, interests, availability,  MVP
Consent checkboxes                                   languages, how they heard about               MVP
                                                     Devatop, NYSC state code (optional);
Code of conduct and safeguarding                     admins can add custom fields                  MVP
agreement                                                                                          MVP
Application status tracking                          OTP check to block fake sign-ups
Onboarding checklist                                                                               Phase
Document upload                                      Privacy notice, data use, photo and media     2
                                                     consent, each recorded with a                 Phase
                                                     timestamp; applicants under 18 enter          2
                                                     their date of birth and a parent or
                                                     guardian confirms consent through their
                                                     own email or phone

                                                     Signed digitally before approval, because
                                                     Devatop works with children and
                                                     trafficking survivors

                                                     Submitted, Under review, Interview,
                                                     Approved or Rejected, with an email at
                                                     each stage

                                                     Orientation video, handbook,
                                                     safeguarding training, WhatsApp group
                                                     link

                                                     ID, CV, NYSC call-up letter or school
                                                     letter where a role needs it

                                                                                                   Page 2 of 38
Devatop Volunteers Platform -- Feature Requirements  What it does                                       Phase

  Feature                                            Referee details collected for roles                Phase
  References                                         involving children or survivors                    2

3. Volunteer dashboard

Once approved, each volunteer gets a personal dashboard to manage their activities,
hours and certificates.

Feature                                              What it does                                       Phase
Profile management                                                                                      MVP
Opportunities and sign-                              Edit details, skills, availability and photo       MVP
ups                                                  Browse and apply for roles and shifts, see what
My hours                                             they signed up for, cancel with notice             MVP

Certificates and letters                             Total hours and hours per activity; log hours for  MVP
                                                     remote work for admin approval
Digital volunteer ID                                                                                    Phase 2
Resources library                                    Download certificate of volunteering and hours     Phase 2
                                                     statement; request a recommendation letter
Notifications inbox                                  (corps members and students will need this often)  Phase 2
Post-activity feedback                                                                                  Phase 2
Badges and milestones                                ID card with QR code for events and outreaches     Phase 3

                                                     Handbooks, slides, recorded trainings, brand
                                                     guidelines

                                                     Announcements, reminders and approvals
                                                     Short form after each activity

                                                     10 hours, 50 hours, first outreach, and similar

4. Admin section

The admin section is where Devatop staff run the whole programme, and each admin sees
only what their role needs.

                                                                                                        Page 3 of 38
Devatop Volunteers Platform -- Feature Requirements

Admin roles

Role                   Can do
Super Admin
                       Everything, including managing other admins and
Programme Manager      settings

Volunteer Coordinator  Manage volunteers, opportunities and reports for
                       their programme
State or Chapter Lead
Viewer                 Review applications, schedule, take attendance,
Department Lead        approve hours

                       Manage volunteers and events in their state only

                       Read-only access to dashboards and reports

                       Manage volunteers, calls to action, attendance,
                       hours and guides for their department only (see
                       section 18)

Role-based access is MVP. An audit log (who approved, edited or deleted what, and
when) comes in Phase 2.

Volunteer management

Feature                   What it does                                           Phase
Volunteer database                                                               MVP
Application review queue  Search and filter by state, skill, status, programme,  MVP
Volunteer status          hours and join date                                    MVP
Tags and groups                                                                  Phase 2
Bulk actions              Approve, reject, request more info, add private        Phase 2
Vetting notes             notes, schedule interview                              Phase 2

                          Applicant, Active, Inactive, Suspended, Alumni

                          For example "AI4Rights facilitators", "Abuja team",
                          "Comms"

                          Approve, message, tag or export many volunteers
                          at once

                          Private background notes for sensitive roles

                                                                                 Page 4 of 38
Devatop Volunteers Platform -- Feature Requirements

Opportunities, events and scheduling

Feature                                              What it does                                       Phase
Create and edit                                      Slots, location, required skills, deadlines        MVP
opportunities
Attendance                                           Coordinator marks attendance from a list           MVP
Hours approval                                       Approve, edit or reject hours volunteers submit
QR check-in and check-out                            Volunteers scan in and out at events; hours        MVP
                                                     recorded automatically
Shift scheduling                                     Capacity limits and a waitlist when slots fill     Phase
                                                                                                        2
Manual assignment                                    Admins assign volunteers directly, alongside self
                                                     sign-up                                            Phase
                                                                                                        2

                                                                                                        Phase
                                                                                                        2

Training and compliance

    Track who has completed required training (orientation, safeguarding). Phase 2
    Block volunteers from sensitive roles until required training is done. Phase 2
    Reminders for anything that needs renewing. Phase 3

Recognition

    Certificate generator: fills name, hours, role and dates into Devatop's template, with a
    unique verification code anyone can check online. MVP
    Volunteer of the Month spotlight on the public site. Phase 3

5. Communication

Email covers the official messages, but WhatsApp is where Nigerian volunteers actually
read things, so the platform should support both.

Feature                                              What it does                                       Phase
Automated emails                                                                                        MVP
                                                     Welcome, application received, approved,
Bulk email to filtered groups                        event reminder, thank-you after an event           MVP

                                                     For example all Lagos volunteers, or all
                                                     AI4Rights facilitators

                                                                                                        Page 5 of 38
Devatop Volunteers Platform -- Feature Requirements

Feature                                              What it does                               Phase
WhatsApp group link                                  Shown after approval and on the dashboard
Announcements board                                  Posts on the volunteer dashboard           MVP

Message templates                                    Saved messages coordinators reuse          Phase
                                                                                                2
SMS and WhatsApp Business                            Reminders and broadcasts sent from the
API                                                  platform                                   Phase
                                                                                                2

                                                                                                Phase
                                                                                                3

6. Reports and analytics

Reports turn volunteer activity into numbers Devatop can put in grant applications and
donor reports.

Feature                                              What it does                               Phase
Overview dashboard                                   Total volunteers, active volunteers, new   MVP
                                                     sign-ups this month, total hours,
Export to Excel, CSV and PDF                         upcoming events                            MVP
Reports by programme, state, event                   Any list or report                         Phase
and period                                           Filterable breakdowns                      2
Retention                                                                                       Phase
                                                     Who stopped taking part, and when          3
Value of volunteer time                                                                         Phase
                                                     Hours multiplied by an hourly rate         3
Demographics                                         Devatop sets                               Phase
                                                     Gender, age range and state, for donor     3
                                                     reporting

7. Data protection and security

The platform must comply with the Nigeria Data Protection Act 2023, and as the
organisation behind AI4Rights, Devatop should model good data practice.
What the law requires (all MVP)

                                                                                                Page 6 of 38
Devatop Volunteers Platform -- Feature Requirements

    Proof of consent: the organisation carries the burden of proving consent, so store a
    timestamped record of exactly what each volunteer agreed to.
    Right to withdraw: where processing relies only on consent, people must be told they
    can withdraw before they give it. Add a "withdraw consent / delete my account" option.
    Minors: processing children's data needs parent or guardian consent plus age
    verification. Devatop will accept volunteers under 18, so the platform needs a date-of-
    birth check and a guardian consent step before any under-18 application is reviewed.
    Access to own data: volunteers can request a copy of their data. Add a "download my
    data" button (Phase 2).
    Privacy policy and cookie consent: a privacy policy page, and explicit consent for non-
    essential cookies (Clym summary).
Security (MVP)
    HTTPS everywhere and hashed passwords.
    Two-factor authentication for all admins.
    Phone numbers and addresses visible only to roles that need them; a State Lead sees
    only their state.
    Session timeouts on the admin section.

8. Technical requirements and ownership

The last site was lost because access was lost, so ownership and backups are launch
requirements, not extras.
Ownership (MVP)

    Domain, hosting account and code repository registered to an official Devatop email,
    never a staff member's personal account.
    At least two Super Admins, so no single person can lock Devatop out.
    Automatic daily backups of the database and uploads, stored away from the main
    server.
    Handover document covering hosting, deployment and where logins are kept (in a
    shared password manager).
Performance and access
    Mobile-first and lightweight, since most volunteers will use phones on limited data.
    MVP
    Installable as a web app (PWA) so it works like an app without the Play Store. Phase 2
Integrations (Phase 3)

                                                                                                                                                                                                                                            Page 7 of 38
Devatop Volunteers Platform -- Feature Requirements

    Google Calendar for events.
    Email marketing tool (Brevo or Mailchimp).
    Google Sheets export.
    Link with Devatop's main website.

9. Build phases and next steps

Build in three phases so volunteers can start applying as soon as Phase 1 is live.

build roadmap · 3 phases

Each phase builds on the one before; Phase 1 alone is enough to replace the lost site.
Next steps

    Decide the lowest age accepted and which roles are open to under-18 volunteers.
    Agree the admin roles and who fills each one.
    Choose the tech stack and hosting, under a Devatop-owned account.
    Prepare the certificate template and safeguarding agreement text.

10. Platform structure

The platform has three areas on one address: a public site anyone can visit, a portal for
approved volunteers, and an admin section for Devatop staff.

                                                                                                                                                                                                                                            Page 8 of 38
Devatop Volunteers Platform -- Feature Requirements

platform sitemap · 3 areas

Logging in sends each person to their own area; admins see only the pages their role
allows.

11. Key user journeys

A visitor becomes an active volunteer through one review step, then repeats a simple loop
of activities that each end in approved hours.

                                                                                                                                                                                                                                            Page 9 of 38
Devatop Volunteers Platform -- Feature Requirements

volunteer journey · visitor to certificate

The dashed step only appears for applicants under 18.
Admin journeys to design around
 1. Review applications: open the queue, read an application, approve, reject or ask for

    more info, in under a minute each.
 2. Run an event: create the opportunity, see who signed up, print or show the QR code,

    mark attendance, approve hours in bulk afterwards.
 3. Report to a funder: pick a programme and date range, see volunteers and hours,

    export to Excel or PDF.
 4. Issue certificates: select volunteers, generate certificates, and they appear on each

    volunteer's dashboard.

                                                                                                                                                                                                                                          Page 10 of 38
Devatop Volunteers Platform -- Feature Requirements

12. Look and feel (UX)

The platform should feel like joining a youth movement that takes action, not filling a
government form. It should match devatop.org: Devatop orange (#F05023) as the brand
colour, real photos of volunteers in the field, and the same action-first voice as the current
volunteers page ("Volunteers are known by action, not by registration").

How it should feel

Quality            What it means in practice
Action-first
Warm and youthful  Every page ends with one clear next step: apply,
Dignified          sign up, log hours. No dead ends.
Trustworthy
Rewarding          Plain, friendly English; light Pidgin in small places,
                   like Talkam does ("If you see am, Talkam").

                   Show volunteers at work, not suffering. Never
                   show survivors' faces or identifying details.

                   Explain in one line, right at the form, why each
                   piece of data is collected and who sees it.

                   Hours, milestones and certificates are always
                   visible, so volunteers see their impact grow.

UX rules for the volunteer side

    Mobile-first and light on data: most volunteers will use phones on paid data.
    Compressed images, fast public pages, nothing heavy to download.
    Short application: three steps with a progress bar (About you, Skills and availability,
    Consent), and progress saved so people can finish later.
    Always show status: the dashboard says where the application stands and what
    happens next, so nobody has to ask on WhatsApp.
    Low effort to take part: signing up for an activity takes one tap; checking in is a QR
    scan.
    Readable for everyone: large tap targets, strong contrast, simple words, works on
    small and older Android phones.

UX rules for the admin side

    Open on "what needs me today": pending applications, hours waiting for approval,
    events this week.
    Tables built for work: search, filters, bulk actions and export on every list.

                                                                           Page 11 of 38
Devatop Volunteers Platform -- Feature Requirements

    Fewest clicks for frequent jobs: approve an application or a batch of hours without
    opening each record.
    Every sensitive action is confirmed and logged: rejecting, suspending, deleting,
    exporting.

Visual design (colours, type, components) will be covered in the UI phase.

13. Recommended tech stack

Build it as one Next.js and TypeScript app on a PostgreSQL database. It is React (which
you already use), one codebase for public site, volunteer portal and admin, and the stack
Claude Code knows best, with TypeScript catching mistakes before they reach users.

Layer            Choice                              Why
Framework        Next.js 16 (App Router),
                 TypeScript                          Current major version (support
Styling and      Tailwind CSS, shadcn/ui             policy); server and frontend in one
components                                           project
Database         PostgreSQL on Supabase
                                                     Fast to build, accessible
Database access  Drizzle ORM                         components, easy to theme in
Login            Supabase Auth (email or phone       Devatop orange
Forms and        OTP)
validation       React Hook Form, Zod                Relational data fits volunteers,
Email            Brevo or Resend                     events and hours; includes file
Certificates     @react-pdf/renderer, qrcode         storage, and daily backups on the
Scheduled jobs   Vercel Cron or Supabase             paid plan
                 pg_cron
                                                     Typed queries and migrations kept
                                                     in the repo

                                                     No passwords to forget; matches
                                                     the OTP verification requirement

                                                     One set of rules checks data in the
                                                     browser and on the server

                                                     Transactional emails and bulk sends
                                                     to filtered groups

                                                     PDF certificates with a QR
                                                     verification code

                                                     Event reminders, overdue hours
                                                     approvals, weekly summaries

                                                     Page 12 of 38
Devatop Volunteers Platform -- Feature Requirements

Layer               Choice                                                      Why
Hosting             Vercel (Pro plan) or a VPS
Monitoring                                                                      Simple deploys from GitHub; on
Testing             Sentry                                                      volunteer.devatop.org, the old site's
Motion              Vitest, Playwright                                          address

Smooth scroll       GSAP (ScrollTrigger, SplitText,                             Alerts when something breaks for a
                    DrawSVG), @gsap/react                                       volunteer
                    Lenis
                                                                                Unit tests for rules (hours, consent);
                                                                                end-to-end tests for apply and
                                                                                approve

                                                                                Letter reveals, scroll moments, map
                                                                                fills, tally marks; free for commercial
                                                                                use (see section 16)

                                                                                Smooth scrolling on desktop only;
                                                                                phones keep native scrolling

Alternative: Laravel with the Filament admin panel. It gives a full admin section almost for
free and runs on cheap Nigerian shared hosting, but it means PHP instead of React.

Decision: Next.js. You already work in React, so you can read, review and fix what Claude
Code writes. Claude Code is strongest in TypeScript and React, and the volunteer side
needs a custom, emotional design that Filament's ready-made admin look would fight
against. shadcn/ui tables and forms cover the admin section well enough.

All accounts (GitHub, Supabase, Vercel, Brevo, domain) are opened with an official
Devatop email, as required in section 8. Supabase and Vercel host data outside Nigeria, so
the privacy policy must say so.

14. Data model

About 20 tables cover Phase 1 and 2. The volunteer profile sits at the centre; everything
else links to it.

Table                                                Holds                      Links to
users                                                                           One profile; one admin role
                                                     Login identity: email,
volunteer_profiles                                   phone, role (volunteer or  users; applications; signups;
                                                     admin)                     hour_logs

                                                     Name, date of birth,
                                                     state, LGA, skills,
                                                     availability, status

                                                                                Page 13 of 38
Devatop Volunteers Platform -- Feature Requirements

Table                                                Holds                      Links to
applications                                                                    volunteer_profiles; reviewing
                                                     Answers, stage             admin
consents                                             (submitted to
guardian_consents                                    approved), reviewer        volunteer_profiles
admin_roles                                          notes
programmes                                                                      volunteer_profiles
opportunities                                        Each consent given or
signups                                              withdrawn, with text       users; programmes
attendance                                           version and timestamp
hour_logs                                                                       opportunities
trainings,                                           Guardian name, contact,
training_completions                                 verification, timestamp    programmes; signups
certificates                                         for under-18s
messages                                                                        volunteer_profiles; opportunities
                                                     Role (Super Admin to
                                                     Viewer) and the state or   signups
                                                     programme it covers
                                                                                volunteer_profiles;
                                                     AI4Rights, Talkam,         opportunities; approving admin
                                                     outreach and other         volunteer_profiles
                                                     programmes                 volunteer_profiles

                                                     Roles and events: title,   admin sender; tags
                                                     location, slots, skills,
                                                     dates

                                                     A volunteer's place on an
                                                     opportunity, or on the
                                                     waitlist

                                                     Check-in and check-out
                                                     times, method (QR or
                                                     coordinator)

                                                     Hours claimed or
                                                     recorded, and their
                                                     approval status

                                                     Required trainings and
                                                     who finished them

                                                     Issued certificates with
                                                     a unique verification
                                                     code

                                                     Emails and
                                                     announcements sent,
                                                     and to which group

                                                                                Page 14 of 38
Devatop Volunteers Platform -- Feature Requirements

Table                                                Holds                     Links to
tags                                                                           volunteer_profiles
audit_logs                                           Groups such as "Abuja     users
departments                                          team" or "Comms"          department_memberships;
                                                                               opportunities; guides
department_memberships                               Who did what to which
                                                     record, and when          volunteer_profiles; departments
guides
                                                     Name, description, icon,  departments; author admin;
guide_reads,                                         lead, status (active or   guide_reads
checklist_progress                                   archived), merged-into,
                                                     sort order                users; guides

                                                     A volunteer in a
                                                     department, their role
                                                     (Member or Team Lead),
                                                     status (requested,
                                                     active, left) and dates

                                                     Title, body, audience
                                                     (public, volunteers,
                                                     department, admins),
                                                     order, published, must-
                                                     read flag, last updated

                                                     Who has read each
                                                     must-read guide, and
                                                     each person's Start here
                                                     progress

Two rules live in the database, not only in the code: hours can only be approved by an
admin, and a volunteer under 18 cannot be approved without a guardian consent record.

15. Project structure for Claude Code

One repository, with the three areas of the platform as three route groups, so Claude
Code can work on one area without touching the others.

devatop-volunteers/                                  project rules Claude Code reads every session
   CLAUDE.md                                         this document, exported
   docs/requirements.md                              architecture, deploy, runbook, handover (section
   docs/developer/
                                                     home, opportunities, programmes, events, faqs,
19)
   src/
       app/
          (public)/

                                                                               Page 15 of 38
Devatop Volunteers Platform -- Feature Requirements

about, guides, apply, verify

(volunteer)/                                         dashboard, my-opportunities, hours, certificates,

guides, departments, profile

(admin)/admin/                                       overview, applications, volunteers,

opportunities, attendance,

                                                     hours, certificates, messages, departments,

guides, reports, settings

api/                                                 webhooks, cron jobs, certificate PDFs

components/

ui/                                                  shadcn/ui components

shared/                                              forms, tables, status badges used across areas

lib/

auth/                                                login, sessions, role checks

db/                                                  Drizzle schema, queries, migrations

email/                                               email templates and sending

validation/                                          Zod schemas shared by forms and server

permissions.ts                                       who can see and do what, in one place

tests/

unit/                                                Vitest

e2e/                                                 Playwright: apply, approve, check in, certificate

What goes in CLAUDE.md

    The stack and the commands to run, test and migrate.
    Rules: every admin page checks permissions through permissions.ts ; every form
    uses a shared Zod schema; no personal data in URLs or logs.
    Build one feature at a time, with a test, on its own branch.
    Point to docs/requirements.md as the source of truth for features.

How to build it with Claude Code

1. Set up the repo, accounts and CLAUDE.md under Devatop's official email.
2. Ask Claude Code for the database schema first and review it before any pages.
3. Build Phase 1 in this order: auth and roles, application flow, admin review, volunteer

    dashboard, opportunities and sign-ups, hours, certificates, emails.
4. After each feature: run the tests, try it on a phone, then merge.
5. Deploy to a staging address first, then to volunteer.devatop.org.

16. UI direction: "Known by Action"

The site is built around big, heavy type that real volunteers show through, a Nigeria map
made of their photos, and a cursor that invites you to act. It keeps Devatop's own line,
"Volunteers are known by action, not by registration", as the spine, and turns the word
ACTION into the hero image itself.

                                                                                                  Page 16 of 38
Devatop Volunteers Platform -- Feature Requirements

What we take from your three pins

Your pin                                             What we take                  What we leave out
1. Voices United, by                                                               The centred, symmetrical
Phenomenon Studio                                    Giant condensed capitals      layout: our type sits hard left
                                                     with real photos showing      and runs off the right edge
2. "Justice begins where                             through the letters; type as
inequality ends" charity                             the hero image; orange call   Children's faces, soft
template                                             to action                     shadow cards and coloured
                                                                                   icon tiles
3. DonateX donation page                             A photo clipped inside a
                                                     map shape; a map showing      Floating rounded cards with
                                                     where volunteers are          shadows (ours are flat with
                                                     needed; a serif headline      an ink edge) and dot-grid
                                                                                   decoration
                                                     One emotional word in
                                                     orange inside a black
                                                     headline; a small "Become a
                                                     volunteer" tag sitting over
                                                     the hero photo; a big stats
                                                     row; a hand-drawn arrow

Pins 2 and 3 lead with close-ups of children. Devatop cannot do that: its work involves
trafficked and at-risk children, so our photos show adult volunteers in action, and never
an identifiable child or survivor.

Signature moments that drive emotion

Moment         What the volunteer sees                                             What they should feel
Homepage hero                                                                      This is real people, doing real
               ACTION set huge, hard left, with                                    things, right now
The map        black-and-white volunteer photos
               showing through the letters and                                     We are spreading across the
               slowly changing; above it,                                          country
               "Volunteers are known by" in smaller
               type

               A Nigeria map filled with volunteer
               photos; states where Devatop
               volunteers have worked burn orange,
               and pointing at a state shows how
               many hours were given there

                                                                                   Page 17 of 38
Devatop Volunteers Platform -- Feature Requirements

Moment           What the volunteer sees               What they should feel
Calls to action                                        Someone specific needs me,
board            Opportunities set like urgent         this week
                 dispatch notices: place, date, how
Approval screen  many hands needed, slots left; the    Chosen, proud, ready to tell
                 cursor turns into a "Sign up" disc    people
My record        over each row
Certificate                                            My effort is counted and it adds
The Roll         "YOU'RE IN, AMAKA" in the giant       up
                 type, with the volunteer's own        I did something worth printing
                 profile photo showing through their
                 name, and a version sized for         I belong to something bigger
                 WhatsApp status

                 Hours drawn as tally marks that ink
                 themselves in, and every activity
                 listed like a ledger entry

                 A front page of "The Devatop
                 Record" with their name as the
                 headline and a QR code to verify it

                 Every volunteer's name (opt-in)
                 moving slowly across the page like a
                 news ticker

Colour

Talkam Orange dominates in big flat fields, never in gradients; everything else is ink on
warm paper.

Name             Hex                                 Use
Talkam Orange    #F05023
Ink              #16130F                             Dominant: hero fields, the one emotional word in
Newsprint        #F2EDE3                             headlines, cursor disc, buttons, map states
Stamp Green      #0B6E4F
                                                     All text, flat borders, rules, the black-and-white
                                                     photos

                                                     Page background: warm off-white, like your first
                                                     pin

                                                     Status only: approved, verified, hours accepted

Text on orange is always Ink; white on orange only at 24 px bold and above, for contrast. At
least 25% of every page stays open newsprint.

                                                                                                         Page 18 of 38
Devatop Volunteers Platform -- Feature Requirements

Typography

Role     Typeface                                    How it's used
Display  Big Shoulders Display, Black
                                                     Uppercase, very tight, very large: ACTION, names,
Accent   Fraunces Italic                             numbers, section titles; the face photos show
Body     Atkinson Hyperlegible Next                  through

                                                     One emotional word per headline, in orange, like
                                                     your third pin ("Show up for someone")

                                                     Paragraphs, forms, buttons; built for legibility on
                                                     small, cheap phone screens

All three are free on Google Fonts. Big Shoulders is a condensed civic-poster face that is
not overused, unlike Bebas Neue or Anton, which would make the hero look like a
template.

Layout

    Off-centre editorial grid: 12 columns; the giant type starts at the left edge and is
    cropped by the right edge, so the page feels bigger than the screen.
    Overlap, flat: like your third pin, a small "Become a volunteer" ticket sits over the
    corner of the hero photo, but as a flat newsprint tag with an ink edge and a strip of
    orange "tape", not a floating shadow card.
    Rules instead of boxes: 1 px ink lines divide sections and list rows, like newspaper
    columns.
    Numbers as architecture: hours, volunteers and states reached are set in the display
    face across the full width, not in small stat cards.
    Split-screen application: left side orange with one big question per step ("What can
    your hands do?"), right side the form on newsprint.
    Mobile keeps the drama: ACTION still fills the screen width; the map and calls stack;
    an "Apply" bar is pinned to the bottom.

Imagery

    Photos inside type and inside the map: high-contrast black-and-white shots of
    Devatop volunteers at outreaches, trainings and campaigns, clipped into the letters of
    ACTION and the shape of Nigeria.
    One orange duotone for featured photos; everything else stays black and white.
    Hand-drawn marks: an ink arrow pointing at the Apply ticket, a circle around the slots-
    left number, tally marks for hours. Drawn as SVG so they can ink themselves in.

                                                     Page 19 of 38
Devatop Volunteers Platform -- Feature Requirements

    Raw texture: a faint newsprint grain over the background, made with a tiny SVG filter.
    Safeguarding: no identifiable children or survivors, ever; every person photographed
    has a consent record.

Motion and the custom cursor

The public site moves like a motion site: a custom cursor that turns into an invitation, type
that rises into place, and scroll that brings the map and numbers to life. Every movement
has a job, and none of it bounces.

The cursor

    At rest: a small ink dot with an orange ring that follows a moment behind the mouse.
    Over anything you can act on, the ring fills orange and grows into a disc with a verb in
    it: Join on the hero, Sign up on a call to action, Read on a story, See on a map state.
    Over the giant photo-filled type, the disc works as a small window that shows that part
    of the photo in full colour.
    Primary buttons are gently magnetic: they lean a few pixels toward the cursor, then
    settle. No springing or wobble.
    In forms and on text fields the normal cursor comes back, so typing never feels
    strange.
    Phones and tablets get no custom cursor; the same verbs appear as labels on tap
    targets instead.

Page and scroll motion

Where              What moves                               How
Page load                                                   Once, under 1.2 seconds
                   The letters of ACTION rise from a
Between pages      baseline one by one, the photos fade up  Short, so navigation still
Section headlines  inside them, the orange field wipes in   feels fast
The map            from the left                            Once per headline
Numbers                                                     Once
                   An orange panel sweeps across and lifts  Once, when visible
                   away

                   Lines slide up from behind a mask as
                   they enter the screen

                   States fill orange one after another as
                   the map scrolls into view

                   Hours, volunteers and states count up
                   to their real value

                                                            Page 20 of 38
Devatop Volunteers Platform -- Feature Requirements

Where            What moves                              How
                 Ink themselves in, stroke by stroke     When visible
Tally marks and
arrows           Names drift slowly sideways; speeds up  Continuous, pauses on
The Roll         a little while scrolling                hover

Rules

    One easing curve and durations between 0.4 and 1.2 seconds, so everything feels like
    one hand made it.
    Animate only position, scale and opacity, so it stays smooth on low-cost Android
    phones.
    Smooth scrolling on desktop only; phones keep native scrolling.
    When the phone or computer is set to reduce motion, everything appears instantly and
    the normal cursor is used.
    The volunteer dashboard keeps a little motion (tally marks, approval stamp); the admin
    section has none.

What to build it with (add to the stack in section 13)

Library                                              For
GSAP with ScrollTrigger, SplitText and
DrawSVG                                              Letter reveals, scroll moments, map fills, tally
                                                     marks; all plugins are free for commercial use
@gsap/react                                          since April 2025
Lenis
Hand-built cursor component                          Runs GSAP safely inside Next.js components

                                                     Smooth scrolling on desktop

                                                     About 60 lines of code; no library needed, and
                                                     it stays light

                                                                       Page 21 of 38
Devatop Volunteers Platform -- Feature Requirements

Homepage wireframe

homepage wireframe v2 · desktop

Orange shapes stand for Talkam Orange; the two discs show the cursor over the hero and
over a call to action. The map outline is simplified, and names and places are examples.

17. Build handoff for Claude Code

This section closes the gaps Claude Code would otherwise guess at: who can do what,
when a feature counts as done, the project rules file, the design tokens in code, and the
words on the screens and in the emails. Copy it into the repo as described in section 15.

                                                                                                                                                                                                                                          Page 22 of 38
Devatop Volunteers Platform -- Feature Requirements

Permissions matrix

Every admin action is denied unless this table allows it. "Own programme" and "Own
state" mean the admin only sees and acts on volunteers, opportunities and hours inside
the programme or state their role covers.

Action                    Super                      Programme  Volunteer            State or    Viewer
                          Admin                      Manager    Coordinator          Department
                                                                                     Lead        Yes
See overview dashboard Yes                           Own        Yes                              Names
                                                     programme                       Own state   only
                                                     Own                                         No
See volunteer list and    Yes                        programme  Yes                  Own state   No
                                                     Own                                         No
profiles                                             programme                                   No
                                                     No
See phone, email and      Yes                                   Yes                  Own state   No
                                                     Own                                         No
address                                              programme                                   No
                                                     No                                          No
See date of birth and     Yes                                   Yes                  No          No
                                                                                                 No
guardian details                                                                                 No
                                                                                                 Yes
Review and decide         Yes                                   Yes                  Own state   No
                                                                                                 No
applications

Approve an under-18       Yes                                   Yes, only after      No

applicant                                                       guardian consent is

                                                                verified

Suspend or reactivate a Yes                          Own        No                   No
volunteer                                            programme

Delete a volunteer's data Yes                        No         No                   No
(on their request)
                                                     Own
Create and edit           Yes                        programme  Yes                  Own state

opportunities and events                             Own
                                                     programme
Take attendance           Yes                                   Yes                  Own state
                                                     Own
Approve, edit or reject   Yes                        programme  Yes                  Own state

hours                                                Own
                                                     programme
Issue certificates        Yes                                   Yes                  No
                                                     Own
Send bulk email to a      Yes                        programme  Yes                  Own state

group                                                Own
                                                     programme
See reports               Yes                                   Yes                  Own state
                                                     Own
Export reports (totals    Yes                        programme  Yes                  Own state

only)                                                No

Export personal data      Yes                                   No                   No

(contact details)

                                                                                                 Page 23 of 38
Devatop Volunteers Platform -- Feature Requirements

Action                    Super                      Programme  Volunteer              State or      Viewer
                          Admin                      Manager    Coordinator            Department
                                                                                       Lead          No
Manage trainings and      Yes                        Own        Yes                    No            No
                                                     programme                                       No
resources                                            No         No                     No            No
                                                     No         No                     No            No
Manage admins and roles Yes
                                                     No         No                     No            No
Edit settings, certificate Yes                       No         No                     No
and email templates                                                                                  No
                                                     Own
See the audit log         Yes                        programme                                       No

Add, rename, merge,       Yes                        Own
                                                     programme
archive or restore

departments

Assign volunteers to      Yes                                   Yes                    Own state or

departments, accept join                                                               department

requests

Write, edit and publish   Yes                                   Volunteer guides only  Own
                                                                                       department
guides                                                                                 guides

Edit the admin handbook Yes                          No         No                     No

and About page

Rules for the code

    Permissions live in one file, src/lib/permissions.ts , as a function can(admin,
    action, record) ; every admin page and server action calls it.
    Checks run on the server. Hiding a button is not a permission check.
    The programme and state scope is applied inside the database query, so out-of-scope
    records are never even loaded.
    Volunteers can only read and change their own records.
    Every admin write (approve, reject, edit, delete, export, message) adds a row to
     audit_logs .

For a Department Lead, read "Own state" in the table as "own department". A volunteer
Team Lead is not an admin: they act only inside the volunteer portal, on their own
department (section 18).

Acceptance criteria (Phase 1)

A feature is done only when every box under it is true and has a test. Tick them off as
Claude Code finishes each one.
Login and roles

    A person can log in with an email or phone one-time code; no passwords are stored.

                                                                                                     Page 24 of 38
Devatop Volunteers Platform -- Feature Requirements

    A volunteer who opens any /admin page gets a "not allowed" page, checked on the
    server.
    Each admin role sees exactly what the permissions matrix allows, tested for every role.
    Admins must use two-factor sign-in; sessions in the admin section end after 30
    minutes idle.
Application
    The form has three steps with a progress bar, and saved progress survives closing the
    browser.
    Every consent box records the exact text version agreed to and a timestamp.
    An applicant under 18 cannot submit until a parent or guardian confirms through their
    own email or phone code.
    The applicant gets the "application received" email within a minute.
    The application status on the dashboard matches what the admin set, at every stage.
Admin review
    The queue lists pending applications oldest first, filterable by state and programme.
    Approve, reject and "needs more info" each work from the queue and send the right
    email.
    The database refuses to approve an under-18 applicant without a verified guardian
    consent record.
    Every decision is written to the audit log with the admin's name and time.
Volunteer dashboard
    Shows status, upcoming sign-ups, total approved hours and certificates.
    A volunteer can edit their profile, download their data, and withdraw consent or delete
    their account.
    Withdrawing consent stops all emails and hides the volunteer from the Roll within one
    minute.
Opportunities and sign-ups
    Admins can create an opportunity with slots, location, date, skills and deadline.
    Volunteers sign up in one tap; sign-up closes when slots are full or the deadline passes.
    Cancelling frees the slot immediately.
Attendance and hours
    A coordinator can mark attendance from the sign-up list on a phone.
    Volunteers can submit hours for remote work; they stay "pending" until an admin
    approves.

                                                                                                                                                                                                                                          Page 25 of 38
Devatop Volunteers Platform -- Feature Requirements

    Only approved hours count toward totals, certificates and reports.
    Admins can approve a batch of hours in one action.

Certificates
    A certificate PDF shows name, role, approved hours, dates and a unique code with a
    QR.
    Scanning the QR opens a public verify page showing the certificate is genuine, with no
    other personal data.
    A certificate cannot be issued for hours that are not approved.

Emails, reports and exports
    All seven emails in the copy section below send from a Devatop address and render on
    a phone.
    The overview dashboard numbers match the database.
    Exports produce Excel and CSV; personal-data exports are Super Admin only and
    logged.

Ownership, security and speed

    All accounts are under an official Devatop email, with at least two Super Admins.
    A daily database backup runs, and a restore has been tested once.
    The public homepage loads in under 3 seconds on a throttled 3G connection on a mid-
    range Android phone.
    No personal data appears in URLs, logs or error messages.
    With reduced motion turned on, no animation runs and the normal cursor is used.
Departments and guides

    A Super Admin can add, rename, merge, archive and restore a department with no code
    change, and each action shows how many volunteers it affects.
    Archiving or merging keeps every volunteer's hours and certificates intact; a
    department with history can never be hard-deleted.
    The application form and filters show only active departments, read from the
    database.
    A Department Lead sees only their department's volunteers, calls and hours.
    The public About page, the volunteer Start here checklist and the admin Start here
    checklist all exist and are editable in the admin section.
    Guides show only to their audience, and search returns only guides the person may
    see.
    Reading the code of conduct and safeguarding guide is recorded, and Start here is not
    complete until both are read.

                                                                                                                                                                                                                                          Page 26 of 38
Devatop Volunteers Platform -- Feature Requirements

The five developer docs in section 19 exist in the repository before launch.

CLAUDE.md

Save this as CLAUDE.md in the root of the repository. Claude Code reads it at the start of
every session.

# Devatop Volunteers Platform

Volunteer platform for Devatop Centre for Africa Development, at
volunteer.devatop.org.
Three areas: public site, volunteer portal, admin section.
Source of truth for features: docs/requirements.md. If this file and that one
disagree, ask.

## Stack
- Next.js 16 (App Router), TypeScript strict mode
- Tailwind CSS + shadcn/ui, theme in src/app/globals.css
- PostgreSQL on Supabase, Drizzle ORM, migrations in src/lib/db/migrations
- Supabase Auth (email or phone one-time code)
- React Hook Form + Zod; schemas in src/lib/validation, shared by forms and
server
- Brevo for email, @react-pdf/renderer + qrcode for certificates
- GSAP (ScrollTrigger, SplitText, DrawSVG) + @gsap/react, Lenis: public site
only
- Vitest (unit), Playwright (end-to-end), Sentry (errors)

## Commands             run locally
- pnpm dev              unit tests
- pnpm test             Playwright tests
- pnpm test:e2e         create a migration from schema changes
- pnpm db:generate      apply migrations
- pnpm db:migrate    typecheck must pass before every commit
- pnpm lint && pnpm

## Structure

- src/app/(public)     home, opportunities, programmes, events, faqs, about,

guides, apply, verify

- src/app/(volunteer) dashboard, my-opportunities, hours, certificates,

guides, departments, profile

- src/app/(admin)/admin overview, applications, volunteers, opportunities,

attendance,

                       hours, certificates, messages, departments, guides,

reports, settings

- src/lib/permissions.ts the only place access rules live

                                                                              Page 27 of 38
Devatop Volunteers Platform -- Feature Requirements

  ## Rules that must never be broken
  1. Every admin page and server action calls can(admin, action, record) from

        src/lib/permissions.ts. Checks run on the server. Hiding a button is not a
  check.
  2. Programme and state scope is applied in the database query, not after
  loading.
  3. Volunteers can only read and change their own records.
  4. Every admin write adds a row to audit_logs.
  5. No personal data (names, phones, emails, dates of birth) in URLs, logs or
  error messages.
  6. An under-18 volunteer cannot be approved without a verified
  guardian_consents row.

        Enforce this in the database too, not only in code.
  7. Only approved hours count toward totals, certificates and reports.
  8. Every consent stores the text version and a timestamp.
  9. Never use photos of identifiable children or survivors in seed data or UI.
  10. Departments are rows in the departments table. Never hard-code department
  names;

          archive or merge instead of deleting, so hours and certificates are never
  lost.

  ## Design rules
  - Follow section 16 of docs/requirements.md and the tokens in globals.css.
  - Fonts: Big Shoulders Display (display), Fraunces Italic (one accent word),

      Atkinson Hyperlegible Next (body). Never Inter, Roboto, Arial or Poppins.
  - Colours: Talkam Orange #F05023 dominant, Ink #16130F, Newsprint #F2EDE3,

      Stamp Green #0B6E4F for status only. No gradients, glows, glass cards or
  heavy shadows.
  - Text on orange is Ink. White on orange only at 24px bold and above.
  - Motion and the custom cursor on the public site only. Respect prefers-
  reduced-motion

      and pointer: coarse (no custom cursor on touch). No motion in the admin
  section.
  - Mobile first. Test every page at 375px wide.

  ## How to work
  - One feature per branch, in the order in section 15 of docs/requirements.md.
  - Write the tests from the acceptance criteria in section 17 before calling a
  feature done.
  - Show the database schema for review before building pages on it.
  - Never commit secrets. Environment variables go in .env.local (not
  committed);

      list every new one in .env.example.
  - When unsure about a product decision, ask instead of guessing.

                                                                                                                                                                                                                                          Page 28 of 38
Devatop Volunteers Platform -- Feature Requirements

Design tokens

These files turn section 16 into code, so every page uses the same colours, fonts, sizes and
motion. Alert Red is new here: it is for form errors and rejected status only.
src/app/globals.css (Tailwind CSS v4)

@import "tailwindcss";

@theme {

/* Colour */

--color-orange: #F05023;                             /* Talkam Orange, dominant */

--color-ink: #16130F;                                /* all text, borders, rules */

--color-paper: #F2EDE3;                              /* Newsprint background */

--color-stamp: #0B6E4F;                              /* approved, verified: status only */

--color-alert: #B42318;                              /* errors, rejected: status only */

--color-rule: rgb(22 19 15 / 0.18);

/* Fonts (variables come from next/font in layout.tsx) */
--font-display: var(--font-big-shoulders), Impact, sans-serif;
--font-accent: var(--font-fraunces), Georgia, serif;
--font-body: var(--font-atkinson), system-ui, sans-serif;

/* Type scale: fluid, mobile to desktop */
--text-hero: clamp(5rem, 22vw, 18rem);
--text-display: clamp(2.75rem, 8vw, 7rem);
--text-title: clamp(1.75rem, 4vw, 3rem);
--text-lead: clamp(1.125rem, 1.6vw, 1.375rem);

   /* Shape and motion */
   --radius-sm: 2px;
   --ease-ink: cubic-bezier(0.22, 1, 0.36, 1);
}

@layer base {
   html { background: var(--color-paper); color: var(--color-ink); }
   body { font-family: var(--font-body); font-size: 1.0625rem; line-height:

1.55; }
   h1, h2, .display { font-family: var(--font-display); font-weight: 900;
       text-transform: uppercase; line-height: 0.88; letter-spacing: -0.01em; }
   em.accent { font-family: var(--font-accent); font-style: italic;
       color: var(--color-orange); text-transform: none; }
   hr, .rule { border: 0; border-top: 1px solid var(--color-ink); }
   :focus-visible { outline: 3px solid var(--color-orange); outline-offset:

2px; }
}

                                                                                            Page 29 of 38
Devatop Volunteers Platform -- Feature Requirements

/* Faint newsprint grain, public site only */
.grain { background-image: url("/textures/grain.svg"); background-size:
240px; }

@media (prefers-reduced-motion: reduce) {            !important;  transition:  none
   *, *::before, *::after { animation: none

!important; }
}

src/app/layout.tsx (fonts)

import { Big_Shoulders_Display, Fraunces, Atkinson_Hyperlegible_Next } from
"next/font/google";

const display = Big_Shoulders_Display({ subsets: ["latin"], weight: ["900"],
variable: "--font-big-shoulders" });
const accent = Fraunces({ subsets: ["latin"], style: ["italic"], weight:
["600"], variable: "--font-fraunces" });
const body = Atkinson_Hyperlegible_Next({ subsets: ["latin"], weight: ["400",
"700"], variable: "--font-atkinson" });

export default function RootLayout({ children }: { children: React.ReactNode
}) {

   return (
       <html lang="en" className={`${display.variable} ${accent.variable}

${body.variable}`}>
          <body>{children}</body>

       </html>
   );
}

If next/font names a font slightly differently (Google sometimes renames families), use
the name it suggests; the fonts stay the same.

src/lib/motion.ts (one place for motion settings)

export const EASE = "power3.out";                    // GSAP match for --ease-ink

export const DURATION = { fast: 0.4, base: 0.7, slow: 1.2 };

export const STAGGER = 0.06;                         // between letters or rows

export const prefersReducedMotion = () =>

typeof window !== "undefined" && window.matchMedia("(prefers-reduced-

motion: reduce)").matches;

export const hasFinePointer = () =>

typeof window !== "undefined" && window.matchMedia("(pointer:

fine)").matches;

                                                                                     Page 30 of 38
Devatop Volunteers Platform -- Feature Requirements

Copy

The voice is direct, warm and a little bold, with light Pidgin where it feels natural. Words in
[square brackets] are filled in by the system; anything marked (confirm) is a fact Devatop
must check before launch.

Key page text

Where                    Text
Homepage kicker
Homepage hero            Volunteers are known by
Homepage line
Homepage intro           ACTION

Apply button             Show up for someone.
Apply step 1
Apply step 2             Join the young people fighting human trafficking,
Apply step 3             gender-based violence and other abuses across
Application sent         Nigeria. Bring your time, your skill, your voice.
Approval screen
Approval screen button   Become a volunteer
Calls to action, empty
My hours, empty          Who are you?
Certificate verify page
                         What can your hands do?
Not allowed page
                         Can we count on you? (consent and code of
                         conduct)

                         Done. We have your application, [first name]. We'll
                         reply within [7 days] (confirm).

                         YOU'RE IN, [FIRST NAME]. Welcome to the
                         movement.

                         Share on WhatsApp

                         No open calls right now. New ones drop often, so
                         check back, or turn on alerts.

                         Your record starts with your first action. Find a call
                         to action.

                         This certificate is genuine. Issued by Devatop
                         Centre for Africa Development to [name] for
                         [hours] hours of volunteering, [start date] to [end
                         date].

                         This page is not for your account. Go back to your
                         dashboard.

                                                                                 Page 31 of 38
Devatop Volunteers Platform -- Feature Requirements

Where   Text
Footer  If you see am, Talkam.

Emails

All emails come from a Devatop address, start with the volunteer's first name, and stay
short enough to read on a phone.

1. Application received
        Subject: We got your application, [first name]
        Body: Thank you for stepping up. Our team will review your application and reply
        within [7 days] (confirm). You can check your status any time: [dashboard link].
        Volunteers are known by action. Yours starts soon.

2. Guardian consent request (applicant under 18)
        Subject: [Applicant first name] wants to volunteer with Devatop
        Body: [Applicant first name] has applied to volunteer with Devatop Centre for
        Africa Development, a youth-led organisation working against human trafficking
        and abuse. Because they are under 18, we need your permission first. See what
        they'll do and how we keep young volunteers safe, then give or refuse consent:
        [consent link]. This link works for 7 days. If you did not expect this email, you can
        ignore it.

3. Needs more information
        Subject: One more thing before we decide, [first name]
        Body: We need a little more from you: [admin's note]. Update your application here:
        [link]. Once you do, it goes straight back to the review queue.

4. Approved
        Subject: You're in, [first name]
        Body: Welcome to the movement. Your next steps: finish orientation and
        safeguarding training, then join the volunteers WhatsApp group: [WhatsApp link].
        After that, pick your first call to action: [link]. We're glad you're here.

5. Not approved
        Subject: About your Devatop application
        Body: Thank you for applying, [first name]. We can't take your application forward
        this time: [short reason, optional]. This is not a no forever. You can apply again from
        [date], and you can still support the work by following Talkam: [link].

6. Activity reminder (sent the day before)
        Subject: Tomorrow: [opportunity title]

                                                     Page 32 of 38
Devatop Volunteers Platform -- Feature Requirements

        Body: You're down for [opportunity title] on [date] at [time], [location]. Your
        contact on the day: [coordinator first name], [phone]. Can't make it? Cancel here so
        someone else can take your place: [link].
7. Thank you and hours approved
        Subject: [hours] hours added to your record
        Body: Thank you for showing up for [opportunity title]. [hours] hours have been
        approved and added to your record. Total so far: [total hours]. See your record:
        [link].

FAQs

Question                                             Answer
Who can volunteer?
                                                     Anyone in Nigeria who shares the cause. If
Is it paid?                                          you're under 18, a parent or guardian must
Can I volunteer online?                              give consent, and the lowest age we accept is
                                                     [age] (confirm).
I'm a corps member or student. Can I get a
letter?                                              No. Volunteering is unpaid. [Transport
How long does approval take?                         support for field activities] (confirm).

What happens to my data?                             Yes. Comms, design, research and tech roles
                                                     are often remote. Filter calls to action by
Will I work with children or survivors?              "Online".
Can I stop volunteering?
                                                     Yes. Your dashboard gives you an hours
                                                     statement and certificate, and you can
                                                     request a letter from there.

                                                     Usually within [7 days] (confirm). Your
                                                     dashboard always shows where your
                                                     application stands.

                                                     We use it only to run the volunteer
                                                     programme. You can download it, correct it or
                                                     delete your account from your dashboard at
                                                     any time. Read the privacy policy: [link].

                                                     Only in specific roles, and only after
                                                     safeguarding training and checks.

                                                     Yes, any time. Set your profile to inactive, or
                                                     delete your account.

                                                     Page 33 of 38
Devatop Volunteers Platform -- Feature Requirements

18. Departments and volunteer roles

Every volunteer belongs to one or more departments, and a Super Admin can add, rename,
merge or archive departments from the admin section without a developer. Departments
are data, never hard-coded, so changing Devatop's structure never needs new code.
Phase 1.

Starting departments (confirm)

These are placeholders until Devatop confirms its real list; all of them can be changed in
the admin section on day one.

Department                                           What volunteers there do
Communications and Media                             Social media, writing, design, photography, video,
                                                     podcast
ICT                                                  Websites, tech support, data, digital safety training
Programmes and Field Outreach                        Community sensitisation, school visits, campaigns
Research and Advocacy                                Research, policy briefs, documentation
Talkam                                               Supporting human rights reporting and response
                                                     through Talkam
AI4Rights                                            Data-rights and AI awareness sessions
Events and Logistics                                 Planning and running events, trainings and
                                                     outreaches
Partnerships and Fundraising                         Donor research, proposals, partner outreach

Volunteer roles inside a department

Role                                                 Can do
Member
                                                     Join the department's calls to action, see its guides
Team Lead                                            and announcements

                                                     Everything a Member can, plus see the
                                                     department's member list, post announcements,
                                                     take attendance and recommend hours for
                                                     approval

                                                                                                            Page 34 of 38
Devatop Volunteers Platform -- Feature Requirements

Role                                                 Can do
Department Lead (admin role)
                                                     Staff or senior volunteer who manages the
                                                     department in the admin section; same powers as a
                                                     State Lead, scoped to the department

A volunteer picks the departments that interest them when applying; the admin who
approves them confirms one or more. Volunteers can ask to join another department from
their profile, and the Department Lead accepts or declines.

Changing departments

Action           What happens                                         Who
Add                                                                   Super Admin
Rename or edit   New department with a name, short description,       Super Admin
Merge            lead and optional icon; appears in the application   Super Admin
Archive          form and filters at once                             Super Admin

Restore          Name, description or lead changes everywhere; old    Super Admin
Delete for good  records follow, nothing breaks                       Super Admin

                 Choose a target department; all members,
                 opportunities, guides and hours history move
                 across; the old one is archived

                 Hidden from the application form and new
                 opportunities; history, hours and certificates stay
                 intact; the admin must first move or release
                 current members

                 Brings an archived department back with its
                 history

                 Only allowed for a department that has never had
                 members or opportunities, so no record is ever lost

Every department change asks for confirmation, shows how many volunteers it affects,
emails the affected volunteers, and is written to the audit log.

Department features across the platform

    Calls to action, guides and announcements can be tagged to a department.
    Volunteers see their department's calls first on their dashboard.
    Reports and exports filter by department.
    Certificates can name the department the volunteer served in.

                                                                                                        Page 35 of 38
Devatop Volunteers Platform -- Feature Requirements

19. About and guides

The platform teaches each person what they need to know: visitors learn who Devatop is,
volunteers learn how to take part, admins learn how to run the programme, and
developers learn how to keep the platform alive. Guides are written and edited by admins
inside the platform, so nobody needs a developer to update them.

Who gets what

Audience        Where they find it                   What it covers                  Phase
Visitors        Public About page                                                    MVP
                                                     Who Devatop is, its story
New volunteers  Start here checklist on the          and focus areas, the            MVP
                dashboard after approval             departments and what
All volunteers                                       each does, how                  MVP
                Guides in the volunteer portal       volunteering works step by
A department's                                       step, code of conduct and       Phase
members         Department guide pages               safeguarding in plain words     2
New admins      Start here checklist in the                                          MVP
                admin section on first login         Orientation, safeguarding
                                                     training, join WhatsApp
                                                     group, read your
                                                     department guide, sign up
                                                     for a first call; ticks itself
                                                     off

                                                     How to sign up, check in,
                                                     log hours, get certificates
                                                     and letters; using Talkam;
                                                     staying safe in the field;
                                                     who to contact

                                                     What the department does,
                                                     current priorities, tools it
                                                     uses, how its Team Lead
                                                     runs things

                                                     Turn on two-factor sign-in,
                                                     read the admin handbook,
                                                     learn their role's limits,
                                                     practise on a test
                                                     application

                                                                                     Page 36 of 38
Devatop Volunteers Platform -- Feature Requirements

Audience    Where they find it                       What it covers              Phase
All admins  Admin handbook                                                       MVP
                                                     Reviewing applications,
Developers  docs/developer/ in the code              running an event,           MVP
            repository, linked from the              approving hours, issuing
            admin handbook for Super                 certificates, managing
            Admins                                   departments, data
                                                     protection duties, what to
                                                     do in a safeguarding
                                                     concern

                                                     Setup, architecture,
                                                     deploying, environment
                                                     variables, backups and
                                                     restore, how to make
                                                     someone an admin, how to
                                                     hand the platform over

How guides work

    Written in the admin section: a simple editor with headings, lists, images and video
    links. Each guide has an audience (public, volunteers, a department, admins), an order,
    a published switch and a "last updated" date.
    Help where you need it: a small "How does this work?" link on key pages (hours,
    certificates, the review queue) opens the matching guide.
    Searchable: one search box across all guides the person is allowed to see.
    Kept current: guides not updated for six months are flagged to the Super Admin.
    Read receipts for must-reads: the code of conduct and safeguarding guide record
    who has read them, and the Start here checklist depends on that.

Developer docs to write first

These live in the repository so they survive any change of staff, which is exactly what
went wrong with the old site.

1. README.md : what the platform is and how to run it locally in under 15 minutes.
2. docs/developer/architecture.md : the three areas, the database, auth, email and

    how they connect.
3. docs/developer/deploy.md : how a change gets from a branch to

    volunteer.devatop.org.
4. docs/developer/runbook.md : backups, restoring from a backup, rotating keys, what

    to do if the site goes down.

                                                                                 Page 37 of 38
Devatop Volunteers Platform -- Feature Requirements

 5. docs/developer/handover.md : every account, who owns it, where logins are kept, and
    the steps to hand over to the next developer.

What changed elsewhere in this document

    Section 4: Department Lead added to the admin roles.
    Section 10: the sitemap now includes About and Guides on the public site, Guides and
    Departments in the volunteer portal, and Departments and Guides in the admin
    section.
    Section 14: four new tables for departments, memberships, guides and reading
    progress.
    Section 15 and CLAUDE.md: new routes, the docs/developer/ folder, and a rule that
    departments are never hard-coded.
    Section 17: permissions for managing departments and guides, and new acceptance
    criteria for both.

Sources

    WildApricot: software to manage volunteers
    Volunteero: 10 key features in volunteer management software
    VolunteerLocal: hours and attendance
    Vome: volunteer hour tracking
    Securiti: overview of Nigeria's Data Protection Act 2023
    Clym: Nigeria Data Protection Act summary
    Devatop Centre for Africa Development: home page
    Devatop: volunteers page
    Next.js support policy
    NGO website case study: breaking the "serious NGO" template
    Pin 1: Voices United nonprofit website, Phenomenon Studio
    Pin 2: charity website design
    Pin 3: DonateX donation page redesign
    GSAP standard licence (free for commercial use)

                                                                                                                                                                                                                                          Page 38 of 38

```

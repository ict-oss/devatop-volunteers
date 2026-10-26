"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "@/components/Photo";
import { ArrowRight, Check } from "@/components/Marks";
import { HEARD, LANGUAGES, SKILLS, STATE_NAMES } from "@/lib/data";
import { CONSENTS } from "@/lib/consent-texts";
import { sendCode, verifyCode } from "@/lib/auth/otp";
import { supabaseBrowser } from "@/lib/auth/supabase-browser";
import { guardianStatusAction, requestGuardianAction, submitApplicationAction } from "@/app/actions/apply";
import { EMPTY_GREQ, KEYS, SEED_APPS, ageOf, newId, nowIso, useLocal, type Application, type Consent, type GuardianReq } from "@/lib/store";
import { useComms } from "@/lib/useComms";

type Draft = {
  step: 1 | 2 | 3; first: string; last: string; phone: string; email: string; state: string; lga: string; dob: string; occupation: string;
  verified: boolean; skills: string[]; departments: string[]; availability: string; languages: string[]; heard: string; nysc: string;
  agree: Record<string, boolean>; gName: string; gContact: string; gSent: boolean; gVerified: boolean; gToken?: string; done?: boolean;
};
const EMPTY: Draft = { step: 1, first: "", last: "", phone: "", email: "", state: "", lga: "", dob: "", occupation: "", verified: false, skills: [], departments: [], availability: "", languages: ["English"], heard: "", nysc: "", agree: {}, gName: "", gContact: "", gSent: false, gVerified: false };

const STEPS = [
  { q: "Who are you?", sub: "Start with the basics. It takes about two minutes." },
  { q: "What can your hands do?", sub: "Tell us your skills and when you are free. We match you to the right calls." },
  { q: "Can we count on you?", sub: "Read, agree, and you are in the queue. Every consent is recorded with the date and time." },
];

export type ApplyProps = {
  /** true once AUTH_ENABLED: talks to the real database. false: the clickable prototype (browser storage, demo codes). */
  real: boolean;
  departments: { id: string; name: string }[];
  minAge: number;
  reviewDays: number;
  /** real mode: this person already has an application (shown unless they have just submitted it on this page) */
  already?: boolean;
};

export function ApplyForm({ real, departments, minAge, reviewDays, already = false }: ApplyProps) {
  const [d, setD, hasDraft] = useLocal<Draft>(KEYS.draft, EMPTY);
  const [, setApps] = useLocal<Application[]>(KEYS.apps, SEED_APPS);
  const [err, setErr] = useState<Record<string, string>>({});
  const [otp, setOtp] = useState(""); const [otpSent, setOtpSent] = useState(false);
  const [gOtp, setGOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [gRefused, setGRefused] = useState(false);
  const [gLink, setGLink] = useState(""); // set when the site does not email the guardian: the applicant passes the link on
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { send } = useComms();
  const [greqs, setGreqs] = useLocal<GuardianReq[]>(KEYS.guardian, EMPTY_GREQ);
  const greq = d.gToken ? greqs.find((g) => g.token === d.gToken) : undefined;
  // the guardian opened their emailed link and gave consent -> same as a verified code
  useEffect(() => { if (greq?.status === "given" && !d.gVerified) setD((p) => ({ ...p, gVerified: true })); }, [greq?.status, d.gVerified, setD]);

  // real mode: if this person already verified their email (signed in), skip the code step
  useEffect(() => {
    if (!real) return;
    supabaseBrowser().auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      setD((p) => ({ ...p, verified: !!email, email: email ?? p.email }));
    });
  }, [real, setD]);

  // real mode: wait for the guardian to answer their emailed link
  useEffect(() => {
    if (!real || !d.gSent || d.gVerified) return;
    const t = setInterval(async () => {
      const r = await guardianStatusAction();
      if (!r.ok) return;
      if (r.data.verified) setD((p) => ({ ...p, gVerified: true }));
      else if (r.data.decision === "refused") setGRefused(true);
    }, 5000);
    return () => clearInterval(t);
  }, [real, d.gSent, d.gVerified, setD]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const toggle = (k: "skills" | "departments" | "languages", v: string) => setD((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));
  const age = ageOf(d.dob);
  const minor = age !== null && age < 18;
  const tooYoung = age !== null && age < minAge;

  const next1 = () => {
    const e: Record<string, string> = {};
    if (!d.first.trim()) e.first = "Your first name, please.";
    if (!d.last.trim()) e.last = "Your last name, please.";
    if (!/^\S+@\S+\.\S+$/.test(d.email)) e.email = "Enter a valid email.";
    if (!/^[0+][\d\s-]{9,14}$/.test(d.phone.trim())) e.phone = "Enter a Nigerian phone number, e.g. 0803 123 4567.";
    if (!d.state) e.state = "Pick your state.";
    if (!d.lga.trim()) e.lga = "Tell us your LGA.";
    if (!d.dob) e.dob = "We need your date of birth.";
    else if (tooYoung) e.dob = `Sorry, the lowest age we accept is ${minAge}.`;
    if (!d.verified) e.otp = "Verify your phone or email with the code first.";
    setErr(e);
    if (!Object.keys(e).length) { set("step", 2); window.scrollTo({ top: 0 }); }
  };
  const next2 = () => {
    const e: Record<string, string> = {};
    if (!d.skills.length) e.skills = "Pick at least one skill.";
    if (!d.departments.length) e.departments = "Pick at least one area that interests you.";
    if (!d.availability) e.availability = "Tell us when you are usually free.";
    setErr(e);
    if (!Object.keys(e).length) { set("step", 3); window.scrollTo({ top: 0 }); }
  };
  const sendOtp = async () => {
    if (real) {
      if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) { setErr({ otp: "Enter your email address first." }); return; }
      setBusy(true);
      try { await sendCode({ email: d.email.trim() }); setOtpSent(true); setErr({}); } catch (e) { setErr({ otp: (e as Error).message }); } finally { setBusy(false); }
      return;
    }
    if (!d.email && !d.phone) { setErr({ otp: "Enter your phone or email first." }); return; }
    setOtpSent(true); setErr({});
  };
  const checkOtp = async () => {
    if (real) {
      setBusy(true);
      try { await verifyCode({ email: d.email.trim() }, otp.replace(/\s/g, "")); set("verified", true); setErr({}); } catch (e) { setErr({ otp: (e as Error).message }); } finally { setBusy(false); }
      return;
    }
    if (otp === "123456") { set("verified", true); setErr({}); } else setErr({ otp: "That code isn't right. Try again." });
  };
  /** What the server receives. The wording of each consent and the email address come from the server, not from here. */
  const payload = () => ({
    first: d.first.trim(), last: d.last.trim(), phone: d.phone.trim(), state: d.state, lga: d.lga.trim(), dob: d.dob,
    occupation: d.occupation.trim(), nysc: d.nysc.trim(), skills: d.skills, departmentIds: d.departments, availability: d.availability,
    languages: d.languages, heard: d.heard, consents: CONSENTS.filter((c) => d.agree[c.key]).map((c) => c.key),
  });
  const submit = async () => {
    const e: Record<string, string> = {};
    CONSENTS.filter((c) => c.required && !d.agree[c.key]).forEach((c) => (e[c.key] = "Required to continue."));
    if (minor && !d.gVerified) e.guardian = "A parent or guardian must confirm before you can submit.";
    setErr(e);
    if (Object.keys(e).length) return;
    if (real) {
      setBusy(true);
      const r = await submitApplicationAction(payload());
      setBusy(false);
      if (r.ok) { setD((p) => ({ ...p, done: true })); window.scrollTo({ top: 0 }); return; }
      if (r.code === "signed_out") set("verified", false);
      setErr({ submit: r.message, ...(r.fields ?? {}) });
      return;
    }
    const at = nowIso();
    const consents: Consent[] = CONSENTS.filter((c) => d.agree[c.key]).map((c) => ({ key: c.key, text: c.text, version: c.version, at }));
    const app: Application = {
      id: newId(), mine: true, first: d.first.trim(), last: d.last.trim(), email: d.email.trim(), phone: d.phone.trim(), state: d.state, lga: d.lga.trim(), dob: d.dob,
      occupation: d.occupation.trim() || "—", skills: d.skills, departments: d.departments, availability: d.availability, languages: d.languages, heard: d.heard || "—", nysc: d.nysc || undefined,
      stage: "Submitted", submittedAt: at, consents,
      guardian: minor ? { name: d.gName, contact: d.gContact, verified: true, at } : undefined,
    };
    setApps((p) => [...p.filter((a) => !a.mine), app]);
    send("received", app.email, app.first, { first_name: app.first });
    setD((p) => ({ ...p, done: true }));
  };
  const sendGuardianReal = async () => {
    setBusy(true); setErr({});
    const r = await requestGuardianAction({ application: payload(), guardian: { name: d.gName, email: d.gContact } });
    setBusy(false);
    if (r.ok) { setGRefused(false); setGLink(r.data.link ?? ""); setD((p) => ({ ...p, gSent: true })); } else setErr({ guardian: r.message });
  };
  const sendGuardian = () => {
    const token = newId() + newId();
    setGreqs((p) => [...p, { token, applicantFirst: d.first.trim(), guardianName: d.gName.trim(), contact: d.gContact.trim(), status: "pending", at: nowIso() }]);
    send("guardian", d.gContact.trim(), d.gName.trim(), { applicant_first_name: d.first.trim(), consent_link: `${location.origin}/guardian-consent/${token}` });
    setD((p) => ({ ...p, gSent: true, gToken: token }));
  };
  const reset = () => { setD(EMPTY); setErr({}); setOtp(""); setOtpSent(false); };

  if (!mounted) return <div className="min-h-[70vh]" />;

  if (real && already && !d.done) {
    return (
      <div className="mx-auto max-w-2xl px-4 md:px-8 py-16 min-h-[60vh]">
        <h1 className="text-[length:var(--text-display)]">You have already <em className="accent">applied.</em></h1>
        <p className="mt-4 text-[length:var(--text-lead)]">Your application is in. Your dashboard shows where it stands and what happens next.</p>
        <Link href="/dashboard" className="btn mt-6">See my status</Link>
      </div>
    );
  }

  if (d.done) {
    return (
      <div className="grid md:grid-cols-2 min-h-[75vh]">
        <div className="bg-orange px-6 md:px-12 py-16 flex flex-col justify-between">
          <span className="stamp inline-flex items-center gap-2 text-base self-start"><Check className="w-5 h-5" /> Received</span>
          <h1 className="text-[clamp(2.75rem,6.2vw,6.5rem)] mt-10 break-words">Done. We have your application, <span className="underline decoration-4 underline-offset-8">{d.first}.</span></h1>
        </div>
        <div className="px-6 md:px-12 py-16 grid content-center gap-6">
          <p className="text-[length:var(--text-lead)] max-w-lg">We&apos;ll reply within {reviewDays} days. A confirmation email is on its way to <b>{d.email}</b>. You can check where your application stands any time.</p>
          <div className="flex gap-3 flex-wrap"><Link href="/dashboard" className="btn text-lg" data-cursor="Open">See my status <ArrowRight /></Link><Link href="/opportunities" className="btn btn-ghost text-lg">Browse calls</Link></div>
          {!real && <button className="text-sm underline text-left" onClick={reset}>Start a new application (prototype)</button>}
        </div>
      </div>
    );
  }

  const s = STEPS[d.step - 1];
  const E = (k: string) => (err[k] ? <p className="err" role="alert">{err[k]}</p> : null);

  return (
    <div className="apply-grid md:min-h-[calc(100vh-4rem)]">
      {/* LEFT: orange, one big question per step */}
      <aside className="bg-orange px-6 md:px-10 py-10 md:py-14 flex flex-col justify-between gap-10 md:sticky md:top-0 md:h-[calc(100vh-4rem)]" aria-label="Progress">
        <div>
          <div className="flex items-center justify-between font-bold">
            <span>Step {d.step} of 3</span>
            {hasDraft && d.step > 1 || d.first ? <span className="text-sm">Progress saved on this device</span> : null}
          </div>
          <div className="mt-3 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={d.step} aria-label="Application progress">
            {[1, 2, 3].map((n) => <div key={n} className={`h-3 flex-1 border-2 border-ink ${n <= d.step ? "bg-ink" : ""}`} />)}
          </div>
          <div className="mt-2 flex justify-between text-sm font-bold"><span>About you</span><span>Skills &amp; availability</span><span>Consent</span></div>
        </div>
        <div>
          <h1 className="text-[clamp(3.2rem,8vw,7.5rem)]" key={d.step}>{s.q}</h1>
          <p className="mt-5 max-w-sm text-[length:var(--text-lead)]">{s.sub}</p>
        </div>
        <div className="hidden md:block"><Photo slot="apply-side" className="w-40 border-2 border-ink" ratio="4/5" /></div>
      </aside>

      {/* RIGHT: the form, on newsprint */}
      <section className="px-5 md:px-12 py-10 md:py-14 max-w-3xl" data-native>
        {d.step === 1 && (
          <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); next1(); }} noValidate>
            <div className="grid sm:grid-cols-2 gap-5">
              <div><label className="label" htmlFor="first">First name</label><input id="first" className="input" autoComplete="given-name" value={d.first} onChange={(e) => set("first", e.target.value)} aria-invalid={!!err.first} />{E("first")}</div>
              <div><label className="label" htmlFor="last">Last name</label><input id="last" className="input" autoComplete="family-name" value={d.last} onChange={(e) => set("last", e.target.value)} aria-invalid={!!err.last} />{E("last")}</div>
            </div>
            <div><label className="label" htmlFor="phone">Phone</label><input id="phone" className="input" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" value={d.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!err.phone} /><span className="why">Why: to confirm it&apos;s really you and to reach you on activity days. Only admins who manage your state or programme see it.</span>{E("phone")}</div>
            <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" className="input" autoComplete="email" disabled={real && d.verified} value={d.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!err.email} /><span className="why">Why: we send your application updates here. We never share it.</span>{E("email")}</div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div><label className="label" htmlFor="state">State</label><select id="state" className="input" value={d.state} onChange={(e) => set("state", e.target.value)} aria-invalid={!!err.state}><option value="">Choose…</option>{STATE_NAMES.map((n) => <option key={n}>{n}</option>)}</select>{E("state")}</div>
              <div><label className="label" htmlFor="lga">LGA</label><input id="lga" className="input" value={d.lga} onChange={(e) => set("lga", e.target.value)} aria-invalid={!!err.lga} /><span className="why">Why: so we can place you near activities.</span>{E("lga")}</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div><label className="label" htmlFor="dob">Date of birth</label><input id="dob" type="date" className="input" max={new Date().toISOString().slice(0, 10)} value={d.dob} onChange={(e) => set("dob", e.target.value)} aria-invalid={!!err.dob} /><span className="why">Why: we need to know if you&apos;re under 18, because then a parent or guardian must agree. Only senior admins see it.</span>{E("dob")}
                {minor && !tooYoung && <p className="mt-2 font-bold text-sm border-l-4 border-orange pl-3">You&apos;re under 18, so a parent or guardian will confirm in step 3. Nothing to do yet.</p>}</div>
              <div><label className="label" htmlFor="occ">Occupation <span className="font-normal">(optional)</span></label><input id="occ" className="input" placeholder="Student, designer, NYSC…" value={d.occupation} onChange={(e) => set("occupation", e.target.value)} /></div>
            </div>

            {/* OTP: blocks fake sign-ups */}
            <div className="border-2 border-ink p-4 grid gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div><b>Verify it&apos;s you</b><span className="why">{real ? "We email a 6-digit code to the address above. Stops fake sign-ups." : "We send a 6-digit code to your phone or email. Stops fake sign-ups."}</span></div>
                {d.verified ? <span className="stamp stamp-ok inline-flex items-center gap-1"><Check className="w-4 h-4" /> Verified</span> :
                  <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={sendOtp}>Send code</button>}
              </div>
              {otpSent && !d.verified && (
                <div className="flex gap-2 items-start flex-wrap">
                  <input className="input max-w-44" inputMode="numeric" maxLength={6} placeholder="123456" aria-label="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} />
                  <button type="button" className="btn btn-sm btn-ink" disabled={busy} onClick={checkOtp}>Check code</button>
                  <p className="why w-full">{real ? <>We sent a 6-digit code to <b>{d.email}</b>. Check your spam folder if you can&apos;t see it.</> : <>Prototype: no message is sent. Use the demo code <b>123456</b>.</>}</p>
                </div>
              )}
              {E("otp")}
            </div>
            <div className="flex items-center justify-between gap-3 mt-2"><span className="text-sm opacity-70">Progress is saved as you type.</span><button className="btn text-lg" type="submit" data-magnetic>Next <ArrowRight /></button></div>
          </form>
        )}

        {d.step === 2 && (
          <form className="grid gap-7" onSubmit={(e) => { e.preventDefault(); next2(); }} noValidate>
            <fieldset><legend className="label">Your skills</legend><span className="why mb-2">Pick all that fit. We use this to suggest the right calls.</span>
              <div className="flex flex-wrap gap-2 mt-2">{SKILLS.map((k) => <button type="button" key={k} className="chip" aria-pressed={d.skills.includes(k)} onClick={() => toggle("skills", k)}>{k}</button>)}</div>{E("skills")}</fieldset>
            <fieldset><legend className="label">Where would you like to help?</legend><span className="why mb-2">Pick the areas that interest you. An admin confirms where you start.</span>
              <div className="flex flex-wrap gap-2 mt-2">{departments.map((x) => <button type="button" key={x.id} className="chip" aria-pressed={d.departments.includes(x.id)} onClick={() => toggle("departments", x.id)}>{x.name}</button>)}</div>{E("departments")}</fieldset>
            <fieldset><legend className="label">When are you usually free?</legend>
              <div className="flex flex-wrap gap-2 mt-2">{["Weekdays", "Weekday evenings", "Weekends", "Flexible", "Only remote"].map((k) => <button type="button" key={k} className="chip" aria-pressed={d.availability === k} onClick={() => set("availability", k)}>{k}</button>)}</div>{E("availability")}</fieldset>
            <fieldset><legend className="label">Languages you speak</legend>
              <div className="flex flex-wrap gap-2 mt-2">{LANGUAGES.map((k) => <button type="button" key={k} className="chip" aria-pressed={d.languages.includes(k)} onClick={() => toggle("languages", k)}>{k}</button>)}</div></fieldset>
            <div className="grid sm:grid-cols-2 gap-5">
              <div><label className="label" htmlFor="heard">How did you hear about Devatop?</label><select id="heard" className="input" value={d.heard} onChange={(e) => set("heard", e.target.value)}><option value="">Choose…</option>{HEARD.map((h) => <option key={h}>{h}</option>)}</select></div>
              <div><label className="label" htmlFor="nysc">NYSC state code <span className="font-normal">(optional)</span></label><input id="nysc" className="input" placeholder="LA/26A/1234" value={d.nysc} onChange={(e) => set("nysc", e.target.value)} /><span className="why">Why: for corps members who need a logbook letter.</span></div>
            </div>
            <div className="flex items-center justify-between gap-3"><button type="button" className="btn btn-ghost" onClick={() => set("step", 1)}>Back</button><button className="btn text-lg" type="submit" data-magnetic>Next <ArrowRight /></button></div>
          </form>
        )}

        {d.step === 3 && (
          <form className="grid gap-6" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
            <p className="font-bold">Why we ask: Devatop works with children and trafficking survivors. We must prove you agreed, so each tick is stored with the exact wording and a timestamp.</p>
            {CONSENTS.map((c) => (
              <div key={c.key} className="border-t border-ink pt-4">
                <label className="flex gap-4 items-start cursor-pointer min-h-12">
                  <input type="checkbox" className="mt-1 size-7 accent-[#16130F] shrink-0" checked={!!d.agree[c.key]} onChange={(e) => setD((p) => ({ ...p, agree: { ...p.agree, [c.key]: e.target.checked } }))} aria-invalid={!!err[c.key]} />
                  <span>{c.text}{!c.required && <span className="why">You can say no and still volunteer.</span>}</span>
                </label>
                {E(c.key)}
              </div>
            ))}
            {minor && (
              <div className="border-2 border-ink p-4 grid gap-4 bg-orange/15">
                <b className="text-lg">Parent or guardian consent</b>
                <span className="why -mt-3">You&apos;re under 18. A parent or guardian confirms through their own email or phone before we review your application.</span>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className="label" htmlFor="gn">Their name</label><input id="gn" className="input" value={d.gName} onChange={(e) => set("gName", e.target.value)} /></div>
                  <div><label className="label" htmlFor="gc">{real ? "Their email" : "Their email or phone"}</label><input id="gc" className="input" type={real ? "email" : "text"} value={d.gContact} onChange={(e) => set("gContact", e.target.value)} /></div>
                </div>
                {d.gVerified ? <span className="stamp stamp-ok inline-flex items-center gap-1 self-start"><Check className="w-4 h-4" /> Guardian confirmed</span> : (
                  real ? (
                    <div className="flex gap-2 flex-wrap items-start">
                      <button type="button" className="btn btn-sm btn-ghost" disabled={busy || !d.gName.trim() || !/^\S+@\S+\.\S+$/.test(d.gContact.trim())} onClick={sendGuardianReal}>{d.gSent ? "Get a new link" : "Send the link to my guardian"}</button>
                      {d.gSent && <p className="why w-full">{gRefused ? <b className="text-alert">Your guardian declined. You can&apos;t submit this application.</b> : gLink ? <>Send this link to <b>{d.gName}</b> yourself, by WhatsApp or text. It works once for 7 days, and this page updates by itself when they answer.</> : <>We emailed <b>{d.gContact}</b>. This page updates by itself when they answer. The link works for 7 days.</>}</p>}
                      {d.gSent && gLink && !gRefused && (
                        <div className="w-full grid gap-2">
                          <input className="input" readOnly value={gLink} aria-label="Link for your parent or guardian" onFocus={(e) => e.currentTarget.select()} />
                          <div className="flex gap-2 flex-wrap">
                            <button type="button" className="btn btn-sm btn-ghost" onClick={() => navigator.clipboard?.writeText(gLink)}>Copy the link</button>
                            <a className="btn btn-sm btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Hello, I am applying to volunteer with Devatop and I need your permission because I am under 18. Please open this link: ${gLink}`)}`}>Send on WhatsApp</a>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                  <div className="flex gap-2 flex-wrap items-start">
                    <button type="button" className="btn btn-sm btn-ghost" disabled={!d.gName.trim() || !d.gContact.trim()} onClick={sendGuardian}>Send them a code</button>
                    {d.gSent && <><input className="input max-w-44" inputMode="numeric" maxLength={6} placeholder="654321" aria-label="Guardian code" value={gOtp} onChange={(e) => setGOtp(e.target.value)} />
                      <button type="button" className="btn btn-sm btn-ink" onClick={() => { if (gOtp === "654321") set("gVerified", true); else setErr({ guardian: "That code isn't right." }); }}>Confirm</button>
                      <p className="why w-full">{greq?.status === "refused" ? <b className="text-alert">Your guardian declined. You can't submit this application.</b> : <>Waiting for your guardian to open the link we emailed. (Prototype: you can also use demo code <b>654321</b>.)</>}</p></>}
                  </div>
                  )
                )}
                {E("guardian")}
              </div>
            )}
            {err.submit && <p className="err" role="alert">{err.submit}</p>}
            <div className="flex items-center justify-between gap-3 mt-2"><button type="button" className="btn btn-ghost" onClick={() => set("step", 2)}>Back</button><button className="btn text-lg" type="submit" disabled={busy} data-magnetic>{busy ? "Sending…" : <>Send my application <ArrowRight /></>}</button></div>
          </form>
        )}
      </section>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { Check, Tally } from "@/components/Marks";
import { Photo, usePhoto } from "@/components/Photo";
import { REVIEW_DAYS, fmtDate } from "@/lib/data";
import { useOpps, useSignups } from "@/lib/useOpps";
import { useLive } from "@/lib/live";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { replyNeedsInfoAction } from "@/app/actions/apply";
import { KEYS, STAGES, useLocal, type Stage } from "@/lib/store";
import { CERT_CODE, useMe } from "@/lib/useMe";
import { prefersReducedMotion } from "@/lib/motion";
import { photoSrc } from "@/lib/images";
import { useComms } from "@/lib/useComms";
import { isGroupLink } from "@/lib/emails";

const nextText = (days: number): Record<Stage, string> => ({
  Submitted: `We have your application. A coordinator will start reviewing it within ${days} days.`,
  "Under review": "A coordinator is reading your application right now. Nothing for you to do.",
  Interview: "We'd like a short chat. Watch your email and WhatsApp for a time.",
  "Needs info": "We need a little more from you. Read the note and update your application.",
  Approved: "You're in. Finish the steps below, then pick your first call.",
  Rejected: "We can't take your application forward this time. This is not a no forever.",
});
const EMPTY_READ: Record<string, boolean> = {};
const MILESTONES = [[1, "First action"], [10, "10 hours"], [50, "50 hours"], [100, "100 hours"]] as const;

export default function Dashboard() {
  const { me, approved, pending, myHours, loadDemo, real } = useMe();
  const live = useLive();
  const router = useRouter();
  const [reply, setReply] = useState(""); const [replyMsg, setReplyMsg] = useState(""); const [replying, setReplying] = useState(false);
  const sendReply = async () => { setReplying(true); const r = await replyNeedsInfoAction(reply); setReplying(false); if (r.ok) { setReply(""); router.refresh(); } else setReplyMsg(r.message); };
  const { settings, announcements } = useComms();
  const { ids: signups } = useSignups();
  const [read] = useLocal<Record<string, boolean>>(KEYS.read, EMPTY_READ);
  const hasPhoto = usePhoto("profile-me");
  const stamp = useRef<HTMLDivElement>(null);
  const { opps } = useOpps();
  const mine = useMemo(() => opps.filter((o) => signups.includes(o.id)), [opps, signups]);

  useEffect(() => {
    if (me?.stage !== "Approved" || !stamp.current || prefersReducedMotion()) return;
    const t = gsap.fromTo(stamp.current, { scale: 1.6, opacity: 0, rotate: -12 }, { scale: 1, opacity: 1, rotate: -6, duration: 0.5, ease: "power3.out", delay: 0.3 });
    return () => { t.kill(); };
  }, [me?.stage]);

  if (!me) {
    return (
      <div className="grid md:grid-cols-12 gap-10 py-6">
        <div className="md:col-span-8">
          <h1 className="text-[length:var(--text-display)]">Your record starts with your first <em className="accent">action.</em></h1>
          <p className="mt-6 text-[length:var(--text-lead)] max-w-xl">You don&apos;t have an application yet. It takes five minutes, in three steps.</p>
          <div className="mt-8 flex gap-3 flex-wrap"><Link href="/apply" className="btn text-lg">Become a volunteer</Link><Link href="/opportunities" className="btn btn-ghost text-lg">Find a call to action</Link></div>
        </div>
        <div className="md:col-span-4 border-2 border-dashed border-ink p-5 self-start">
          {real ? (<><b>Not applied yet?</b><p className="text-sm mt-1">Your dashboard shows your application status, hours and certificates as soon as you apply.</p></>) : (<>
          <b>Prototype shortcut</b>
          <p className="text-sm mt-1">Skip the queue and see the dashboard of an approved volunteer with some hours.</p>
          <button className="btn btn-sm btn-ink mt-3" onClick={loadDemo}>Load demo volunteer “Amaka”</button></>)}
        </div>
      </div>
    );
  }

  const stageIdx = me.stage === "Needs info" ? 1 : me.stage === "Rejected" ? 1 : STAGES.indexOf(me.stage);
  const waText = encodeURIComponent(`I'm in. I just joined Devatop as a volunteer. Volunteers are known by action. Join me: https://volunteer.devatop.org`);
  // real mode: every tick comes from a database record (trainings, guide reads, sign-ups); prototype: from browser storage
  const checklist: readonly (readonly [string, boolean])[] = live ? live.startHere.map((i) => [i.label, i.done] as const) : [
    ["Watch the orientation video", false], ["Complete safeguarding training", false], ["Join the volunteers WhatsApp group", false],
    ["Read the Code of Conduct", !!read.conduct], ["Read the Safeguarding guide", !!read.safeguarding], ["Sign up for your first call", mine.length > 0],
  ];
  const done = checklist.filter((c) => c[1]).length;

  return (
    <div className="grid gap-12">
      {/* APPROVAL SCREEN */}
      {me.stage === "Approved" && (
        <section className="relative border-2 border-ink bg-orange overflow-hidden" aria-label="You're in">
          <div className="px-5 md:px-10 pt-8 pb-6 grid md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-9">
              <p className="font-bold uppercase tracking-widest text-sm">Application approved</p>
              <h1 className="mt-2 text-[clamp(3.2rem,12vw,10.5rem)] leading-[0.84]">
                You&apos;re in,{" "}
                <span className="inline-block text-transparent bg-clip-text bg-ink" style={{
                  WebkitBackgroundClip: "text", backgroundImage: hasPhoto ? `url(${photoSrc("profile-me")})` : undefined, backgroundSize: "cover", backgroundPosition: "center",
                  ...(hasPhoto ? {} : { backgroundImage: "repeating-linear-gradient(135deg,#16130F 0 3px,#4a443b 3px 8px)" }),
                }}>{me.first}.</span>
              </h1>
              <p className="mt-4 text-[length:var(--text-lead)]">Welcome to the movement.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a className="btn btn-ink" href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
                {isGroupLink(settings.whatsappGroup) ? <a className="btn btn-ghost" href={settings.whatsappGroup} target="_blank" rel="noreferrer">Join the volunteers WhatsApp group</a> : <span className="btn btn-ghost opacity-60" aria-disabled="true">WhatsApp group link coming soon</span>}
              </div>
              <p className="why mt-3">Your photo shows through your name once you add one in <Link className="underline" href="/profile">Profile</Link> (slot: profile-me).</p>
            </div>
            <div ref={stamp} className="md:col-span-3 justify-self-start md:justify-self-end border-4 border-ink px-4 py-2 rotate-[-6deg] text-center" style={{ color: "#16130F" }}>
              <div className="display text-4xl">Approved</div><div className="text-xs font-bold uppercase tracking-widest">Devatop volunteer</div>
            </div>
          </div>
        </section>
      )}

      {/* STATUS: where it stands + what happens next */}
      <section aria-labelledby="status">
        {me.stage !== "Approved" && <h1 id="status" className="text-[length:var(--text-display)]">Hello, <em className="accent">{me.first}.</em></h1>}
        <div className={me.stage !== "Approved" ? "mt-8" : ""}>
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-3xl md:text-4xl">Application status</h2>
            <span className={`stamp ${me.stage === "Approved" ? "stamp-ok" : me.stage === "Rejected" ? "stamp-bad" : me.stage === "Needs info" ? "stamp-info" : "stamp-wait"}`}>{me.stage}</span></div>
          <ol className="mt-5 grid grid-cols-4 gap-1.5" aria-label="Progress">
            {STAGES.map((s, i) => (
              <li key={s}><div className={`h-3 border-2 border-ink ${i <= stageIdx && me.stage !== "Rejected" ? (me.stage === "Approved" ? "bg-stamp border-stamp" : "bg-ink") : ""}`} /><div className={`mt-1.5 text-xs md:text-sm font-bold ${i === stageIdx ? "" : "opacity-60"}`}>{s}</div></li>
            ))}
          </ol>
          <p className="mt-4 max-w-2xl text-[length:var(--text-lead)]"><b>What happens next:</b> {nextText(live?.reviewDays ?? REVIEW_DAYS)[me.stage]}</p>
          {me.note && <p className="mt-2 border-l-4 border-orange pl-3"><b>Note from the team:</b> {me.note}</p>}
          {real && me.stage === "Needs info" && (
            <div className="mt-4 max-w-2xl border-2 border-ink p-4 grid gap-3">
              <label className="label" htmlFor="reply">Your answer</label>
              <textarea id="reply" className="input" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write what the team asked for" />
              {replyMsg && <p className="err" role="alert">{replyMsg}</p>}
              <button className="btn justify-self-start" disabled={replying || reply.trim().length < 3} onClick={sendReply}>{replying ? "Sending…" : "Send my answer"}</button>
            </div>)}
        </div>
      </section>

      {me.stage === "Approved" && (
        <>
          {/* ANNOUNCEMENTS board */}
          <section className="border-t border-ink pt-6" aria-labelledby="ann">
            <h2 id="ann" className="text-3xl md:text-4xl">Announcements</h2>
            {announcements.length === 0 ? <p className="mt-3">Nothing new. Team updates land here, and in your email.</p> : (
              <ul className="mt-3">{announcements.slice(0, 3).map((a) => (
                <li key={a.id} className="py-3 border-t border-rule"><div className="font-bold text-lg">{a.title}</div><p className="whitespace-pre-line mt-1 max-w-2xl">{a.body}</p>
                  <div className="text-xs opacity-70 mt-1">{a.by} · {new Date(a.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div></li>))}</ul>)}
          </section>

          {/* MY RECORD: tally marks */}
          <section className="border-t border-ink pt-6" aria-labelledby="rec">
            <h2 id="rec" className="text-3xl md:text-4xl">My record</h2>
            <div className="mt-4 grid md:grid-cols-12 gap-6 items-end">
              <div className="md:col-span-4"><div className="display text-[clamp(6rem,16vw,12rem)] leading-[0.8]">{approved}</div><div className="font-bold">approved hours{pending > 0 && <span className="font-normal"> · {pending} waiting for approval</span>}</div></div>
              <div className="md:col-span-8"><Tally hours={approved} className="w-full max-w-xl h-auto text-ink" />
                <div className="mt-4 flex flex-wrap gap-2">{MILESTONES.map(([n, l]) => (
                  <span key={l} className={`stamp ${approved >= n || (n === 1 && myHours.length > 0) ? "stamp-ok" : "opacity-40"}`}>{l}</span>))}</div></div>
            </div>
            {myHours.length === 0 && <p className="mt-4">Your record starts with your first action. <Link className="underline font-bold" href="/opportunities">Find a call to action.</Link></p>}
          </section>

          <div className="grid md:grid-cols-2 gap-12">
            {/* START HERE */}
            <section className="border-t border-ink pt-6" aria-labelledby="sh">
              <div className="flex items-baseline justify-between"><h2 id="sh" className="text-3xl md:text-4xl">Start here</h2><span className="font-bold">{done}/{checklist.length}</span></div>
              <ul className="mt-3">
                {checklist.map(([t, ok]) => (
                  <li key={t} className="flex items-center gap-3 py-3 border-t border-rule min-h-12">
                    <span className={`size-7 border-2 border-ink grid place-items-center shrink-0 ${ok ? "bg-stamp border-stamp text-paper" : ""}`}>{ok && <Check className="w-4 h-4" />}</span>
                    <span className={ok ? "line-through opacity-60" : ""}>{t}</span>
                  </li>))}
              </ul>
              <Link href="/guides" className="underline font-bold text-sm">How does this work? Open the guides</Link>
            </section>

            {/* UPCOMING */}
            <section className="border-t border-ink pt-6" aria-labelledby="up">
              <h2 id="up" className="text-3xl md:text-4xl">Coming up</h2>
              {mine.length === 0 ? (
                <div className="mt-4"><p>No sign-ups yet. Someone specific needs you this week.</p><Link href="/opportunities" className="btn mt-3">Find a call to action</Link></div>
              ) : (
                <ul className="mt-3">{mine.map((o) => (
                  <li key={o.id} className="border-t border-rule py-3"><div className="display text-3xl">{o.title}</div><div className="text-sm">{fmtDate(o.date)} · {o.place}, {o.state}</div>
                    <Link href="/my-opportunities" className="text-sm underline font-bold">Manage or cancel</Link></li>))}</ul>
              )}
            </section>
          </div>

          {(live ? live.certs.length > 0 : approved >= 10) && (
            <section className="border-2 border-ink p-5 flex flex-wrap items-center justify-between gap-4">
              <div><b className="text-lg">Your certificate is ready.</b><p className="text-sm">Anyone can verify it online with code {live ? live.certs[0].code : CERT_CODE}.</p></div>
              <Link href="/certificates" className="btn">See my certificate</Link>
            </section>
          )}
        </>
      )}
      <div className="hidden"><Photo slot="profile-me" /></div>
    </div>
  );
}

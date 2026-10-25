import Link from "next/link";
import { ActionHero } from "@/components/ActionHero";
import { NigeriaMap } from "@/components/NigeriaMap";
import { Photo } from "@/components/Photo";
import { LoopVideo } from "@/components/LoopVideo";
import { InkArrow, ArrowRight } from "@/components/Marks";
import { CallsBoard } from "@/components/CallsBoard";
import { DEPARTMENTS, ROLL, STATE_HOURS, TOTALS, money } from "@/lib/data";
import { STATES } from "@/lib/nigeria-map";

const topStates = Object.entries(STATE_HOURS).sort((a, b) => b[1] - a[1]).slice(0, 5)
  .map(([id, h]) => [STATES.find((s) => s.id === id)?.name ?? id, h] as const);

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative pt-8 md:pt-12">
        <div className="px-4 md:px-8 mx-auto max-w-[1500px]">
          <p className="font-bold text-lg md:text-2xl" style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", fontWeight: 600 }}>Volunteers are known by</p>
        </div>
        <ActionHero />
        <div className="px-4 md:px-8 mx-auto max-w-[1500px] mt-8 md:mt-10 grid md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-6">
            <h1 className="text-[length:var(--text-display)]" data-mask>Show up for <em className="accent">someone.</em></h1>
            <p className="mt-6 text-[length:var(--text-lead)] max-w-xl" data-reveal>
              Join the young people fighting human trafficking, gender-based violence and other abuses across Nigeria. Bring your time, your skill, your voice.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 items-center" data-reveal>
              <Link href="/apply" className="btn text-lg" data-magnetic data-cursor="Join">Become a volunteer <ArrowRight /></Link>
              <Link href="/opportunities" className="btn btn-ghost text-lg" data-cursor="See">See open calls</Link>
            </div>
          </div>
          <div className="md:col-span-5 md:col-start-8 relative">
            <Photo slot="hero-feature" className="w-full" alt="A Devatop volunteer in the field" priority />
            {/* flat newsprint ticket with orange tape, sitting over the corner */}
            <Link href="/apply" className="absolute -left-3 md:-left-14 -bottom-6 bg-paper border-2 border-ink px-5 py-4 rotate-[-2deg] block" data-cursor="Join" data-magnetic>
              <span className="tape -top-3 left-6 rotate-[-4deg]" aria-hidden="true" />
              <span className="block text-xs uppercase tracking-widest font-bold opacity-70">Open ticket</span>
              <span className="display text-3xl md:text-4xl block mt-1">Become a volunteer</span>
              <span className="text-sm font-bold flex items-center gap-1 mt-1">3 steps · 5 minutes <ArrowRight /></span>
            </Link>
            <InkArrow className="hidden md:block absolute -left-44 -bottom-24 w-40 text-ink rotate-[8deg]" />
          </div>
        </div>
      </section>

      {/* IN MOTION: short silent loop (admins can change it later) */}
      <section className="mt-16 md:mt-24 px-4 md:px-8 mx-auto max-w-[1500px]" aria-label="Counting action">
        <LoopVideo slot="loop-tally" label="Tally marks being counted, one after another" className="w-full" />
      </section>

      {/* NUMBERS AS ARCHITECTURE — orange field */}
      <section className="relative mt-24 md:mt-32 text-ink overflow-hidden" aria-label="Impact">
        <div data-wipe className="absolute inset-0 bg-orange" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1500px] px-4 md:px-8 py-14 md:py-20">
          <p className="font-bold uppercase tracking-widest text-sm mb-6">What action adds up to (illustrative numbers)</p>
          {[
            [TOTALS.hours, "hours given"],
            [TOTALS.volunteers, "volunteers"],
            [TOTALS.states, "states reached"],
          ].map(([n, label]) => (
            <div key={label as string} className="border-t border-ink flex items-end justify-between gap-4 py-3 md:py-4">
              <span className="display text-[clamp(5rem,23vw,19rem)] leading-[0.8]" data-count={n as number}>{money(n as number)}</span>
              <span className="display text-[clamp(1.4rem,4vw,3.4rem)] pb-1 text-right">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* THE MAP */}
      <section className="mx-auto max-w-[1500px] px-4 md:px-8 py-20 md:py-28 grid md:grid-cols-12 gap-10 items-start">
        <div className="md:col-span-5 md:sticky md:top-8">
          <h2 className="text-[length:var(--text-display)]" data-mask>Every state is <em className="accent">next.</em></h2>
          <p className="mt-5 text-[length:var(--text-lead)] max-w-md" data-reveal>Orange means Devatop volunteers have already worked there. Point at a state to see the hours. Grey is waiting for you.</p>
          <ol className="mt-8" data-reveal>
            {topStates.map(([name, h], i) => (
              <li key={name} className="flex items-baseline justify-between border-t border-ink py-3">
                <span className="font-bold"><span className="display text-2xl mr-3 opacity-50">{i + 1}</span>{name}</span>
                <span className="display text-3xl">{money(h)} <span className="text-base font-bold" style={{ fontFamily: "var(--font-body)" }}>hrs</span></span>
              </li>
            ))}
            <li className="border-t border-ink" />
          </ol>
          <Link href="/apply" className="btn mt-4" data-magnetic data-cursor="Join">Put your state on the map <ArrowRight /></Link>
        </div>
        <div className="md:col-span-7">
          <NigeriaMap />
        </div>
      </section>

      {/* CALLS TO ACTION BOARD — ink field */}
      <section className="bg-ink text-paper" aria-labelledby="calls">
        <div className="mx-auto max-w-[1500px] px-4 md:px-8 py-16 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
            <h2 id="calls" className="text-[length:var(--text-display)]" data-mask>Someone needs you <em className="accent">this week.</em></h2>
            <Link href="/opportunities" className="btn" data-cursor="See">All open calls <ArrowRight /></Link>
          </div>
          <CallsBoard />
        </div>
      </section>

      {/* HOW IT WORKS — rules, not boxes */}
      <section className="mx-auto max-w-[1500px] px-4 md:px-8 py-20 md:py-28">
        <h2 className="text-[length:var(--text-display)] max-w-4xl" data-mask>Apply once. <em className="accent">Act</em> often. Get counted.</h2>
        <div className="mt-12 grid md:grid-cols-4 gap-x-8">
          {[
            ["01", "Apply", "Three short steps. Progress is saved, so you can finish later."],
            ["02", "Get approved", "We review within 7 days. Your dashboard always shows where you stand."],
            ["03", "Sign up in one tap", "Pick a call. Check in with a QR scan. Remote? Log your hours."],
            ["04", "Get recognised", "Hours, milestones and a certificate anyone can verify online."],
          ].map(([n, t, d]) => (
            <div key={n} className="border-t border-ink pt-4 pb-8" data-reveal>
              <div className="display text-7xl text-orange">{n}</div>
              <h3 className="display text-4xl mt-2">{t}</h3>
              <p className="mt-2 max-w-xs">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHERE YOU FIT — departments from data, never hard-coded */}
      <section className="border-t border-ink">
        <div className="mx-auto max-w-[1500px] px-4 md:px-8 py-16 grid md:grid-cols-12 gap-8">
          <h2 className="md:col-span-4 text-[length:var(--text-title)]" data-mask>What can your <em className="accent">hands</em> do?</h2>
          <ul className="md:col-span-8 grid sm:grid-cols-2 gap-x-8">
            {DEPARTMENTS.filter((d) => d.status === "active").map((d) => (
              <li key={d.id} className="border-t border-rule py-4" data-reveal>
                <div className="display text-3xl">{d.name}</div>
                <p className="text-sm mt-1">{d.blurb}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* STORIES */}
      <section className="mx-auto max-w-[1500px] px-4 md:px-8 py-16 md:py-24">
        <h2 className="text-[length:var(--text-display)]" data-mask>In their <em className="accent">words.</em></h2>
        <div className="mt-10 grid md:grid-cols-3 gap-8">
          {[
            ["story-1", "“I thought one Saturday would not matter. Then a student asked me a question I had not thought about in years.”", "Volunteer, Lagos (example)"],
            ["story-2", "“Talkam gave me the words to say to a neighbour who needed help.”", "Volunteer, Kano (example)"],
            ["story-3", "“I do my part from my phone, two hours a week. It still counts.”", "Remote volunteer (example)"],
          ].map(([slot, q, who]) => (
            <figure key={slot} data-reveal data-cursor="Read">
              <Photo slot={slot} className="w-full" alt="Volunteer portrait" />
              <blockquote className="display text-2xl md:text-3xl mt-4 leading-[1.02]" style={{ textTransform: "none", fontFamily: "var(--font-display)" }}>{q}</blockquote>
              <figcaption className="mt-2 text-sm font-bold">{who}</figcaption>
            </figure>
          ))}
        </div>
        <p className="text-sm mt-6 opacity-70">Quotes are placeholders. Real testimonials need the volunteer's consent on record.</p>
      </section>

      {/* THE ROLL — opt-in names drifting like a ticker */}
      <section className="bg-orange text-ink overflow-hidden border-y border-ink py-6" aria-label="The Roll: volunteers who chose to be listed">
        <div className="px-4 md:px-8 mx-auto max-w-[1500px] mb-2 font-bold uppercase tracking-widest text-sm">The Roll — volunteers who said yes to being listed</div>
        <div className="ticker" data-ticker="70" aria-hidden="true">
          {[...ROLL, ...ROLL].map((n, i) => (
            <span key={i} className="display text-[clamp(3.5rem,10vw,8rem)] whitespace-nowrap pr-10">{n} <span className="opacity-40">/</span></span>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-[1500px] px-4 md:px-8 py-24 md:py-32 text-center md:text-left">
        <h2 className="text-[length:var(--text-hero)] leading-[0.82]" data-mask>Your <em className="accent">turn.</em></h2>
        <Link href="/apply" className="btn text-xl mt-10" data-magnetic data-cursor="Join">Become a volunteer <ArrowRight /></Link>
      </section>
    </>
  );
}

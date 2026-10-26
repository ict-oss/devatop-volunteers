"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "./Marks";
import { useLocal, KEYS } from "@/lib/store";

const NAV = [
  ["Opportunities", "/opportunities"],
  ["About", "/about"],
  ["FAQs", "/faqs"],
  ["Contact", "/contact"],
] as const;

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-baseline gap-2 min-h-11 items-center" aria-label="Devatop Volunteers home" data-cursor="Home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/devatop-mark.png" alt="" width={320} height={254} className={`h-9 w-auto self-center ${light ? "bg-paper p-1" : ""}`} />
      <span className={`display text-[1.9rem] leading-none ${light ? "text-paper" : "text-ink"}`}>Devatop</span>
      <span className="bg-orange text-ink font-bold text-xs px-1.5 py-0.5 uppercase tracking-wider">Volunteers</span>
    </Link>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return (
    <header className="relative z-40 border-b border-ink bg-paper">
      <div className="mx-auto max-w-[1500px] px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <Wordmark />
        <nav aria-label="Main" className="hidden lg:flex items-center gap-5 lg:gap-7 font-bold whitespace-nowrap">
          {NAV.map(([l, h]) => (
            <Link key={h} href={h} className={`py-2 border-b-2 ${path.startsWith(h) ? "border-orange" : "border-transparent hover:border-ink"}`}>{l}</Link>
          ))}
          <Link href="/dashboard" className="py-2 border-b-2 border-transparent hover:border-ink">Log in</Link>
          <Link href="/apply" className="btn btn-sm" data-magnetic data-cursor="Join">Become a volunteer</Link>
        </nav>
        <button className="lg:hidden btn btn-ghost btn-sm" aria-expanded={open} aria-controls="mnav" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Menu"}</button>
      </div>
      {open && (
        <nav id="mnav" aria-label="Mobile" className="lg:hidden absolute inset-x-0 top-16 bg-paper border-b border-ink px-4 pb-4 grid">
          {NAV.map(([l, h]) => <Link key={h} href={h} className="display text-5xl py-3 border-b border-rule">{l}</Link>)}
          <Link href="/dashboard" className="display text-5xl py-3 border-b border-rule">Log in</Link>
        </nav>
      )}
    </header>
  );
}

export function ApplyBar() {
  const path = usePathname();
  if (path.startsWith("/apply")) return null;
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-paper border-t border-ink p-2">
      <Link href="/apply" className="btn w-full text-lg">Become a volunteer <ArrowRight /></Link>
    </div>
  );
}

export function CookieBanner() {
  const [c, setC] = useLocal<"accepted" | "essential" | null>(KEYS.cookies, null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || c) return null;
  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed z-[70] left-2 right-2 md:left-auto md:right-4 md:bottom-4 md:max-w-md bottom-[4.6rem] bg-paper border-2 border-ink p-4" data-native>
      <p className="font-bold">Cookies, but only if you say so.</p>
      <p className="text-sm mt-1">Essential cookies keep you logged in. Analytics cookies are off unless you allow them. See the <Link className="underline" href="/privacy">privacy policy</Link>.</p>
      <div className="mt-3 flex gap-2 flex-wrap">
        <button className="btn btn-sm btn-ghost" onClick={() => setC("essential")}>Essential only</button>
        <button className="btn btn-sm btn-ink" onClick={() => setC("accepted")}>Allow analytics</button>
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper mt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-[1500px] px-4 md:px-8 py-14 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-6">
          <div className="display text-[clamp(3rem,9vw,8rem)]">If you see am, <em className="accent">Talkam.</em></div>
        </div>
        <div className="md:col-span-3 grid gap-2 content-start">
          <div className="font-bold uppercase tracking-wider text-sm text-orange">Volunteers</div>
          <Link href="/opportunities" className="hover:underline">Opportunities</Link>
          <Link href="/apply" className="hover:underline">Apply</Link>
          <Link href="/verify/DVT-7K2M-9QXA" className="hover:underline">Verify a certificate</Link>
          <Link href="/dashboard" className="hover:underline">Volunteer log in</Link>
          <Link href="/admin" className="hover:underline">Admin</Link>
        </div>
        <div className="md:col-span-3 grid gap-2 content-start">
          <div className="font-bold uppercase tracking-wider text-sm text-orange">Devatop</div>
          <a href="https://devatop.org" className="hover:underline">devatop.org</a>
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/faqs" className="hover:underline">FAQs</Link>
          <Link href="/contact" className="hover:underline">Contact</Link>
          <Link href="/privacy" className="hover:underline">Privacy &amp; cookies</Link>
        </div>
      </div>
      <div className="border-t border-paper/20">
        <div className="mx-auto max-w-[1500px] px-4 md:px-8 py-6 flex flex-wrap items-center gap-4">
          <a href="https://devatop.org" className="bg-paper p-3 block" aria-label="Devatop Centre for Africa Development">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/devatop-logo.png" alt="Devatop Centre for Africa Development: bringing positive change" width={640} height={334} className="h-20 md:h-24 w-auto" loading="lazy" />
          </a>
          <a href="https://devatop.org" className="bg-paper p-3 block" aria-label="Talkam: if you see am, Talkam">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/talkam-logo.png" alt="Talkam: if you see am, Talkam" width={480} height={202} className="h-20 md:h-24 w-auto" loading="lazy" />
          </a>
        </div>
      </div>
      <div className="border-t border-paper/20">
        <div className="mx-auto max-w-[1500px] px-4 md:px-8 py-4 text-sm flex flex-wrap justify-between gap-2 opacity-80">
          <span>© Devatop Centre for Africa Development. Volunteers are known by action, not by registration.</span>
          <span>Hosted outside Nigeria. Protected under the Nigeria Data Protection Act 2023.</span>
        </div>
      </div>
    </footer>
  );
}

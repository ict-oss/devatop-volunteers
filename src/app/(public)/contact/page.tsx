"use client";
import { useState } from "react";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const errs: Record<string, string> = {};
    if (!String(f.get("name")).trim()) errs.name = "Tell us your name.";
    if (!/^\S+@\S+\.\S+$/.test(String(f.get("email")))) errs.email = "Enter a valid email so we can reply.";
    if (String(f.get("message")).trim().length < 10) errs.message = "A few more words, please.";
    setErr(errs);
    if (!Object.keys(errs).length) setSent(true);
  };
  return (
    <div className="mx-auto max-w-[1500px] px-4 md:px-8 py-12 md:py-20 grid md:grid-cols-12 gap-10">
      <div className="md:col-span-5">
        <h1 className="text-[length:var(--text-display)]" data-mask>Talk to <em className="accent">us.</em></h1>
        <p className="mt-6 text-[length:var(--text-lead)]">Questions about volunteering, partnerships or a safeguarding concern. We read everything.</p>
        <ul className="mt-8 grid gap-3">
          <li className="border-t border-ink pt-3"><b>Main website</b><br /><a className="underline" href="https://devatop.org">devatop.org</a></li>
          <li className="border-t border-ink pt-3"><b>Email</b><br /><span>volunteers@devatop.org (confirm)</span></li>
          <li className="border-t border-ink pt-3"><b>Socials</b><br /><span>Instagram · X · LinkedIn · Talkam (links to confirm)</span></li>
        </ul>
      </div>
      <div className="md:col-span-7" data-native>
        {sent ? (
          <div className="border-2 border-ink p-8" role="status">
            <p className="display text-5xl">Message sent.</p>
            <p className="mt-3 text-[length:var(--text-lead)]">We&apos;ll reply by email. Meanwhile, <a className="underline font-bold" href="/opportunities">see what&apos;s open</a>.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="grid gap-5">
            <div><label className="label" htmlFor="name">Your name</label><input id="name" name="name" className="input" autoComplete="name" aria-invalid={!!err.name} />{err.name && <p className="err">{err.name}</p>}</div>
            <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" autoComplete="email" aria-invalid={!!err.email} /><span className="why">So we can reply. Only our team sees this.</span>{err.email && <p className="err">{err.email}</p>}</div>
            <div><label className="label" htmlFor="topic">What is it about?</label><select id="topic" name="topic" className="input"><option>Volunteering</option><option>Partnership</option><option>Media</option><option>Safeguarding concern</option><option>Something else</option></select></div>
            <div><label className="label" htmlFor="message">Message</label><textarea id="message" name="message" rows={6} className="input" aria-invalid={!!err.message} />{err.message && <p className="err">{err.message}</p>}</div>
            <div><button className="btn text-lg" type="submit">Send message</button></div>
          </form>
        )}
      </div>
    </div>
  );
}

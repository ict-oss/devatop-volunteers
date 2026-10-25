"use client";
import { useEffect, useState } from "react";
import { sendCode, verifyCode } from "@/lib/auth/otp";

const RESEND_SECONDS = 60;

/** Email, then the code we send to it. No passwords. The email address stays in this component's memory only: never in the URL (rule 5). */
export function LoginForm({ next }: { next: string | null }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) { setError("Enter a valid email address."); return; }
    setBusy(true); setError("");
    try { await sendCode({ email: address }); setEmail(address); setStep("code"); setCode(""); setWait(RESEND_SECONDS); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!/^\d{6,8}$/.test(token)) { setError("The code is 6 numbers. Check your email."); return; }
    setBusy(true); setError("");
    try {
      await verifyCode({ email }, token);
      // a full page load, so the new session cookie is sent to the server; /auth/continue decides where this person belongs
      window.location.assign(next ? `/auth/continue?next=${encodeURIComponent(next)}` : "/auth/continue");
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} noValidate className="grid gap-5">
        <div>
          <label htmlFor="code" className="label">Your 6-digit code</label>
          <input id="code" className="input text-2xl tracking-[0.4em] font-bold" inputMode="numeric" autoComplete="one-time-code" maxLength={8} autoFocus
            value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!error} aria-describedby="code-why" />
          <span id="code-why" className="why">We sent it to {email}. It works once and expires soon. Check your spam folder if you can&apos;t see it.</span>
          {error && <p className="err" role="alert">{error}</p>}
        </div>
        <button className="btn" disabled={busy}>{busy ? "Checking…" : "Sign in"}</button>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold">
          <button type="button" className="underline disabled:opacity-50 disabled:no-underline" disabled={busy || wait > 0} onClick={() => send()}>
            {wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
          </button>
          <button type="button" className="underline" onClick={() => { setStep("email"); setError(""); }}>Use a different email</button>
        </div>
      </form>
    );
  }
  return (
    <form onSubmit={send} noValidate className="grid gap-5">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" type="email" className="input" autoComplete="email" inputMode="email" autoFocus value={email}
          onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} aria-describedby="email-why" />
        <span id="email-why" className="why">We email you a one-time code. There is no password to remember. Admins use their official Devatop email.</span>
        {error && <p className="err" role="alert">{error}</p>}
      </div>
      <button className="btn" disabled={busy}>{busy ? "Sending…" : "Send me a code"}</button>
    </form>
  );
}

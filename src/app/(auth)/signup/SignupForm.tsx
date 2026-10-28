"use client";
import { useState } from "react";
import { createAccount } from "@/lib/auth/password";
import { PASSWORD_MIN } from "@/lib/auth/password-rules";

export function SignupForm({ next }: { next: string | null }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [checkEmail, setCheckEmail] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) { setError("Enter a valid email address."); return; }
    if (password !== again) { setError("The two passwords are not the same."); return; }
    setBusy(true); setError("");
    try {
      const r = await createAccount(address, password);
      if (r === "check_email") { setCheckEmail(true); setBusy(false); return; }
      window.location.assign(next ? `/auth/continue?next=${encodeURIComponent(next)}` : "/auth/continue");
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  if (checkEmail) return <p className="border-2 border-ink p-4 font-bold" role="status">Almost done. We sent a confirmation link to your email. Open it, then come back and sign in.</p>;
  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div><label htmlFor="email" className="label">Email (this is your username)</label><input id="email" type="email" className="input" autoComplete="username" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label htmlFor="password" className="label">Password</label><input id="password" type="password" className="input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /><span className="why">At least {PASSWORD_MIN} characters, with letters and a number.</span></div>
      <div><label htmlFor="again" className="label">Password again</label><input id="again" type="password" className="input" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} aria-invalid={!!error} />{error && <p className="err" role="alert">{error}</p>}</div>
      <button className="btn" disabled={busy}>{busy ? "Creating…" : "Create my account"}</button>
    </form>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import { sendPasswordReset } from "@/lib/auth/password";

export function ForgotForm() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Enter a valid email address."); return; }
    setBusy(true); setError("");
    try { await sendPasswordReset(email.trim()); setSent(true); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  if (sent) return <p className="border-2 border-ink p-4 font-bold" role="status">If there is an account for that email, a link is on its way. Check your spam folder too. <Link href="/login" className="underline">Back to sign in</Link></p>;
  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" className="input" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />{error && <p className="err" role="alert">{error}</p>}</div>
      <button className="btn" disabled={busy}>{busy ? "Sending…" : "Send me a link"}</button>
    </form>
  );
}

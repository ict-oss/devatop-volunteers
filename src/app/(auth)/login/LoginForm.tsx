"use client";
import Link from "next/link";
import { useState } from "react";
import { signInWithPassword } from "@/lib/auth/password";

/** Email and password. Neither ever appears in the URL (rule 5). */
export function LoginForm({ next }: { next: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) { setError("Enter a valid email address."); return; }
    if (!password) { setError("Enter your password."); return; }
    setBusy(true); setError("");
    try {
      await signInWithPassword(address, password);
      // a full page load, so the new session cookie is sent to the server; /auth/continue decides where this person belongs
      window.location.assign(next ? `/auth/continue?next=${encodeURIComponent(next)}` : "/auth/continue");
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div>
        <label htmlFor="email" className="label">Email (your username)</label>
        <input id="email" type="email" className="input" autoComplete="username" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} />
        {error && <p className="err" role="alert">{error}</p>}
      </div>
      <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="text-sm font-bold"><Link href="/login/forgot" className="underline">Forgot your password?</Link></p>
    </form>
  );
}

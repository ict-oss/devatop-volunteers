"use client";
import Link from "next/link";
import { useState } from "react";
import { Busy } from "@/components/Spinner";
import { createAccount, signInWithPassword } from "@/lib/auth/password";
import { PasswordHints } from "./PasswordHints";
import { PasswordInput } from "./PasswordInput";

type Mode = "signin" | "create";

/**
 * One page for both: "Sign in" and "Create account" are two tabs over the same two boxes (email, password).
 * Nothing is typed twice. While it works the form is locked and says what is happening; after success it keeps saying
 * "Opening your account…" until the next page has actually loaded, so it never looks stuck.
 * Neither the email nor the password ever appears in the URL (rule 5).
 */
export function AuthForm({ initial, next }: { initial: Mode; next: string | null }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [phase, setPhase] = useState<"idle" | "working" | "opening">("idle");
  const [error, setError] = useState(""); const [confirmEmail, setConfirmEmail] = useState(false);
  const locked = phase !== "idle";
  const create = mode === "create";

  const choose = (m: Mode) => { if (locked) return; setMode(m); setError(""); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) { setError("Enter a valid email address."); return; }
    if (!password) { setError(create ? "Choose a password." : "Enter your password."); return; }
    setPhase("working"); setError("");
    try {
      if (create) {
        if ((await createAccount(address, password)) === "check_email") { setConfirmEmail(true); setPhase("idle"); return; }
      } else await signInWithPassword(address, password);
      setPhase("opening");
      // a full page load, so the new session cookie is sent to the server; /auth/continue decides where this person belongs.
      // A brand-new account goes straight to the application form: it is the next thing they came to do.
      const to = next ?? (create ? "/apply" : null);
      window.location.assign(to ? `/auth/continue?next=${encodeURIComponent(to)}` : "/auth/continue");
    } catch (err) { setError((err as Error).message); setPhase("idle"); }
  }

  if (confirmEmail) return <p className="border-2 border-ink p-4 font-bold" role="status">Almost done. We sent a confirmation link to {email.trim()}. Open it, then come back and sign in.</p>;

  return (
    <form onSubmit={submit} noValidate className="grid gap-5" aria-busy={locked}>
      <div role="tablist" aria-label="Sign in or create an account" className="grid grid-cols-2 border-2 border-ink">
        {([["signin", "Sign in"], ["create", "Create account"]] as const).map(([m, label]) => (
          <button key={m} type="button" role="tab" id={`tab-${m}`} aria-selected={mode === m} aria-controls="auth-panel" tabIndex={mode === m ? 0 : -1} onClick={() => choose(m)}
            className={`min-h-12 font-bold ${mode === m ? "bg-ink text-paper" : "hover:bg-rule"} ${locked ? "opacity-60" : ""}`}>{label}</button>
        ))}
      </div>

      <div id="auth-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} className="grid gap-5">
        <div>
          <label htmlFor="email" className="label">Email <span className="font-normal">(this is your username)</span></label>
          <input id="email" type="email" className="input" autoComplete="username" inputMode="email" autoCapitalize="none" autoFocus value={email} disabled={locked} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="label">{create ? "Choose a password" : "Password"}</label>
            {!create && <Link href="/login/forgot" className="text-sm font-bold underline" tabIndex={locked ? -1 : 0}>Forgot password?</Link>}
          </div>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete={create ? "new-password" : "current-password"} disabled={locked} invalid={!!error} describedBy={error ? "auth-error" : undefined} />
          {create && <PasswordHints password={password} />}
        </div>
      </div>

      <div aria-live="polite" className="min-h-6">
        {error && <p id="auth-error" className="err" role="alert">{error}</p>}
        {phase === "opening" && <p className="font-bold" role="status">{create ? "Account created. Opening the application form…" : "Signed in. Opening your account…"}</p>}
      </div>

      <button className="btn" disabled={locked}>
        {phase === "working" ? <Busy>{create ? "Creating your account…" : "Signing you in…"}</Busy> : phase === "opening" ? <Busy>Opening…</Busy> : create ? "Create my account" : "Sign in"}
      </button>
      <p className="text-sm">{create ? "Already have an account? " : "New here? "}<button type="button" className="underline font-bold" disabled={locked} onClick={() => choose(create ? "signin" : "create")}>{create ? "Sign in" : "Create an account"}</button></p>
    </form>
  );
}

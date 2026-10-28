"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { setNewPassword } from "@/lib/auth/password";
import { PASSWORD_MIN } from "@/lib/auth/password-rules";
import { supabaseBrowser } from "@/lib/auth/supabase-browser";

/** The reset link brings the person back here with a one-time `code`; it becomes a short session that may only choose a new password. */
export function ResetForm() {
  const [ready, setReady] = useState<"checking" | "yes" | "no">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");

  useEffect(() => {
    const sb = supabaseBrowser();
    (async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) await sb.auth.exchangeCodeForSession(code).catch(() => null);
      const { data } = await sb.auth.getUser();
      setEmail(data.user?.email ?? ""); setReady(data.user ? "yes" : "no");
      if (code) window.history.replaceState(null, "", "/auth/reset"); // the one-time code leaves the address bar
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== again) { setError("The two passwords are not the same."); return; }
    setBusy(true); setError("");
    try { await setNewPassword(password, email); window.location.assign("/auth/continue"); } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  if (ready === "checking") return <p>One moment…</p>;
  if (ready === "no") return <p className="border-2 border-ink p-4 font-bold" role="alert">This link has expired or was already used. <Link href="/login/forgot" className="underline">Ask for a new one</Link>.</p>;
  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div><label htmlFor="password" className="label">New password</label><input id="password" type="password" className="input" autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} /><span className="why">At least {PASSWORD_MIN} characters, with letters and a number.</span></div>
      <div><label htmlFor="again" className="label">New password again</label><input id="again" type="password" className="input" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} aria-invalid={!!error} />{error && <p className="err" role="alert">{error}</p>}</div>
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
    </form>
  );
}

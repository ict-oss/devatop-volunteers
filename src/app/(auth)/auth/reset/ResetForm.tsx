"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PasswordHints } from "@/components/auth/PasswordHints";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Busy, Spinner } from "@/components/Spinner";
import { setNewPassword } from "@/lib/auth/password";
import { supabaseBrowser } from "@/lib/auth/supabase-browser";

/** The reset link brings the person back here with a one-time `code`; it becomes a short session that may only choose a new password. */
export function ResetForm() {
  const [ready, setReady] = useState<"checking" | "yes" | "no">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(false);

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
    setBusy(true); setError("");
    try { await setNewPassword(password, email); setDone(true); window.location.assign("/auth/continue"); } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  if (ready === "checking") return <p className="flex items-center gap-3 font-bold" role="status"><Spinner /> Checking your link…</p>;
  if (ready === "no") return <p className="border-2 border-ink p-4 font-bold" role="alert">This link has expired or was already used. <Link href="/login/forgot" className="underline">Ask for a new one</Link>.</p>;
  return (
    <form onSubmit={submit} noValidate className="grid gap-5" aria-busy={busy}>
      <div>
        <label htmlFor="password" className="label">New password</label>
        <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" disabled={busy} invalid={!!error} />
        <PasswordHints password={password} />
        {error && <p className="err" role="alert">{error}</p>}
      </div>
      {done && <p className="font-bold" role="status">Password saved. Opening your account…</p>}
      <button className="btn" disabled={busy}>{busy ? <Busy>{done ? "Opening…" : "Saving your password…"}</Busy> : "Save password"}</button>
    </form>
  );
}

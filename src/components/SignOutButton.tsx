"use client";
import { useState } from "react";
import { Busy } from "@/components/Spinner";
import { supabaseBrowser } from "@/lib/auth/supabase-browser";

/** Ends the session on this device, then goes to the sign-in page. Shows that it is working. */
export function SignOutButton({ className = "underline font-bold" }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  async function out() {
    setBusy(true);
    try { await supabaseBrowser().auth.signOut(); } catch { /* the page load below ends up on the sign-in page either way */ }
    window.location.assign("/login");
  }
  return <button type="button" className={className} onClick={out} disabled={busy} aria-busy={busy}>{busy ? <span className="inline-flex items-center gap-2"><Busy>Signing out…</Busy></span> : "Sign out"}</button>;
}

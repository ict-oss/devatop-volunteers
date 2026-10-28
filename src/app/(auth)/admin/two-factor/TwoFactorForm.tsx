"use client";
import { Busy } from "@/components/Spinner";
import { useEffect, useState } from "react";
import { enrollTotp, verifiedTotpFactorId, verifyTotp } from "@/lib/auth/mfa";

type Setup = { factorId: string; qrSvg: string; secret: string };

/** First time: scan a QR code with an authenticator app, then type the code. Every later time: just type the code. */
export function TwoFactorForm() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const existing = await verifiedTotpFactorId();
        if (!live) return;
        if (existing) setFactorId(existing);
        else { const s = await enrollTotp(); if (live) { setSetup(s); setFactorId(s.factorId); } }
      } catch (e) { if (live) setError((e as Error).message); }
      finally { if (live) setReady(true); }
    })();
    return () => { live = false; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!factorId) return;
    if (!/^\d{6}$/.test(token)) { setError("The code is 6 numbers."); return; }
    setBusy(true); setError("");
    try { await verifyTotp(factorId, token); window.location.assign("/admin"); } // full load: the server must see the stronger session
    catch (err) { setError((err as Error).message); setBusy(false); }
  }

  if (!ready) return <p role="status">Checking your account…</p>;
  if (!factorId) return <p className="err" role="alert">{error || "We could not start two-factor sign-in. Refresh the page."}</p>;
  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {setup && (
        <div className="border-2 border-ink p-4 grid gap-3">
          <p className="font-bold">1. Install an authenticator app (Google Authenticator, Microsoft Authenticator or similar) and scan this code.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qrSvg} alt="Two-factor setup QR code" width={192} height={192} className="bg-white p-2 border border-ink" />
          <p className="text-sm">Can&apos;t scan? Type this key into the app: <code className="font-bold break-all">{setup.secret}</code></p>
          <p className="font-bold">2. Type the 6-digit code the app shows.</p>
        </div>
      )}
      <div>
        <label htmlFor="totp" className="label">{setup ? "Code from the app" : "Code from your authenticator app"}</label>
        <input id="totp" className="input text-2xl tracking-[0.4em] font-bold" inputMode="numeric" autoComplete="one-time-code" maxLength={7} autoFocus
          value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!error} />
        {error && <p className="err" role="alert">{error}</p>}
      </div>
      <button className="btn" disabled={busy}>{busy ? <Busy>Checking the code…</Busy> : "Continue to admin"}</button>
    </form>
  );
}

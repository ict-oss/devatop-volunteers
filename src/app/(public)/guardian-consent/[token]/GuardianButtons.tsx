"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { decideGuardianAction } from "@/app/actions/apply";

export function GuardianButtons({ token, first }: { token: string; first: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(d: "given" | "refused") {
    if (d === "refused" && !confirm(`Refuse consent for ${first}?`)) return;
    setBusy(true); setError("");
    const r = await decideGuardianAction(token, d);
    if (r.ok) router.refresh(); else { setError(r.message); setBusy(false); }
  }
  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-3">
        <button className="btn text-lg" disabled={busy} onClick={() => decide("given")}>I give consent</button>
        <button className="btn btn-ghost text-lg" disabled={busy} onClick={() => decide("refused")}>I do not give consent</button>
      </div>
      {error && <p className="err mt-3" role="alert">{error}</p>}
    </div>
  );
}

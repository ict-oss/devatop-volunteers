"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function VerifyForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return (
    <form className="mt-8 flex flex-wrap gap-3 items-end max-w-xl" onSubmit={(e) => { e.preventDefault(); if (clean) router.push(`/verify/${clean}`); }}>
      <label className="grow"><span className="label">Certificate code</span><input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="DVT-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" /></label>
      <button className="btn" disabled={!clean}>Check</button>
    </form>
  );
}

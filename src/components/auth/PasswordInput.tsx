"use client";
import { useState } from "react";

/** A password box with a Show / Hide button, so nobody has to type a new password twice to be sure of it. */
export function PasswordInput({ id, value, onChange, autoComplete, disabled, invalid, describedBy }: { id: string; value: string; onChange: (v: string) => void; autoComplete: "current-password" | "new-password"; disabled?: boolean; invalid?: boolean; describedBy?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} className="input pr-24" autoComplete={autoComplete} autoCapitalize="none" spellCheck={false} value={value} disabled={disabled}
        onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} aria-describedby={describedBy} />
      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 px-3 min-h-9 font-bold text-sm underline" onClick={() => setShow((s) => !s)} aria-pressed={show} disabled={disabled}>{show ? "Hide" : "Show"}</button>
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Result } from "@/lib/result";

/** Runs a server action, shows its plain-language outcome, and refreshes the page data. */
export function useAct() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function act<T>(p: Promise<Result<T>>, okText: string | ((d: T) => string) = "Saved."): Promise<Result<T>> {
    setBusy(true);
    const r = await p;
    setBusy(false);
    if (r.ok) { setMsg({ ok: true, text: typeof okText === "function" ? okText(r.data) : okText }); router.refresh(); }
    else setMsg({ ok: false, text: r.message });
    setTimeout(() => setMsg(null), 6000);
    return r;
  }
  const note = msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "font-bold border-l-4 border-orange pl-3" : "err"}>{msg.text}</p>;
  return { act, busy, note };
}

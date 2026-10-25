"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Admin-only helper (the layout shows it only to signed-in admins): outlines every picture slot on the page. Press "I" or tap the button. */
export function SlotToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-slots", on);
  }, [on]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      if (e.key.toLowerCase() === "i" && !e.metaKey && !e.ctrlKey) setOn((v) => !v);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div className="fixed left-3 bottom-20 md:bottom-3 z-[60] flex gap-1 text-sm">
      <button type="button" aria-pressed={on} onClick={() => setOn((v) => !v)} className="border-2 border-ink bg-paper px-3 py-2 font-bold min-h-11" data-cursor="">
        {on ? "Hide" : "Show"} image slots <span className="opacity-60">(I)</span>
      </button>
      <Link href="/admin/images" className="border-2 border-ink bg-ink text-paper px-3 py-2 font-bold min-h-11 grid place-items-center" data-cursor="">Image guide</Link>
    </div>
  );
}

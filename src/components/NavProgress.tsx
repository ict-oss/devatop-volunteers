"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/**
 * A thin bar along the top while a page is loading, so a click never looks like nothing happened.
 * It starts when someone follows a link on this site and ends when the new page has arrived (or after 12 seconds, whatever happens).
 */
function Bar() {
  const path = usePathname(); const query = useSearchParams().toString();
  const [width, setWidth] = useState(0); const [show, setShow] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  // the new page arrived: finish the bar and fade it out
  useEffect(() => {
    clear(); setWidth(100);
    timers.current.push(setTimeout(() => { setShow(false); setWidth(0); }, 300));
    return clear;
  }, [path, query]);

  useEffect(() => {
    const start = () => { clear(); setShow(true); setWidth(12); timers.current.push(setTimeout(() => setWidth(60), 150), setTimeout(() => setWidth(85), 1500), setTimeout(() => { setShow(false); setWidth(0); }, 12000)); };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      start();
    };
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("click", onClick); clear(); };
  }, []);

  return <div className="navbar" role="progressbar" aria-label="Loading the next page" aria-hidden={!show} style={{ width: `${width}%`, opacity: show ? 1 : 0 }} />;
}
export function NavProgress() { return <Suspense fallback={null}><Bar /></Suspense>; }

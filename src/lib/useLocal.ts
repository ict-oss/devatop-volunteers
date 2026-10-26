"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";

/** A value kept in this browser only (for example the cookie choice). Never used for anything that belongs in the database. */
const listeners = new Set<() => void>();
const sub = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { listeners.delete(cb); window.removeEventListener("storage", cb); };
};

export function useLocal<T>(key: string, initial: T): [T, (next: T | ((p: T) => T)) => void, boolean] {
  const raw = useSyncExternalStore(sub, () => { try { return localStorage.getItem(key); } catch { return null; } }, () => null);
  const value = useMemo<T>(() => { try { return raw === null ? initial : (JSON.parse(raw) as T); } catch { return initial; } }, [raw, initial]);
  const set = useCallback((next: T | ((p: T) => T)) => {
    let cur = initial;
    try { const r = localStorage.getItem(key); if (r !== null) cur = JSON.parse(r) as T; } catch {}
    const v = typeof next === "function" ? (next as (p: T) => T)(cur) : next;
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
    listeners.forEach((l) => l());
  }, [key, initial]);
  return [value, set, raw !== null];
}

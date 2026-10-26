"use client";
import { useEffect } from "react";

/** Registers the tiny service worker (installability + offline page). Production only, so local development is never confused by it. */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

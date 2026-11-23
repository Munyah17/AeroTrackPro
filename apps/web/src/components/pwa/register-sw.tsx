"use client";

import { useEffect } from "react";
import { initPwaListeners } from "@/lib/pwa";

/**
 * Registers the service worker and wires PWA install listeners.
 * Mounted once in the root layout — renders nothing.
 */
export function RegisterSW() {
  useEffect(() => {
    initPwaListeners();

    if (!("serviceWorker" in navigator)) return;
    /* Register after load so it never competes with first paint. */
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW registration is best-effort — the app works without it */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

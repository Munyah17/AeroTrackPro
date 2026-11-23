"use client";

import { useSyncExternalStore } from "react";

/**
 * PWA install plumbing.
 *
 * Chrome/Edge/Android fire `beforeinstallprompt` — we stash the event so a
 * custom "Install" button can trigger the native prompt later. iOS Safari
 * has no such event: users install via Share → Add to Home Screen, so the
 * UI shows instructions instead. `appinstalled` fires on every platform
 * once the app lands on the home screen / is installed.
 */

export type PwaPlatform = "ios" | "android" | "desktop" | "unknown";

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
let wired = false;

function emit() {
  listeners.forEach((l) => l());
}

function track(type: "install_tap" | "app_installed", platform: PwaPlatform) {
  try {
    void fetch("/api/pwa/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, platform }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never break the install flow */
  }
}

export function detectPlatform(): PwaPlatform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/.test(ua)) return "android";
  if (/Windows|Macintosh|Linux|CrOS/.test(ua)) return "desktop";
  return "unknown";
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari legacy flag
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Wire the global install listeners once (called from RegisterSW). */
export function initPwaListeners() {
  if (wired || typeof window === "undefined") return;
  wired = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    track("app_installed", detectPlatform());
    emit();
  });
}

export interface PwaInstallState {
  /** A native install prompt is available right now (Chromium browsers). */
  canInstall: boolean;
  /** Running inside the installed app already. */
  isStandalone: boolean;
  platform: PwaPlatform;
  /** iOS devices can only install manually via Share → Add to Home Screen. */
  isIos: boolean;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let cached: PwaInstallState | null = null;

function getSnapshot(): PwaInstallState {
  const platform = detectPlatform();
  const standalone = isStandalone() || installed;
  const canInstall = deferredPrompt !== null && !installed;
  if (
    cached &&
    cached.canInstall === canInstall &&
    cached.isStandalone === standalone &&
    cached.platform === platform &&
    cached.isIos === (platform === "ios")
  ) {
    return cached;
  }
  cached = { canInstall, isStandalone: standalone, platform, isIos: platform === "ios" };
  return cached;
}

const SERVER_SNAPSHOT: PwaInstallState = {
  canInstall: false,
  isStandalone: false,
  platform: "unknown",
  isIos: false,
};

/** React view of install state — re-renders when the prompt appears/fires. */
export function usePwaInstall(): PwaInstallState & { promptInstall: () => Promise<void> } {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);

  const promptInstall = async () => {
    const platform = detectPlatform();
    track("install_tap", platform);
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    deferredPrompt = null;
    emit();
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
  };

  return { ...state, promptInstall };
}

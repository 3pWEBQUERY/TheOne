"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Keeps data fresh when the PWA comes back to the foreground. */
export function useRefreshOnFocus(minIntervalMs = 15_000) {
  const router = useRouter();
  const last = useRef(0);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last.current < minIntervalMs) return;
      last.current = now;
      router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [router, minIntervalMs]);
}

/** Removes ?new / ?open from the URL without a navigation. */
export function clearUrlParams() {
  const url = new URL(window.location.href);
  if (!url.search) return;
  url.search = "";
  window.history.replaceState(window.history.state, "", url.pathname);
}

/** Auto-growing textarea helper. */
export function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Only auto-focus on devices with a real keyboard – on phones it pops the keyboard and shifts the view. */
export function canAutoFocus() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

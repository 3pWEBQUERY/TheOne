"use client";

import { removePushSubscription, savePushSubscription } from "@/lib/actions/push";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isStandalone() {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function isIOS() {
  return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await registration();
  return reg.pushManager.getSubscription();
}

export async function enablePush(vapidPublicKey: string): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) {
    return {
      ok: false,
      error: isIOS() && !isStandalone()
        ? "Auf dem iPhone: erst über „Teilen → Zum Home-Bildschirm“ installieren."
        : "Dein Browser unterstützt keine Push-Benachrichtigungen.",
    };
  }
  if (!vapidPublicKey) return { ok: false, error: "Push ist auf dem Server nicht konfiguriert (VAPID)." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Benachrichtigungen wurden nicht erlaubt." };
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }
  const res = await savePushSubscription(JSON.parse(JSON.stringify(sub)), navigator.userAgent);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (sub) {
    await removePushSubscription(sub.endpoint);
    await sub.unsubscribe();
  }
}

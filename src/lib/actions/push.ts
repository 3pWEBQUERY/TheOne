"use server";

import { eq } from "drizzle-orm";
import { db, pushSubscriptions } from "@/db";
import { sendPushToAll } from "@/lib/push";
import { setSetting, type NotificationSettings } from "@/lib/settings";
import { guard, refreshAll, str } from "./util";

export type SubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function savePushSubscription(sub: SubscriptionJSON, userAgent?: string) {
  await guard();
  const endpoint = str(sub?.endpoint, 2000);
  if (!endpoint.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: "Ungültiges Abo." };
  }
  await db
    .insert(pushSubscriptions)
    .values({ endpoint, p256dh: str(sub.keys.p256dh, 500), auth: str(sub.keys.auth, 500), userAgent: str(userAgent, 500) })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh: str(sub.keys.p256dh, 500), auth: str(sub.keys.auth, 500) },
    });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  await guard();
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, str(endpoint, 2000)));
  return { ok: true };
}

export async function sendTestPush() {
  await guard();
  const r = await sendPushToAll({
    title: "Benachrichtigungen aktiv",
    body: "TheOne erinnert dich ab jetzt an deine Aufgaben.",
    url: "/",
    tag: "test",
  });
  return { ok: true, ...r };
}

export async function saveNotificationSettings(cfg: NotificationSettings) {
  await guard();
  const hour = (h: unknown, d: number) => {
    const n = Math.round(Number(h));
    return n >= 0 && n <= 23 ? n : d;
  };
  await setSetting("notifications", {
    dailyDigest: !!cfg.dailyDigest,
    digestHour: hour(cfg.digestHour, 8),
    journalReminder: !!cfg.journalReminder,
    journalHour: hour(cfg.journalHour, 21),
  });
  refreshAll();
  return { ok: true };
}

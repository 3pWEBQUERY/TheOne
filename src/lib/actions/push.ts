"use server";

import { and, eq } from "drizzle-orm";
import { db, pushSubscriptions } from "@/db";
import { sendPushToUser } from "@/lib/push";
import { setSetting, type NotificationSettings } from "@/lib/settings";
import { guard, refreshAll, str } from "./util";

export type SubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function savePushSubscription(sub: SubscriptionJSON, userAgent?: string) {
  const userId = await guard();
  const endpoint = str(sub?.endpoint, 2000);
  if (!endpoint.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: "Ungültiges Abo." };
  }
  const keys = { p256dh: str(sub.keys.p256dh, 500), auth: str(sub.keys.auth, 500) };
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint, ...keys, userAgent: str(userAgent, 500) })
    // The same device may switch accounts – the subscription follows the signed-in user.
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, ...keys } });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  const userId = await guard();
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, str(endpoint, 2000)), eq(pushSubscriptions.userId, userId)));
  return { ok: true };
}

export async function sendTestPush() {
  const userId = await guard();
  const r = await sendPushToUser(userId, {
    title: "Benachrichtigungen aktiv",
    body: "TheOne erinnert dich ab jetzt an deine Aufgaben.",
    url: "/",
    tag: "test",
  });
  return { ok: true, ...r };
}

export async function saveNotificationSettings(cfg: NotificationSettings) {
  const userId = await guard();
  const hour = (h: unknown, d: number) => {
    const n = Math.round(Number(h));
    return n >= 0 && n <= 23 ? n : d;
  };
  await setSetting(userId, "notifications", {
    dailyDigest: !!cfg.dailyDigest,
    digestHour: hour(cfg.digestHour, 8),
    journalReminder: !!cfg.journalReminder,
    journalHour: hour(cfg.journalHour, 21),
  });
  refreshAll();
  return { ok: true };
}

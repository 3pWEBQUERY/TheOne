import { and, eq } from "drizzle-orm";
import { db, userSettings } from "@/db";

export type NotificationSettings = {
  dailyDigest: boolean;
  digestHour: number;
  journalReminder: boolean;
  journalHour: number;
};

export type SchedulerState = {
  lastDigest?: string;
  lastJournalReminder?: string;
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  dailyDigest: true,
  digestHour: 8,
  journalReminder: true,
  journalHour: 21,
};

export async function getSetting<T>(userId: string, key: string, fallback: T): Promise<T> {
  const row = await db.query.userSettings.findFirst({
    where: and(eq(userSettings.userId, userId), eq(userSettings.key, key)),
  });
  if (!row) return fallback;
  return { ...fallback, ...(row.value as object) } as T;
}

export async function setSetting(userId: string, key: string, value: unknown) {
  await db
    .insert(userSettings)
    .values({ userId, key, value })
    .onConflictDoUpdate({ target: [userSettings.userId, userSettings.key], set: { value } });
}

export const getNotificationSettings = (userId: string) =>
  getSetting<NotificationSettings>(userId, "notifications", DEFAULT_NOTIFICATIONS);

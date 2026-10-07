import { eq } from "drizzle-orm";
import { db, settings } from "@/db";

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

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  if (!row) return fallback;
  return { ...fallback, ...(row.value as object) } as T;
}

export async function setSetting(key: string, value: unknown) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export const getNotificationSettings = () =>
  getSetting<NotificationSettings>("notifications", DEFAULT_NOTIFICATIONS);

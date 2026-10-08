import { and, count, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { db, journalEntries, pushSubscriptions, todos, users } from "@/db";
import { endOfDay, toISODate } from "./dates";
import { sendPushToUser } from "./push";
import { getNotificationSettings, getSetting, setSetting, type SchedulerState } from "./settings";
import { quoteOfTheDay } from "./motivation";

const globalForScheduler = globalThis as unknown as { theoneScheduler?: NodeJS.Timeout };

async function sendTodoReminders(now: Date) {
  const due = await db
    .select({ id: todos.id, userId: todos.userId, title: todos.title })
    .from(todos)
    .where(and(eq(todos.done, false), isNull(todos.reminderSentAt), lte(todos.remindAt, now), isNotNull(todos.userId)))
    .limit(50);

  for (const t of due) {
    // Mark first so a slow push never causes duplicates.
    await db.update(todos).set({ reminderSentAt: now }).where(eq(todos.id, t.id));
    await sendPushToUser(t.userId!, {
      title: "Erinnerung",
      body: t.title,
      url: `/todos?open=${t.id}`,
      tag: `todo-${t.id}`,
    });
  }
}

async function sendDailyMessages(userId: string, name: string, now: Date) {
  const cfg = await getNotificationSettings(userId);
  const state = await getSetting<SchedulerState>(userId, "scheduler", {});
  const today = toISODate(now);
  const hour = now.getHours();
  const next: SchedulerState = { ...state };
  const firstName = name.split(" ")[0];

  if (cfg.dailyDigest && hour >= cfg.digestHour && state.lastDigest !== today) {
    next.lastDigest = today;
    const [{ value: open }] = await db
      .select({ value: count() })
      .from(todos)
      .where(and(eq(todos.userId, userId), eq(todos.done, false), lte(todos.dueAt, endOfDay(now))));
    const q = quoteOfTheDay(now);
    await sendPushToUser(userId, {
      title:
        open > 0
          ? `${open} ${open === 1 ? "Aufgabe" : "Aufgaben"} für heute`
          : `Guten Morgen${firstName ? `, ${firstName}` : ""}`,
      body: `„${q.text}“ – ${q.author}`,
      url: "/todos",
      tag: "daily-digest",
    });
  }

  if (cfg.journalReminder && hour >= cfg.journalHour && state.lastJournalReminder !== today) {
    next.lastJournalReminder = today;
    const [{ value: entries }] = await db
      .select({ value: count() })
      .from(journalEntries)
      .where(and(eq(journalEntries.userId, userId), eq(journalEntries.entryDate, today)));
    if (entries === 0) {
      await sendPushToUser(userId, {
        title: "Wie war dein Tag?",
        body: "Nimm dir eine Minute für deine Gedanken.",
        url: "/journal?new=1",
        tag: "journal-reminder",
      });
    }
  }

  if (next.lastDigest !== state.lastDigest || next.lastJournalReminder !== state.lastJournalReminder) {
    await setSetting(userId, "scheduler", next);
  }
}

/** Only users with at least one subscribed device can receive daily messages. */
async function usersWithDevices() {
  return db
    .selectDistinct({ id: users.id, name: users.name })
    .from(users)
    .innerJoin(pushSubscriptions, eq(pushSubscriptions.userId, users.id));
}

async function tick() {
  const now = new Date();
  try {
    await sendTodoReminders(now);
    for (const u of await usersWithDevices()) {
      await sendDailyMessages(u.id, u.name, now);
    }
  } catch (err) {
    console.error("[scheduler] Fehler", err);
  }
}

export function startScheduler() {
  if (globalForScheduler.theoneScheduler || !process.env.DATABASE_URL) return;
  console.log(`[scheduler] gestartet (Zeitzone ${process.env.TZ})`);
  globalForScheduler.theoneScheduler = setInterval(tick, 60_000);
  setTimeout(tick, 10_000);
}


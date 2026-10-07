import { and, count, eq, isNull, lte } from "drizzle-orm";
import { db, journalEntries, todos } from "@/db";
import { endOfDay, toISODate } from "./dates";
import { sendPushToAll } from "./push";
import { getNotificationSettings, getSetting, setSetting, type SchedulerState } from "./settings";
import { quoteOfTheDay } from "./motivation";

const globalForScheduler = globalThis as unknown as { theoneScheduler?: NodeJS.Timeout };

async function sendTodoReminders(now: Date) {
  const due = await db
    .select({ id: todos.id, title: todos.title, dueAt: todos.dueAt })
    .from(todos)
    .where(and(eq(todos.done, false), isNull(todos.reminderSentAt), lte(todos.remindAt, now)))
    .limit(50);

  for (const t of due) {
    // Mark first so a slow push never causes duplicates.
    await db.update(todos).set({ reminderSentAt: now }).where(eq(todos.id, t.id));
    await sendPushToAll({
      title: "⏰ Erinnerung",
      body: t.title,
      url: `/todos?open=${t.id}`,
      tag: `todo-${t.id}`,
    });
  }
}

async function sendDailyMessages(now: Date) {
  const cfg = await getNotificationSettings();
  const state = await getSetting<SchedulerState>("scheduler", {});
  const today = toISODate(now);
  const hour = now.getHours();
  const next: SchedulerState = { ...state };

  if (cfg.dailyDigest && hour >= cfg.digestHour && state.lastDigest !== today) {
    next.lastDigest = today;
    const [{ value: open }] = await db
      .select({ value: count() })
      .from(todos)
      .where(and(eq(todos.done, false), lte(todos.dueAt, endOfDay(now))));
    const q = quoteOfTheDay(now);
    await sendPushToAll({
      title: open > 0 ? `☀️ ${open} ${open === 1 ? "Aufgabe wartet" : "Aufgaben warten"} heute auf dich` : "☀️ Guten Morgen!",
      body: open > 0 ? `„${q.text}“ – Du schaffst das!` : `„${q.text}“`,
      url: "/todos",
      tag: "daily-digest",
    });
  }

  if (cfg.journalReminder && hour >= cfg.journalHour && state.lastJournalReminder !== today) {
    next.lastJournalReminder = today;
    const [{ value: entries }] = await db
      .select({ value: count() })
      .from(journalEntries)
      .where(eq(journalEntries.entryDate, today));
    if (entries === 0) {
      await sendPushToAll({
        title: "📔 Wie war dein Tag?",
        body: "Nimm dir eine Minute für deine Gedanken.",
        url: "/journal?new=1",
        tag: "journal-reminder",
      });
    }
  }

  if (next.lastDigest !== state.lastDigest || next.lastJournalReminder !== state.lastJournalReminder) {
    await setSetting("scheduler", next);
  }
}

async function tick() {
  const now = new Date();
  try {
    await sendTodoReminders(now);
    await sendDailyMessages(now);
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


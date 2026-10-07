import "server-only";
import { and, asc, count, desc, eq, gte, ilike, isNotNull, lte, ne, or, sql } from "drizzle-orm";
import { db, journalEntries, notes, shoppingItems, todos } from "@/db";
import { addDays, endOfDay, startOfDay, toISODate } from "./dates";

const tz = () => process.env.TZ || "Europe/Berlin";

export async function getTodoStats(now = new Date()) {
  const sod = startOfDay(now);
  const eod = endOfDay(now);
  const [[openToday], [doneToday], streakRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(todos)
      .where(and(eq(todos.done, false), lte(todos.dueAt, eod))),
    db
      .select({ value: count() })
      .from(todos)
      .where(and(eq(todos.done, true), gte(todos.completedAt, sod))),
    db.execute<{ d: string }>(
      sql`select distinct to_char((completed_at at time zone ${tz()})::date, 'YYYY-MM-DD') as d
          from todos where completed_at is not null and completed_at > now() - interval '400 days'
          order by d desc`,
    ),
  ]);

  const days = new Set(streakRows.rows.map((r) => r.d));
  let streak = 0;
  let cursor = days.has(toISODate(now)) ? now : addDays(now, -1);
  while (days.has(toISODate(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  return {
    open: openToday.value,
    done: doneToday.value,
    total: openToday.value + doneToday.value,
    streak,
  };
}

export async function getOpenTodoCount() {
  const [r] = await db
    .select({ value: count() })
    .from(todos)
    .where(and(eq(todos.done, false), lte(todos.dueAt, endOfDay())));
  return r.value;
}

export async function getActiveShoppingCount() {
  const [r] = await db
    .select({ value: count() })
    .from(shoppingItems)
    .where(and(eq(shoppingItems.archived, false), eq(shoppingItems.checked, false)));
  return r.value;
}

export async function getAllTodos() {
  const [open, done] = await Promise.all([
    db
      .select()
      .from(todos)
      .where(eq(todos.done, false))
      .orderBy(sql`${todos.dueAt} asc nulls last`, desc(todos.priority), asc(todos.createdAt)),
    db.select().from(todos).where(eq(todos.done, true)).orderBy(desc(todos.completedAt)).limit(100),
  ]);
  return { open, done };
}

export async function getJournalEntries(limit = 300) {
  return db
    .select()
    .from(journalEntries)
    .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt))
    .limit(limit);
}

/** Entries written on this calendar day in earlier years. */
export async function getOnThisDay(now = new Date()) {
  const md = toISODate(now).slice(5);
  return db
    .select()
    .from(journalEntries)
    .where(
      and(
        sql`to_char(${journalEntries.entryDate}, 'MM-DD') = ${md}`,
        ne(journalEntries.entryDate, toISODate(now)),
      ),
    )
    .orderBy(desc(journalEntries.entryDate))
    .limit(3);
}

export async function getMoodHistory(days = 14) {
  const from = toISODate(addDays(new Date(), -(days - 1)));
  const rows = await db
    .select({ d: journalEntries.entryDate, mood: sql<number>`round(avg(${journalEntries.mood}))::int` })
    .from(journalEntries)
    .where(and(gte(journalEntries.entryDate, from), isNotNull(journalEntries.mood)))
    .groupBy(journalEntries.entryDate);
  const map = new Map(rows.map((r) => [r.d, r.mood]));
  return Array.from({ length: days }, (_, i) => {
    const d = toISODate(addDays(new Date(), -(days - 1 - i)));
    return { date: d, mood: map.get(d) ?? null };
  });
}

export async function getNotes() {
  return db.select().from(notes).orderBy(desc(notes.pinned), desc(notes.updatedAt));
}

export async function getShopping() {
  const [active, history] = await Promise.all([
    db
      .select()
      .from(shoppingItems)
      .where(eq(shoppingItems.archived, false))
      .orderBy(asc(shoppingItems.checked), asc(shoppingItems.createdAt)),
    db.execute<{ name: string; times: number; category: string }>(
      sql`select name, count(*)::int as times, mode() within group (order by category) as category
          from shopping_items where archived = true
          group by lower(name), name order by times desc, max(created_at) desc limit 40`,
    ),
  ]);
  const activeNames = new Set(active.filter((a) => !a.checked).map((a) => a.name.toLowerCase()));
  const seen = new Set<string>();
  const suggestions = history.rows.filter((h) => {
    const k = h.name.toLowerCase();
    if (activeNames.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { active, suggestions };
}

export async function getDashboard() {
  const now = new Date();
  const [stats, upcoming, todayEntry, lastEntries, pinned, shopping] = await Promise.all([
    getTodoStats(now),
    db
      .select()
      .from(todos)
      .where(eq(todos.done, false))
      .orderBy(sql`${todos.dueAt} asc nulls last`, desc(todos.priority))
      .limit(4),
    db.query.journalEntries.findFirst({
      where: eq(journalEntries.entryDate, toISODate(now)),
      orderBy: desc(journalEntries.createdAt),
    }),
    getMoodHistory(7),
    db.select().from(notes).orderBy(desc(notes.pinned), desc(notes.updatedAt)).limit(3),
    db
      .select()
      .from(shoppingItems)
      .where(and(eq(shoppingItems.archived, false), eq(shoppingItems.checked, false)))
      .orderBy(asc(shoppingItems.createdAt))
      .limit(50),
  ]);
  return { stats, upcoming, todayEntry, moods: lastEntries, pinned, shopping };
}

export async function search(q: string) {
  const term = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
  const [j, t, n, s] = await Promise.all([
    db
      .select()
      .from(journalEntries)
      .where(or(ilike(journalEntries.title, term), ilike(journalEntries.content, term)))
      .orderBy(desc(journalEntries.entryDate))
      .limit(20),
    db
      .select()
      .from(todos)
      .where(or(ilike(todos.title, term), ilike(todos.notes, term)))
      .orderBy(asc(todos.done), desc(todos.createdAt))
      .limit(20),
    db
      .select()
      .from(notes)
      .where(or(ilike(notes.title, term), ilike(notes.content, term)))
      .orderBy(desc(notes.updatedAt))
      .limit(20),
    db
      .select()
      .from(shoppingItems)
      .where(and(eq(shoppingItems.archived, false), or(ilike(shoppingItems.name, term), ilike(shoppingItems.note, term))))
      .limit(20),
  ]);
  return { journal: j, todos: t, notes: n, shopping: s };
}

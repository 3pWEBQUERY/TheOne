"use server";

import { and, eq } from "drizzle-orm";
import { db, todos, type ImageRef } from "@/db";
import { sanitizeImages } from "@/lib/images";
import { deleteObjects, deleteRemovedImages, imageKeys } from "@/lib/storage";
import { addDays, addMonths } from "@/lib/dates";
import { guard, isUuid, optDate, refreshAll, str } from "./util";

export type TodoInput = {
  id?: string;
  title: string;
  notes?: string;
  priority?: number;
  dueAt?: string | null;
  remindAt?: string | null;
  repeat?: string;
  images?: ImageRef[];
};

const REPEATS = ["none", "daily", "weekdays", "weekly", "monthly"] as const;

export async function saveTodo(input: TodoInput) {
  await guard();
  const title = str(input.title, 500).trim();
  if (!title) return { error: "Bitte gib einen Titel ein." };

  const remindAt = optDate(input.remindAt);
  const values = {
    title,
    notes: str(input.notes),
    priority: [0, 1, 2].includes(Number(input.priority)) ? Number(input.priority) : 1,
    dueAt: optDate(input.dueAt),
    remindAt,
    repeat: (REPEATS as readonly string[]).includes(input.repeat ?? "") ? input.repeat! : "none",
    images: sanitizeImages(input.images),
    updatedAt: new Date(),
  };

  if (input.id && isUuid(input.id)) {
    const existing = await db.query.todos.findFirst({ where: eq(todos.id, input.id) });
    if (!existing) return { error: "Aufgabe nicht gefunden." };
    const reminderChanged = existing.remindAt?.getTime() !== remindAt?.getTime();
    await db
      .update(todos)
      .set({ ...values, ...(reminderChanged ? { reminderSentAt: null } : {}) })
      .where(eq(todos.id, input.id));
    await deleteRemovedImages(existing.images, values.images);
  } else {
    await db.insert(todos).values(values);
  }
  refreshAll();
  return { ok: true };
}

function nextOccurrence(d: Date, repeat: string) {
  switch (repeat) {
    case "daily":
      return addDays(d, 1);
    case "weekdays": {
      let x = addDays(d, 1);
      while (x.getDay() === 0 || x.getDay() === 6) x = addDays(x, 1);
      return x;
    }
    case "weekly":
      return addDays(d, 7);
    case "monthly":
      return addMonths(d, 1);
    default:
      return d;
  }
}

export async function toggleTodo(id: string, done: boolean) {
  await guard();
  if (!isUuid(id)) return { error: "Ungültig" };
  const todo = await db.query.todos.findFirst({ where: eq(todos.id, id) });
  if (!todo) return { error: "Aufgabe nicht gefunden." };
  const now = new Date();

  if (done && todo.repeat !== "none") {
    // Keep a completed copy for history/streaks, then roll the original forward.
    await db.insert(todos).values({
      title: todo.title,
      notes: todo.notes,
      priority: todo.priority,
      dueAt: todo.dueAt,
      done: true,
      completedAt: now,
    });
    let due = todo.dueAt ?? now;
    do due = nextOccurrence(due, todo.repeat);
    while (due.getTime() < now.getTime() - 86_400_000);
    const offset = todo.remindAt && todo.dueAt ? todo.dueAt.getTime() - todo.remindAt.getTime() : null;
    await db
      .update(todos)
      .set({
        dueAt: due,
        remindAt: offset !== null ? new Date(due.getTime() - offset) : todo.remindAt ? nextOccurrence(todo.remindAt, todo.repeat) : null,
        reminderSentAt: null,
        updatedAt: now,
      })
      .where(eq(todos.id, id));
    refreshAll();
    return { ok: true, rolled: true };
  }

  await db
    .update(todos)
    .set({ done, completedAt: done ? now : null, updatedAt: now })
    .where(eq(todos.id, id));
  refreshAll();
  return { ok: true };
}

export async function deleteTodo(id: string) {
  await guard();
  if (!isUuid(id)) return { error: "Ungültig" };
  const [row] = await db.delete(todos).where(eq(todos.id, id)).returning();
  if (row) await deleteObjects(imageKeys(row.images));
  refreshAll();
  return { ok: true };
}

export async function clearCompletedTodos() {
  await guard();
  const rows = await db.delete(todos).where(eq(todos.done, true)).returning({ images: todos.images });
  await deleteObjects(rows.flatMap((r) => imageKeys(r.images)));
  refreshAll();
  return { ok: true, count: rows.length };
}

export async function snoozeTodo(id: string, minutes: number) {
  await guard();
  if (!isUuid(id)) return { error: "Ungültig" };
  const at = new Date(Date.now() + Math.min(Math.max(minutes, 5), 60 * 24 * 7) * 60_000);
  await db.update(todos).set({ remindAt: at, reminderSentAt: null, updatedAt: new Date() }).where(eq(todos.id, id));
  refreshAll();
  return { ok: true, remindAt: at.toISOString() };
}

"use server";

import { and, eq } from "drizzle-orm";
import { db, notes, shoppingItems, todos, type ImageRef } from "@/db";
import { sanitizeImages } from "@/lib/images";
import { deleteObjects, deleteRemovedImages, imageKeys } from "@/lib/storage";
import { detectCategory, parseItemInput } from "@/lib/categories";
import { NOTE_COLOR_IDS } from "@/lib/note-colors";
import { guard, isUuid, refreshAll, str } from "./util";

export type NoteInput = {
  id?: string;
  title?: string;
  content?: string;
  color?: string;
  pinned?: boolean;
  images?: ImageRef[];
};

export async function saveNote(input: NoteInput) {
  const userId = await guard();
  const values = {
    title: str(input.title, 300).trim(),
    content: str(input.content, 100_000),
    color: NOTE_COLOR_IDS.includes(input.color ?? "") ? input.color! : "default",
    pinned: !!input.pinned,
    images: sanitizeImages(input.images, userId),
    updatedAt: new Date(),
  };
  if (!values.title && !values.content.trim() && values.images.length === 0) {
    return { error: "Die Notiz ist leer." };
  }

  if (input.id && isUuid(input.id)) {
    const own = and(eq(notes.id, input.id), eq(notes.userId, userId));
    const existing = await db.query.notes.findFirst({ where: own });
    if (!existing) return { error: "Notiz nicht gefunden." };
    await db.update(notes).set(values).where(own);
    await deleteRemovedImages(existing.images, values.images);
  } else {
    await db.insert(notes).values({ ...values, userId });
  }
  refreshAll();
  return { ok: true };
}

export async function toggleNotePin(id: string, pinned: boolean) {
  const userId = await guard();
  if (!isUuid(id)) return { error: "Ungültig" };
  await db
    .update(notes)
    .set({ pinned })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)));
  refreshAll();
  return { ok: true };
}

export async function deleteNote(id: string) {
  const userId = await guard();
  if (!isUuid(id)) return { error: "Ungültig" };
  const [row] = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning();
  if (row) await deleteObjects(imageKeys(row.images));
  refreshAll();
  return { ok: true };
}

function noteLines(content: string) {
  return content
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•+]|\d+[.)]|\[[ xX]?\])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 100);
}

/** Every line of the note becomes a shopping list item. */
export async function noteToShopping(id: string) {
  const userId = await guard();
  if (!isUuid(id)) return { error: "Ungültig" };
  const note = await db.query.notes.findFirst({ where: and(eq(notes.id, id), eq(notes.userId, userId)) });
  if (!note) return { error: "Notiz nicht gefunden." };
  const lines = noteLines(note.content);
  if (lines.length === 0) return { error: "Die Notiz enthält keine Zeilen." };
  await db.insert(shoppingItems).values(
    lines.map((l) => {
      const { name, quantity } = parseItemInput(l);
      return { userId, name, quantity, category: detectCategory(name) };
    }),
  );
  refreshAll();
  return { ok: true, count: lines.length };
}

/** Every line of the note becomes a todo. */
export async function noteToTodos(id: string) {
  const userId = await guard();
  if (!isUuid(id)) return { error: "Ungültig" };
  const note = await db.query.notes.findFirst({ where: and(eq(notes.id, id), eq(notes.userId, userId)) });
  if (!note) return { error: "Notiz nicht gefunden." };
  const lines = noteLines(note.content);
  if (lines.length === 0) return { error: "Die Notiz enthält keine Zeilen." };
  await db.insert(todos).values(lines.map((title) => ({ userId, title: title.slice(0, 500), notes: note.title ? `Aus Notiz: ${note.title}` : "" })));
  refreshAll();
  return { ok: true, count: lines.length };
}

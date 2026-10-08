"use server";

import { and, eq } from "drizzle-orm";
import { db, journalEntries, type ImageRef } from "@/db";
import { sanitizeImages } from "@/lib/images";
import { deleteObjects, deleteRemovedImages, imageKeys } from "@/lib/storage";
import { toISODate } from "@/lib/dates";
import { guard, isUuid, refreshAll, str } from "./util";

export type JournalInput = {
  id?: string;
  title?: string;
  content: string;
  mood?: number | null;
  entryDate?: string;
  images?: ImageRef[];
};

export async function saveJournalEntry(input: JournalInput) {
  const userId = await guard();
  const content = str(input.content, 100_000);
  const images = sanitizeImages(input.images, userId);
  const title = str(input.title, 300).trim();
  if (!content.trim() && !title && images.length === 0) {
    return { error: "Schreib etwas oder füge ein Bild hinzu." };
  }
  const mood = Number(input.mood);
  const values = {
    title,
    content,
    mood: mood >= 1 && mood <= 5 ? mood : null,
    entryDate: /^\d{4}-\d{2}-\d{2}$/.test(input.entryDate ?? "") ? input.entryDate! : toISODate(new Date()),
    images,
    updatedAt: new Date(),
  };

  if (input.id && isUuid(input.id)) {
    const own = and(eq(journalEntries.id, input.id), eq(journalEntries.userId, userId));
    const existing = await db.query.journalEntries.findFirst({ where: own });
    if (!existing) return { error: "Eintrag nicht gefunden." };
    await db.update(journalEntries).set(values).where(own);
    await deleteRemovedImages(existing.images, images);
    refreshAll();
    return { ok: true, id: input.id };
  }
  const [row] = await db.insert(journalEntries).values({ ...values, userId }).returning({ id: journalEntries.id });
  refreshAll();
  return { ok: true, id: row.id };
}

export async function deleteJournalEntry(id: string) {
  const userId = await guard();
  if (!isUuid(id)) return { error: "Ungültig" };
  const [row] = await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning();
  if (row) await deleteObjects(imageKeys(row.images));
  refreshAll();
  return { ok: true };
}

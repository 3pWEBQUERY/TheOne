"use server";

import { eq } from "drizzle-orm";
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
  await guard();
  const content = str(input.content, 100_000);
  const images = sanitizeImages(input.images);
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
    const existing = await db.query.journalEntries.findFirst({ where: eq(journalEntries.id, input.id) });
    if (!existing) return { error: "Eintrag nicht gefunden." };
    await db.update(journalEntries).set(values).where(eq(journalEntries.id, input.id));
    await deleteRemovedImages(existing.images, images);
    refreshAll();
    return { ok: true, id: input.id };
  }
  const [row] = await db.insert(journalEntries).values(values).returning({ id: journalEntries.id });
  refreshAll();
  return { ok: true, id: row.id };
}

export async function deleteJournalEntry(id: string) {
  await guard();
  if (!isUuid(id)) return { error: "Ungültig" };
  const [row] = await db.delete(journalEntries).where(eq(journalEntries.id, id)).returning();
  if (row) await deleteObjects(imageKeys(row.images));
  refreshAll();
  return { ok: true };
}

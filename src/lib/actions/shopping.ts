"use server";

import { and, eq } from "drizzle-orm";
import { db, shoppingItems, type ImageRef } from "@/db";
import { sanitizeImages } from "@/lib/images";
import { deleteObjects, deleteRemovedImages, imageKeys } from "@/lib/storage";
import { CATEGORY_MAP, detectCategory, parseItemInput } from "@/lib/categories";
import { guard, isUuid, refreshAll, str } from "./util";

/** Accepts "Milch, 2x Eier\nBrot" – each part becomes an item. */
export async function addShoppingItems(raw: string, images?: ImageRef[]) {
  await guard();
  const parts = str(raw, 5000)
    .split(/[\n,;]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 50);
  if (parts.length === 0) return { error: "Bitte gib einen Artikel ein." };
  const imgs = sanitizeImages(images);
  await db.insert(shoppingItems).values(
    parts.map((p, i) => {
      const { name, quantity } = parseItemInput(p);
      return {
        name: name.slice(0, 200),
        quantity,
        category: detectCategory(name),
        images: i === 0 ? imgs : [],
      };
    }),
  );
  refreshAll();
  return { ok: true, count: parts.length };
}

export type ShoppingItemInput = {
  id: string;
  name: string;
  quantity?: string;
  category?: string;
  note?: string;
  images?: ImageRef[];
};

export async function updateShoppingItem(input: ShoppingItemInput) {
  await guard();
  if (!isUuid(input.id)) return { error: "Ungültig" };
  const name = str(input.name, 200).trim();
  if (!name) return { error: "Name fehlt." };
  const existing = await db.query.shoppingItems.findFirst({ where: eq(shoppingItems.id, input.id) });
  if (!existing) return { error: "Artikel nicht gefunden." };
  const images = sanitizeImages(input.images);
  await db
    .update(shoppingItems)
    .set({
      name,
      quantity: str(input.quantity, 50).trim(),
      category: input.category && CATEGORY_MAP[input.category] ? input.category : detectCategory(name),
      note: str(input.note, 1000),
      images,
      updatedAt: new Date(),
    })
    .where(eq(shoppingItems.id, input.id));
  await deleteRemovedImages(existing.images, images);
  refreshAll();
  return { ok: true };
}

export async function toggleShoppingItem(id: string, checked: boolean) {
  await guard();
  if (!isUuid(id)) return { error: "Ungültig" };
  await db
    .update(shoppingItems)
    .set({ checked, checkedAt: checked ? new Date() : null })
    .where(eq(shoppingItems.id, id));
  refreshAll();
  return { ok: true };
}

export async function deleteShoppingItem(id: string) {
  await guard();
  if (!isUuid(id)) return { error: "Ungültig" };
  const [row] = await db.delete(shoppingItems).where(eq(shoppingItems.id, id)).returning();
  if (row) await deleteObjects(imageKeys(row.images));
  refreshAll();
  return { ok: true };
}

/** Moves all checked items into the purchase history. */
export async function finishShopping() {
  await guard();
  const rows = await db
    .update(shoppingItems)
    .set({ archived: true })
    .where(and(eq(shoppingItems.checked, true), eq(shoppingItems.archived, false)))
    .returning({ id: shoppingItems.id });
  refreshAll();
  return { ok: true, count: rows.length };
}

export async function clearShoppingHistory() {
  await guard();
  const rows = await db.delete(shoppingItems).where(eq(shoppingItems.archived, true)).returning({ images: shoppingItems.images });
  await deleteObjects(rows.flatMap((r) => imageKeys(r.images)));
  refreshAll();
  return { ok: true };
}

import type { ImageRef } from "@/db/schema";

// New uploads: uploads/<userId>/<yyyy>/<mm>/<uuid>.webp – legacy (pre-accounts): uploads/<yyyy>/<mm>/<uuid>.webp
const KEY_RE =
  /^uploads\/(?:([0-9a-f-]{36})\/)?\d{4}\/\d{2}\/[0-9a-f-]{36}(-thumb)?\.(webp|jpg|jpeg|png|gif)$/;

export function isValidKey(key: unknown): key is string {
  return typeof key === "string" && KEY_RE.test(key);
}

/** Owner encoded in the key, or null for legacy keys. */
export function keyOwner(key: string) {
  return key.match(KEY_RE)?.[1] ?? null;
}

/** A user may reference their own uploads and legacy uploads (only reachable through rows they own). */
export function canUseKey(key: string, userId: string) {
  const owner = keyOwner(key);
  return owner === null || owner === userId;
}

/** Sanitizes image refs coming from the client. */
export function sanitizeImages(input: unknown, userId: string): ImageRef[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (i): i is ImageRef =>
        !!i &&
        typeof i === "object" &&
        isValidKey((i as ImageRef).key) &&
        isValidKey((i as ImageRef).thumb) &&
        canUseKey((i as ImageRef).key, userId) &&
        canUseKey((i as ImageRef).thumb, userId),
    )
    .slice(0, 20)
    .map((i) => ({
      key: i.key,
      thumb: i.thumb,
      w: Math.max(0, Math.round(Number(i.w) || 0)),
      h: Math.max(0, Math.round(Number(i.h) || 0)),
    }));
}

export function imageUrl(key: string) {
  return `/api/images/${key}`;
}

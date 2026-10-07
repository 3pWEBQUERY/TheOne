import type { ImageRef } from "@/db/schema";

const KEY_RE = /^uploads\/\d{4}\/\d{2}\/[0-9a-f-]{36}(-thumb)?\.(webp|jpg|jpeg|png|gif)$/;

export function isValidKey(key: unknown): key is string {
  return typeof key === "string" && KEY_RE.test(key);
}

/** Sanitizes image refs coming from the client. */
export function sanitizeImages(input: unknown): ImageRef[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (i): i is ImageRef =>
        !!i && typeof i === "object" && isValidKey((i as ImageRef).key) && isValidKey((i as ImageRef).thumb),
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

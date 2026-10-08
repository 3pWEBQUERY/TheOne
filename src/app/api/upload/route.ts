import { randomUUID } from "node:crypto";
import sharp, { type OutputInfo } from "sharp";
import { getCurrentUser } from "@/lib/auth";
import { putObject } from "@/lib/storage";
import type { ImageRef } from "@/db/schema";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  if (!file) return Response.json({ error: "Keine Datei" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Bild ist größer als 25 MB" }, { status: 413 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  let full: { data: Buffer; info: OutputInfo };
  let thumb: Buffer;
  try {
    const base = sharp(input, { failOn: "none" }).rotate();
    full = await base
      .clone()
      .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    thumb = await base
      .clone()
      .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
  } catch (err) {
    console.error("[upload] Bild konnte nicht verarbeitet werden", err);
    return Response.json(
      { error: "Dieses Bildformat wird nicht unterstützt. Bitte JPG, PNG, WebP oder GIF verwenden." },
      { status: 415 },
    );
  }

  const now = new Date();
  const prefix = `uploads/${user.id}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const id = randomUUID();
  const ref: ImageRef = {
    key: `${prefix}/${id}.webp`,
    thumb: `${prefix}/${id}-thumb.webp`,
    w: full.info.width,
    h: full.info.height,
  };

  try {
    await Promise.all([
      putObject(ref.key, full.data, "image/webp"),
      putObject(ref.thumb, thumb, "image/webp"),
    ]);
  } catch (err) {
    console.error("[upload] Speichern im Bucket fehlgeschlagen", err);
    return Response.json({ error: "Speichern fehlgeschlagen" }, { status: 502 });
  }

  return Response.json(ref);
}

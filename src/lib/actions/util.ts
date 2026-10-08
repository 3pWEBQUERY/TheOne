import "server-only";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

/** Ensures a signed-in user and returns their id. */
export async function guard() {
  const user = await requireUser();
  return user.id;
}

export function refreshAll() {
  revalidatePath("/", "layout");
}

export function str(v: unknown, max = 10_000) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export function optDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
}

import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";

export async function guard() {
  await requireAuth();
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

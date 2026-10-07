"use server";

import { timingSafeEqual, createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/session";

const attempts = new Map<string, { count: number; until: number }>();

function hash(s: string) {
  return createHash("sha256").update(s).digest();
}

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return { error: "APP_PASSWORD ist auf dem Server nicht gesetzt." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && a.count >= 5 && a.until > now) {
    return { error: `Zu viele Versuche. Bitte warte ${Math.ceil((a.until - now) / 60000)} Min.` };
  }

  const password = String(formData.get("password") ?? "");
  const ok = timingSafeEqual(hash(password), hash(expected));
  if (!ok) {
    const count = (a && a.until > now ? a.count : 0) + 1;
    attempts.set(ip, { count, until: now + 10 * 60_000 });
    await new Promise((r) => setTimeout(r, 400));
    return { error: "Falsches Passwort." };
  }
  attempts.delete(ip);

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

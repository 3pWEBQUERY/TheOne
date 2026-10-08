"use server";

import { count, eq, isNull } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  db,
  journalEntries,
  notes,
  pushSubscriptions,
  settings,
  shoppingItems,
  todos,
  userSettings,
  users,
} from "@/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import { getCurrentUser, requireUser } from "@/lib/auth";

const attempts = new Map<string, { count: number; until: number }>();

export type AuthState = { error?: string; ok?: boolean; email?: string; name?: string };

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

async function rateLimited(ip: string) {
  const a = attempts.get(ip);
  const now = Date.now();
  if (a && a.count >= 8 && a.until > now) return Math.ceil((a.until - now) / 60000);
  return 0;
}

function recordFailure(ip: string) {
  const now = Date.now();
  const a = attempts.get(ip);
  attempts.set(ip, { count: (a && a.until > now ? a.count : 0) + 1, until: now + 10 * 60_000 });
}

async function startSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(userId), sessionCookieOptions);
}

function safeNext(v: FormDataEntryValue | null) {
  const next = String(v ?? "/");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

const normEmail = (v: FormDataEntryValue | null) => String(v ?? "").trim().toLowerCase().slice(0, 200);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await clientIp();
  const wait = await rateLimited(ip);
  const email = normEmail(formData.get("email"));
  if (wait) return { error: `Zu viele Versuche. Bitte warte ${wait} Min.`, email };

  const password = String(formData.get("password") ?? "");
  const user = email ? await db.query.users.findFirst({ where: eq(users.email, email) }) : undefined;
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    recordFailure(ip);
    await new Promise((r) => setTimeout(r, 400));
    return { error: "E-Mail oder Passwort ist falsch.", email };
  }
  attempts.delete(ip);
  await startSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (process.env.ALLOW_REGISTRATION === "false") {
    return { error: "Die Registrierung ist derzeit geschlossen." };
  }
  const ip = await clientIp();
  const wait = await rateLimited(ip);
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const email = normEmail(formData.get("email"));
  const fail = (error: string): AuthState => ({ error, name, email });
  if (wait) return fail(`Zu viele Versuche. Bitte warte ${wait} Min.`);
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!name) return fail("Bitte gib deinen Namen ein.");
  if (!EMAIL_RE.test(email)) return fail("Bitte gib eine gültige E-Mail-Adresse ein.");
  if (password.length < 8) return fail("Das Passwort muss mindestens 8 Zeichen haben.");
  if (password !== confirm) return fail("Die Passwörter stimmen nicht überein.");

  const existing = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
  if (existing) {
    recordFailure(ip);
    return fail("Mit dieser E-Mail gibt es bereits ein Konto.");
  }

  const passwordHash = await hashPassword(password);
  const userId = await db.transaction(async (tx) => {
    const [{ value: before }] = await tx.select({ value: count() }).from(users);
    const [created] = await tx.insert(users).values({ email, name, passwordHash }).returning({ id: users.id });
    // The very first account takes over everything created before accounts existed.
    if (before === 0) {
      for (const table of [journalEntries, todos, notes, shoppingItems, pushSubscriptions]) {
        await tx.update(table).set({ userId: created.id }).where(isNull(table.userId));
      }
      const legacy = await tx.select().from(settings);
      for (const row of legacy) {
        await tx.insert(userSettings).values({ userId: created.id, key: row.key, value: row.value }).onConflictDoNothing();
      }
    }
    return created.id;
  });

  await startSession(userId);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function updateProfile(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: "Bitte gib einen Namen ein." };
  await db.update(users).set({ name }).where(eq(users.id, user.id));
  return { ok: true };
}

export async function changePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  const user = await db.query.users.findFirst({ where: eq(users.id, current.id) });
  if (!user) redirect("/login");
  const oldPw = String(formData.get("current") ?? "");
  const newPw = String(formData.get("password") ?? "");
  if (!(await verifyPassword(oldPw, user.passwordHash))) return { error: "Das aktuelle Passwort ist falsch." };
  if (newPw.length < 8) return { error: "Das neue Passwort muss mindestens 8 Zeichen haben." };
  await db.update(users).set({ passwordHash: await hashPassword(newPw) }).where(eq(users.id, user.id));
  return { ok: true };
}

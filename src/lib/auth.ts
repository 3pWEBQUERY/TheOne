import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, users } from "@/db";
import { SESSION_COOKIE, readSessionToken } from "./session";

export type CurrentUser = { id: string; email: string; name: string };

/** The signed-in user (cached per request), or null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { id: true, email: true, name: true },
  });
  return user ?? null;
});

/** For pages and server actions: returns the user or redirects to the login. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

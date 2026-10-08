import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "theone_session";
/** Browsers cap cookie lifetime at 400 days; the session is renewed on use, so it never expires while in use. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 400;
/** Re-issue the cookie once it is older than this. */
export const SESSION_RENEW_AFTER = 60 * 60 * 24;

export type Session = { userId: string; issuedAt: number };

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET fehlt oder ist zu kurz (mind. 16 Zeichen)");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function readSessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    // Tokens from the single-user era have sub "owner" – they are no longer valid.
    if (!payload.sub || !/^[0-9a-f-]{36}$/i.test(payload.sub)) return null;
    return { userId: payload.sub, issuedAt: payload.iat ?? 0 };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

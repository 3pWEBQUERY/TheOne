import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_RENEW_AFTER,
  createSessionToken,
  readSessionToken,
  sessionCookieOptions,
} from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/register", "/api/health", "/offline"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (session) {
    const res = NextResponse.next();
    // Sliding session: keep users signed in until they log out themselves.
    if (Date.now() / 1000 - session.issuedAt > SESSION_RENEW_AFTER && request.method === "GET") {
      res.cookies.set(SESSION_COOKIE, await createSessionToken(session.userId), sessionCookieOptions);
    }
    return res;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname + search)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|apple-touch-icon.png|robots.txt).*)",
  ],
};

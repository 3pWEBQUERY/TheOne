import { isAuthenticated } from "@/lib/auth";
import { isValidKey } from "@/lib/images";
import { getObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: RouteContext<"/api/images/[...key]">) {
  if (!(await isAuthenticated())) return new Response("Unauthorized", { status: 401 });

  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!isValidKey(key)) return new Response("Not found", { status: 404 });

  try {
    const obj = await getObject(key);
    if (!obj.Body) return new Response("Not found", { status: 404 });
    return new Response(obj.Body.transformToWebStream(), {
      headers: {
        "Content-Type": obj.ContentType ?? "image/webp",
        "Cache-Control": "private, max-age=31536000, immutable",
        ...(obj.ContentLength ? { "Content-Length": String(obj.ContentLength) } : {}),
      },
    });
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return new Response("Not found", { status: 404 });
    console.error("[images] Laden fehlgeschlagen", err);
    return new Response("Fehler", { status: 502 });
  }
}

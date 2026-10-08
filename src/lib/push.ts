import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db, pushSubscriptions } from "@/db";

let configured = false;

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY ?? "";
}

function configure() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:theone@example.com", pub, priv);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/** Sends a notification to every device the user has subscribed. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!configure()) return { sent: 0, failed: 0 };
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 6 },
        );
        sent++;
      } catch (err) {
        failed++;
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
        } else {
          console.error("[push] Senden fehlgeschlagen", code, (err as Error).message);
        }
      }
    }),
  );
  return { sent, failed };
}

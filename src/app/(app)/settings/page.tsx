import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { count, eq } from "drizzle-orm";
import { db, journalEntries, notes, shoppingItems, todos } from "@/db";
import { getNotificationSettings } from "@/lib/settings";
import { SettingsPanel } from "@/components/settings-panel";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const [cfg, [j], [t], [n], [s]] = await Promise.all([
    getNotificationSettings(),
    db.select({ v: count() }).from(journalEntries),
    db.select({ v: count() }).from(todos).where(eq(todos.done, true)),
    db.select({ v: count() }).from(notes),
    db.select({ v: count() }).from(shoppingItems).where(eq(shoppingItems.archived, true)),
  ]);

  const stats = [
    { label: "Tagebucheinträge", value: j.v, emoji: "📔" },
    { label: "Erledigte Aufgaben", value: t.v, emoji: "✅" },
    { label: "Notizen", value: n.v, emoji: "🗒️" },
    { label: "Gekaufte Artikel", value: s.v, emoji: "🛒" },
  ];

  return (
    <div className="page">
      <header className="mb-5 flex items-center gap-2">
        <Link href="/" className="glass glass-pill icon-btn" aria-label="Zurück">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="page-title">Einstellungen</h1>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-3">
        {stats.map((x) => (
          <div key={x.label} className="glass rounded-[24px] p-4">
            <div className="text-2xl">{x.emoji}</div>
            <div className="mt-1 text-2xl font-extrabold">{x.value}</div>
            <div className="muted text-xs font-semibold">{x.label}</div>
          </div>
        ))}
      </section>

      <SettingsPanel initial={cfg} />

      <p className="faint mt-6 text-center text-xs">TheOne · Next.js · Railway Postgres & Bucket</p>
    </div>
  );
}

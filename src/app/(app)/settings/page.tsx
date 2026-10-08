import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, CircleCheckBig, NotebookPen, ShoppingCart } from "lucide-react";
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
    { label: "Tagebucheinträge", value: j.v, icon: BookOpen },
    { label: "Erledigte Aufgaben", value: t.v, icon: CircleCheckBig },
    { label: "Notizen", value: n.v, icon: NotebookPen },
    { label: "Gekaufte Artikel", value: s.v, icon: ShoppingCart },
  ];

  return (
    <div className="page">
      <header className="mb-5 flex items-center gap-2">
        <Link href="/" className="icon-btn -ml-2 lg:hidden" aria-label="Zurück">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="page-title">Einstellungen</h1>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((x) => (
          <div key={x.label} className="glass flex items-center gap-3 rounded-xl p-3">
            <span className="icon-tile">
              <x.icon size={16} />
            </span>
            <div className="min-w-0">
              <div className="text-lg leading-tight font-semibold tabular-nums">{x.value}</div>
              <div className="muted truncate text-xs font-medium">{x.label}</div>
            </div>
          </div>
        ))}
      </section>

      <SettingsPanel initial={cfg} />

      <p className="faint mt-6 text-center text-xs">TheOne · Next.js · Railway Postgres & Bucket</p>
    </div>
  );
}

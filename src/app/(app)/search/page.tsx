import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { search } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { formatDate, relativeDue } from "@/lib/dates";

import { CATEGORY_MAP } from "@/lib/categories";

export const metadata: Metadata = { title: "Suche" };

export default async function SearchPage(props: PageProps<"/search">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const user = await requireUser();
  const r = q ? await search(user.id, q) : null;
  const total = r ? r.journal.length + r.todos.length + r.notes.length + r.shopping.length : 0;

  return (
    <div className="page">
      <header className="mb-4 flex items-center gap-2">
        <Link href="/" className="icon-btn -ml-2" aria-label="Zurück">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="page-title">Suche</h1>
      </header>
      <form className="glass mb-5 flex items-center gap-2 rounded-xl px-3.5">
        <Search size={17} className="faint" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Tagebuch, Aufgaben, Notizen, Einkauf…"
          className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-[var(--text-3)]"
          enterKeyHint="search"
        />
      </form>

      {r && total === 0 && (
        <EmptyState icon={SearchX} title={`Nichts gefunden für „${q}“`} text="Versuche einen anderen Suchbegriff." />
      )}

      {r && (
        <div className="space-y-5">
          <Group title="Aufgaben" show={r.todos.length > 0}>
            {r.todos.map((t) => (
              <Row key={t.id} href={`/todos?open=${t.id}`} title={`${t.title}${t.done ? " (erledigt)" : ""}`} sub={t.dueAt ? relativeDue(t.dueAt) : t.notes} />
            ))}
          </Group>
          <Group title="Tagebuch" show={r.journal.length > 0}>
            {r.journal.map((e) => (
              <Row
                key={e.id}
                href={`/journal?open=${e.id}`}
                title={e.title || formatDate(e.entryDate)}
                sub={e.content}
              />
            ))}
          </Group>
          <Group title="Notizen" show={r.notes.length > 0}>
            {r.notes.map((n) => (
              <Row key={n.id} href={`/notes?open=${n.id}`} title={n.title || n.content.split("\n")[0]} sub={n.content} />
            ))}
          </Group>
          <Group title="Einkauf" show={r.shopping.length > 0}>
            {r.shopping.map((s) => (
              <Row
                key={s.id}
                href={`/shopping?open=${s.id}`}
                title={s.name}
                sub2={CATEGORY_MAP[s.category]?.label}
                sub={[s.quantity, s.note].filter(Boolean).join(" · ")}
              />
            ))}
          </Group>
        </div>
      )}
    </div>
  );
}

function Group({ title, show, children }: { title: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <section>
      <h2 className="section-title mb-2 px-1">{title}</h2>
      <div className="glass divide-soft overflow-hidden rounded-xl">
        {children}
      </div>
    </section>
  );
}

function Row({ href, title, sub, sub2 }: { href: string; title: string; sub?: string | null; sub2?: string }) {
  return (
    <Link href={href} className="block px-4 py-3 transition-colors hover:bg-[var(--surface-hover)]">
      <p className="truncate text-[15px] font-medium">{title}</p>
      {(sub || sub2) && <p className="muted truncate text-sm">{[sub2, sub].filter(Boolean).join(" · ")}</p>}
    </Link>
  );
}

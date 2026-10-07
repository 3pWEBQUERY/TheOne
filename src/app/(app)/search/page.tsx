import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { search } from "@/lib/queries";
import { formatDate, relativeDue } from "@/lib/dates";
import { moodEmoji } from "@/lib/motivation";
import { CATEGORY_MAP } from "@/lib/categories";

export const metadata: Metadata = { title: "Suche" };

export default async function SearchPage(props: PageProps<"/search">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const r = q ? await search(q) : null;
  const total = r ? r.journal.length + r.todos.length + r.notes.length + r.shopping.length : 0;

  return (
    <div className="page">
      <header className="mb-4 flex items-center gap-2">
        <Link href="/" className="glass glass-pill icon-btn" aria-label="Zurück">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="page-title">Suche</h1>
      </header>
      <form className="glass glass-pill mb-5 flex items-center gap-2 px-4">
        <Search size={18} className="faint" />
        <input
          name="q"
          defaultValue={q}
          autoFocus={!q}
          placeholder="Tagebuch, Aufgaben, Notizen, Einkauf…"
          className="min-w-0 flex-1 bg-transparent py-3 outline-none"
          enterKeyHint="search"
        />
      </form>

      {r && total === 0 && (
        <div className="glass rounded-[28px] p-8 text-center">
          <div className="mb-2 text-4xl">🔍</div>
          <p className="font-bold">Nichts gefunden für „{q}“</p>
        </div>
      )}

      {r && (
        <div className="space-y-5">
          <Group title="Aufgaben" show={r.todos.length > 0}>
            {r.todos.map((t) => (
              <Row key={t.id} href={`/todos?open=${t.id}`} title={`${t.done ? "✅ " : ""}${t.title}`} sub={t.dueAt ? relativeDue(t.dueAt) : t.notes} />
            ))}
          </Group>
          <Group title="Tagebuch" show={r.journal.length > 0}>
            {r.journal.map((e) => (
              <Row
                key={e.id}
                href={`/journal?open=${e.id}`}
                title={`${moodEmoji(e.mood)} ${e.title || formatDate(e.entryDate)}`}
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
                title={`${CATEGORY_MAP[s.category]?.emoji ?? ""} ${s.name}`}
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
      <div className="glass divide-y overflow-hidden rounded-[24px]" style={{ borderColor: "var(--divider)" }}>
        {children}
      </div>
    </section>
  );
}

function Row({ href, title, sub }: { href: string; title: string; sub?: string | null }) {
  return (
    <Link href={href} className="block px-4 py-3" style={{ borderColor: "var(--divider)" }}>
      <p className="truncate font-semibold">{title}</p>
      {sub && <p className="muted truncate text-sm">{sub}</p>}
    </Link>
  );
}

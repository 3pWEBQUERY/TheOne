import Link from "next/link";
import { BookHeart, CheckCircle2, ChevronRight, Flame, PenLine, Plus, Search, Settings, ShoppingBasket, StickyNote } from "lucide-react";
import { getDashboard } from "@/lib/queries";
import { greeting, formatDate, parseLocalDate } from "@/lib/dates";
import { MOODS, moodEmoji, progressMessage, quoteOfTheDay } from "@/lib/motivation";
import { ProgressRing } from "@/components/progress-ring";
import { MiniShopping, MiniTodos, RefreshOnFocus } from "@/components/dashboard-widgets";

export default async function Dashboard() {
  const now = new Date();
  const { stats, upcoming, todayEntry, moods, pinned, shopping } = await getDashboard();
  const quote = quoteOfTheDay(now);
  const pct = stats.total ? stats.done / stats.total : 0;

  return (
    <div className="page">
      <RefreshOnFocus />
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="muted text-sm font-semibold">{formatDate(now, { weekday: "long", year: undefined })}</p>
          <h1 className="page-title">{greeting(now)} 👋</h1>
        </div>
        <Link href="/settings" className="glass glass-pill icon-btn flex-none" aria-label="Einstellungen">
          <Settings size={20} />
        </Link>
      </header>

      <form action="/search" className="glass glass-pill mb-4 flex items-center gap-2 px-4">
        <Search size={18} className="faint" />
        <input
          name="q"
          placeholder="Alles durchsuchen…"
          className="min-w-0 flex-1 bg-transparent py-3 outline-none"
          enterKeyHint="search"
          aria-label="Suche"
        />
      </form>

      {/* Motivation hero */}
      <section className="glass animate-pop mb-4 overflow-hidden rounded-[30px] p-5">
        <div className="flex items-center gap-4">
          <ProgressRing value={pct} size={84} stroke={9}>
            <div className="text-center leading-tight">
              <div className="text-lg font-extrabold">{Math.round(pct * 100)}%</div>
              <div className="faint text-[10px] font-bold uppercase">heute</div>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold leading-snug">{progressMessage(stats.done, stats.total)}</p>
            <p className="muted mt-1 flex items-center gap-1.5 text-sm">
              <Flame size={16} className="text-orange-500" />
              {stats.streak > 0 ? (
                <span>
                  <b>{stats.streak}</b> {stats.streak === 1 ? "Tag" : "Tage"} in Folge produktiv
                </span>
              ) : (
                <span>Starte heute deine Serie!</span>
              )}
            </p>
          </div>
        </div>
        <blockquote className="mt-4 border-t pt-3 text-sm" style={{ borderColor: "var(--divider)" }}>
          <p className="italic">„{quote.text}“</p>
          <footer className="faint mt-1 text-xs font-semibold">— {quote.author}</footer>
        </blockquote>
      </section>

      {/* Quick actions */}
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {[
          { href: "/journal?new=1", label: "Gedanke", icon: PenLine },
          { href: "/todos?new=1", label: "Aufgabe", icon: CheckCircle2 },
          { href: "/notes?new=1", label: "Notiz", icon: StickyNote },
          { href: "/shopping", label: "Einkauf", icon: ShoppingBasket },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="glass glass-pill glass-interactive flex flex-none items-center gap-2 py-2.5 pr-4 pl-3 text-sm font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-full text-white" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
              <Plus size={15} strokeWidth={3} />
            </span>
            <Icon size={16} className="muted" /> {label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Todos */}
        <Card href="/todos" title="Aufgaben" icon={<CheckCircle2 size={18} />} meta={stats.open ? `${stats.open} fällig` : undefined}>
          <MiniTodos todos={upcoming} />
        </Card>

        {/* Journal */}
        <Card href="/journal" title="Tagebuch" icon={<BookHeart size={18} />}>
          {todayEntry ? (
            <Link href={`/journal?open=${todayEntry.id}`} className="block">
              <p className="text-sm font-semibold">
                Heute {moodEmoji(todayEntry.mood)} {todayEntry.title}
              </p>
              <p className="muted line-clamp-3 text-sm">{todayEntry.content}</p>
            </Link>
          ) : (
            <div>
              <p className="mb-2 text-sm font-semibold">Wie fühlst du dich heute?</p>
              <div className="flex justify-between">
                {MOODS.map((m) => (
                  <Link
                    key={m.value}
                    href={`/journal?new=1&mood=${m.value}`}
                    className="grid h-11 w-11 place-items-center rounded-full text-2xl transition hover:scale-125 active:scale-90"
                    aria-label={m.label}
                  >
                    {m.emoji}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--divider)" }}>
            <span className="faint text-xs font-semibold">Diese Woche</span>
            <div className="flex gap-1.5">
              {moods.map((d) => (
                <span
                  key={d.date}
                  className="grid h-7 w-7 place-items-center rounded-full text-sm"
                  style={{ background: "var(--field-bg)" }}
                  title={formatDate(parseLocalDate(d.date))}
                >
                  {d.mood ? moodEmoji(d.mood) : <span className="faint text-[10px]">{parseLocalDate(d.date).getDate()}</span>}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card href="/notes" title="Notizen" icon={<StickyNote size={18} />}>
          {pinned.length === 0 ? (
            <p className="muted py-2 text-sm">Noch keine Notizen.</p>
          ) : (
            <div className="space-y-2">
              {pinned.map((n) => (
                <Link
                  key={n.id}
                  href={`/notes?open=${n.id}`}
                  className={`block rounded-2xl p-3 ${n.color !== "default" ? `glass tint-${n.color}` : ""}`}
                  style={n.color === "default" ? { background: "var(--field-bg)" } : undefined}
                >
                  <p className="truncate text-sm font-bold">{n.title || n.content.split("\n")[0] || "Bild-Notiz"}</p>
                  {n.title && n.content && <p className="muted truncate text-xs">{n.content.split("\n")[0]}</p>}
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Shopping */}
        <Card href="/shopping" title="Einkauf" icon={<ShoppingBasket size={18} />} meta={shopping.length ? `${shopping.length} offen` : undefined}>
          <MiniShopping items={shopping} />
        </Card>
      </div>
    </div>
  );
}

function Card({
  href,
  title,
  icon,
  meta,
  children,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass animate-pop rounded-[28px] p-4">
      <Link href={href} className="mb-3 flex items-center gap-2">
        <span
          className="grid h-8 w-8 place-items-center rounded-xl text-white shadow-md"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          {icon}
        </span>
        <h2 className="flex-1 font-bold">{title}</h2>
        {meta && <span className="muted text-xs font-semibold">{meta}</span>}
        <ChevronRight size={18} className="faint" />
      </Link>
      {children}
    </section>
  );
}

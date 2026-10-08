import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  CircleCheckBig,
  Flame,
  ListTodo,
  NotebookPen,
  PenLine,
  Plus,
  Search,
  Settings,
  ShoppingCart,
} from "lucide-react";
import { getDashboard } from "@/lib/queries";
import { greeting, formatDate, parseLocalDate } from "@/lib/dates";
import { MOODS, progressMessage, quoteOfTheDay } from "@/lib/motivation";
import { ProgressRing } from "@/components/progress-ring";
import { MoodIcon, MOOD_STYLES } from "@/components/icons";
import { ThemeToggleButton } from "@/components/theme";
import { MiniShopping, MiniTodos, RefreshOnFocus } from "@/components/dashboard-widgets";

export default async function Dashboard() {
  const now = new Date();
  const { stats, upcoming, todayEntry, moods, pinned, shopping } = await getDashboard();
  const quote = quoteOfTheDay(now);
  const pct = stats.total ? stats.done / stats.total : 0;

  return (
    <div className="page">
      <RefreshOnFocus />
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="muted text-sm font-medium">{formatDate(now, { weekday: "long", year: undefined })}</p>
          <h1 className="page-title">{greeting(now)}</h1>
        </div>
        <div className="flex gap-1 lg:hidden">
          <ThemeToggleButton />
          <Link href="/settings" className="icon-btn" aria-label="Einstellungen">
            <Settings size={18} />
          </Link>
        </div>
      </header>

      <form action="/search" className="glass mb-5 flex items-center gap-2 rounded-xl px-3.5">
        <Search size={17} className="faint" />
        <input
          name="q"
          placeholder="Alles durchsuchen"
          className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-[var(--text-3)]"
          enterKeyHint="search"
          aria-label="Suche"
        />
      </form>

      {/* Today */}
      <section className="glass animate-pop mb-5 rounded-xl p-5">
        <div className="flex items-center gap-5">
          <ProgressRing value={pct} size={76} stroke={7}>
            <div className="text-center leading-tight">
              <div className="text-[17px] font-semibold tabular-nums">{Math.round(pct * 100)}%</div>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="section-title mb-1">Heute</p>
            <p className="text-[16px] font-semibold leading-snug">{progressMessage(stats.done, stats.total)}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <span className="badge">
                <CircleCheckBig size={13} /> {stats.done} von {stats.total} erledigt
              </span>
              <span className="badge">
                <Flame size={13} style={{ color: stats.streak ? "var(--warning)" : undefined }} />
                {stats.streak} {stats.streak === 1 ? "Tag" : "Tage"} Serie
              </span>
            </div>
          </div>
        </div>
        <blockquote className="mt-4 border-t pt-3.5 text-sm" style={{ borderColor: "var(--border)" }}>
          <p className="muted">„{quote.text}“</p>
          <footer className="faint mt-1 text-xs font-medium">{quote.author}</footer>
        </blockquote>
      </section>

      {/* Quick actions */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { href: "/journal?new=1", label: "Eintrag", icon: PenLine },
          { href: "/todos?new=1", label: "Aufgabe", icon: ListTodo },
          { href: "/notes?new=1", label: "Notiz", icon: NotebookPen },
          { href: "/shopping", label: "Einkauf", icon: ShoppingCart },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="btn btn-ghost justify-start gap-2.5 px-3">
            <Icon size={16} className="muted" />
            <span className="flex-1 text-left">{label}</span>
            <Plus size={15} className="faint" />
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card href="/todos" title="Aufgaben" icon={<CircleCheckBig size={17} />} meta={stats.open ? `${stats.open} fällig` : undefined}>
          <MiniTodos todos={upcoming} />
        </Card>

        <Card href="/journal" title="Tagebuch" icon={<BookOpen size={17} />}>
          {todayEntry ? (
            <Link href={`/journal?open=${todayEntry.id}`} className="block">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <MoodIcon mood={todayEntry.mood} size={16} /> {todayEntry.title || "Heute"}
              </p>
              <p className="muted line-clamp-3 text-sm">{todayEntry.content}</p>
            </Link>
          ) : (
            <div>
              <p className="muted mb-2 text-sm">Wie fühlst du dich heute?</p>
              <div className="flex gap-1.5">
                {MOODS.map((m) => {
                  const Icon = MOOD_STYLES[m.value].icon;
                  return (
                    <Link
                      key={m.value}
                      href={`/journal?new=1&mood=${m.value}`}
                      className="grid h-10 flex-1 place-items-center rounded-lg border transition-colors hover:bg-[var(--surface-hover)]"
                      style={{ borderColor: "var(--border)" }}
                      aria-label={m.label}
                      title={m.label}
                    >
                      <Icon size={20} style={{ color: MOOD_STYLES[m.value].color }} />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <span className="faint text-xs font-medium">Letzte 7 Tage</span>
            <div className="flex gap-1">
              {moods.map((d) => (
                <span
                  key={d.date}
                  className="grid h-7 w-7 place-items-center rounded-md"
                  style={{ background: "var(--surface-2)" }}
                  title={formatDate(parseLocalDate(d.date))}
                >
                  {d.mood ? (
                    <MoodIcon mood={d.mood} size={15} />
                  ) : (
                    <span className="faint text-[10px] tabular-nums">{parseLocalDate(d.date).getDate()}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card href="/notes" title="Notizen" icon={<NotebookPen size={17} />}>
          {pinned.length === 0 ? (
            <p className="muted py-1 text-sm">Noch keine Notizen.</p>
          ) : (
            <div className="divide-soft -mx-1">
              {pinned.map((n) => (
                <Link key={n.id} href={`/notes?open=${n.id}`} className="flex items-center gap-2.5 px-1 py-2">
                  <span
                    className="h-2 w-2 flex-none rounded-full"
                    style={{ background: n.color === "default" ? "var(--text-3)" : `var(--note-${n.color}, var(--accent))` }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{n.title || n.content.split("\n")[0] || "Bild-Notiz"}</span>
                    {n.title && n.content && <span className="muted block truncate text-xs">{n.content.split("\n")[0]}</span>}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card href="/shopping" title="Einkauf" icon={<ShoppingCart size={17} />} meta={shopping.length ? `${shopping.length} offen` : undefined}>
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
    <section className="glass animate-pop rounded-xl p-4">
      <Link href={href} className="group mb-3 flex items-center gap-2.5">
        <span className="icon-tile">{icon}</span>
        <h2 className="flex-1 text-[15px] font-semibold">{title}</h2>
        {meta && <span className="faint text-xs font-medium">{meta}</span>}
        <ChevronRight size={16} className="faint transition-transform group-hover:translate-x-0.5" />
      </Link>
      {children}
    </section>
  );
}

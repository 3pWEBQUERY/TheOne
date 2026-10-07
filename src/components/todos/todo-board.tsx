"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { Bell, ChevronDown, Flame, Plus, Repeat, Sparkles, StickyNote, Trash2 } from "lucide-react";
import type { Todo } from "@/db/schema";
import { clearCompletedTodos, toggleTodo } from "@/lib/actions/todos";
import { progressMessage, randomCheer } from "@/lib/motivation";
import { relativeDue } from "@/lib/dates";
import { ImageStrip } from "../images";
import { ProgressRing } from "../progress-ring";
import { useToast } from "../toast";
import { confetti, haptic } from "../confetti";
import { clearUrlParams, useRefreshOnFocus } from "../hooks";
import { TodoEditor } from "./todo-editor";
import { QuickTodo } from "./quick-todo";

type Stats = { open: number; done: number; total: number; streak: number };
type Filter = "today" | "upcoming" | "all";

const REPEAT_LABEL: Record<string, string> = {
  daily: "Täglich",
  weekdays: "Werktags",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
};

export function TodoBoard({
  open,
  done,
  stats,
  initialOpenId,
  startNew,
}: {
  open: Todo[];
  done: Todo[];
  stats: Stats;
  initialOpenId?: string;
  startNew?: boolean;
}) {
  useRefreshOnFocus();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<Todo | "new" | null>(() => {
    if (startNew) return "new";
    if (initialOpenId) return [...open, ...done].find((t) => t.id === initialOpenId) ?? null;
    return null;
  });

  const [optimistic, setOptimistic] = useOptimistic(
    { open, done },
    (state, action: { id: string; done: boolean }) => {
      const all = [...state.open, ...state.done];
      const t = all.find((x) => x.id === action.id);
      if (!t) return state;
      if (t.repeat !== "none" && action.done) return state; // server rolls it forward
      const updated = { ...t, done: action.done, completedAt: action.done ? new Date() : null };
      return action.done
        ? { open: state.open.filter((x) => x.id !== t.id), done: [updated, ...state.done] }
        : { open: [...state.open, updated], done: state.done.filter((x) => x.id !== t.id) };
    },
  );

  useEffect(() => {
    if (startNew || initialOpenId) clearUrlParams();
  }, [startNew, initialOpenId]);

  const now = new Date();
  const eod = new Date(now);
  eod.setHours(23, 59, 59, 999);

  const groups = useMemo(() => {
    const sod = new Date();
    sod.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(eod);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    const g = { overdue: [] as Todo[], today: [] as Todo[], tomorrow: [] as Todo[], later: [] as Todo[], someday: [] as Todo[] };
    for (const t of optimistic.open) {
      if (!t.dueAt) g.someday.push(t);
      else if (t.dueAt < sod) g.overdue.push(t);
      else if (t.dueAt <= eod) g.today.push(t);
      else if (t.dueAt <= tomorrowEnd) g.tomorrow.push(t);
      else g.later.push(t);
    }
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimistic.open]);

  const sections = [
    { key: "overdue", title: "Überfällig", items: groups.overdue, tone: "var(--danger)", show: filter !== "upcoming" },
    { key: "today", title: "Heute", items: groups.today, show: filter !== "upcoming" },
    { key: "tomorrow", title: "Morgen", items: groups.tomorrow, show: filter !== "today" },
    { key: "later", title: "Demnächst", items: groups.later, show: filter !== "today" },
    { key: "someday", title: "Irgendwann", items: groups.someday, show: filter === "all" },
  ];

  const onToggle = (t: Todo, next: boolean, e?: React.MouseEvent) => {
    haptic(next ? [10, 30, 20] : 8);
    if (next) {
      const x = e?.clientX ?? window.innerWidth / 2;
      const y = e?.clientY ?? window.innerHeight / 2;
      confetti(x, y, 40);
      const remainingToday = groups.overdue.length + groups.today.length - (t.dueAt && t.dueAt <= eod ? 1 : 0);
      if (stats.total > 0 && remainingToday === 0 && t.dueAt && t.dueAt <= eod) {
        setTimeout(() => confetti(window.innerWidth / 2, window.innerHeight / 3, 140), 250);
        toast("Alles für heute erledigt! 🏆", "success");
      } else {
        toast(t.repeat !== "none" ? `${randomCheer()} Nächster Termin geplant.` : randomCheer(), "success");
      }
    }
    startTransition(async () => {
      setOptimistic({ id: t.id, done: next });
      const res = await toggleTodo(t.id, next);
      if (res.error) toast(res.error, "error");
    });
  };

  const pct = stats.total ? stats.done / stats.total : 0;

  return (
    <div className="page">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="muted text-sm font-semibold">{new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(now)}</p>
          <h1 className="page-title">Aufgaben</h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus size={18} /> Neu
        </button>
      </header>

      {/* Motivation card */}
      <section className="glass animate-pop mb-4 flex items-center gap-4 rounded-[28px] p-4">
        <ProgressRing value={pct} size={72} stroke={8}>
          <span className="text-sm font-extrabold">
            {stats.done}/{stats.total}
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{progressMessage(stats.done, stats.total)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            <span className="chip !min-h-7 !px-2.5" title="Tage in Folge mit erledigten Aufgaben">
              <Flame size={15} className="text-orange-500" />
              <b>{stats.streak}</b> {stats.streak === 1 ? "Tag" : "Tage"} Serie
            </span>
            {stats.open > 0 && (
              <span className="chip !min-h-7 !px-2.5">
                <Sparkles size={15} className="text-[var(--accent)]" /> {stats.open} offen
              </span>
            )}
          </div>
        </div>
      </section>

      <QuickTodo />

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {(
          [
            ["all", "Alle"],
            ["today", "Heute"],
            ["upcoming", "Demnächst"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" className="chip" data-active={filter === k} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>

      {optimistic.open.length === 0 && (
        <div className="glass animate-pop rounded-[28px] p-8 text-center">
          <div className="mb-2 text-5xl">🎉</div>
          <p className="text-lg font-bold">Alles erledigt!</p>
          <p className="muted mt-1 text-sm">Gönn dir eine Pause – oder plane das nächste Ziel.</p>
        </div>
      )}

      <div className="space-y-5">
        {sections
          .filter((s) => s.show && s.items.length > 0)
          .map((s) => (
            <section key={s.key}>
              <h2 className="section-title mb-2 px-1" style={s.tone ? { color: s.tone } : undefined}>
                {s.title} · {s.items.length}
              </h2>
              <ul className="glass divide-y overflow-hidden rounded-[24px]" style={{ borderColor: "var(--divider)" }}>
                {s.items.map((t) => (
                  <TodoRow key={t.id} todo={t} onToggle={onToggle} onOpen={() => setEditing(t)} now={now} />
                ))}
              </ul>
            </section>
          ))}

        {optimistic.done.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <button type="button" className="section-title flex items-center gap-1" onClick={() => setShowDone((v) => !v)}>
                Erledigt · {optimistic.done.length}
                <ChevronDown size={16} className={`transition ${showDone ? "rotate-180" : ""}`} />
              </button>
              {showDone && (
                <button
                  type="button"
                  className="muted flex items-center gap-1 text-sm font-semibold"
                  onClick={() =>
                    startTransition(async () => {
                      const r = await clearCompletedTodos();
                      toast(`${r.count ?? 0} erledigte Aufgaben entfernt`);
                    })
                  }
                >
                  <Trash2 size={14} /> Aufräumen
                </button>
              )}
            </div>
            {showDone && (
              <ul className="glass divide-y overflow-hidden rounded-[24px] opacity-80" style={{ borderColor: "var(--divider)" }}>
                {optimistic.done.map((t) => (
                  <TodoRow key={t.id} todo={t} onToggle={onToggle} onOpen={() => setEditing(t)} now={now} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {editing && (
        <TodoEditor todo={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function TodoRow({
  todo: t,
  onToggle,
  onOpen,
  now,
}: {
  todo: Todo;
  onToggle: (t: Todo, done: boolean, e?: React.MouseEvent) => void;
  onOpen: () => void;
  now: Date;
}) {
  const overdue = !t.done && t.dueAt && t.dueAt < now;
  return (
    <li className="flex items-start gap-3 px-4 py-3.5 transition active:bg-white/10" style={{ borderColor: "var(--divider)" }}>
      <button
        type="button"
        className="check mt-0.5"
        data-checked={t.done}
        data-priority={t.priority}
        aria-label={t.done ? "Als offen markieren" : "Erledigen"}
        onClick={(e) => onToggle(t, !t.done, e)}
      >
        {t.done && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
      </button>
      <div
        role="button"
        tabIndex={0}
        className="min-w-0 flex-1 cursor-pointer text-left"
        onClick={onOpen}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      >
        <p className={`font-semibold leading-snug ${t.done ? "faint line-through" : ""}`}>
          {t.priority === 2 && !t.done && <span className="mr-1 text-[var(--danger)]">!</span>}
          {t.title}
        </p>
        {(t.dueAt || t.remindAt || t.repeat !== "none" || t.notes) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
            {t.dueAt && (
              <span className={overdue ? "font-semibold text-[var(--danger)]" : "muted"}>{relativeDue(t.dueAt, now)}</span>
            )}
            {t.remindAt && !t.done && (
              <span className="muted flex items-center gap-1">
                <Bell size={12} /> {relativeDue(t.remindAt, now)}
              </span>
            )}
            {t.repeat !== "none" && (
              <span className="muted flex items-center gap-1">
                <Repeat size={12} /> {REPEAT_LABEL[t.repeat]}
              </span>
            )}
            {t.notes && (
              <span className="faint flex min-w-0 items-center gap-1">
                <StickyNote size={12} className="flex-none" />
                <span className="truncate">{t.notes.split("\n")[0]}</span>
              </span>
            )}
          </div>
        )}
        {t.images.length > 0 && (
          <div className="mt-2">
            <ImageStrip images={t.images} size={52} />
          </div>
        )}
      </div>
    </li>
  );
}

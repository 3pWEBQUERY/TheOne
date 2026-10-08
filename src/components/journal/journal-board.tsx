"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { BookOpen, Clock, History, PenLine, Pencil, Search, Trash2 } from "lucide-react";
import { MOOD_STYLES, MoodIcon } from "../icons";
import { EmptyState } from "../empty-state";
import type { ImageRef, JournalEntry } from "@/db/schema";
import { deleteJournalEntry, saveJournalEntry } from "@/lib/actions/journal";
import { MOODS } from "@/lib/motivation";
import { formatDate, formatTime, parseLocalDate } from "@/lib/dates";
import { ImageCover, ImageGrid, ImagePicker } from "../images";
import { ConfirmButton, Sheet } from "../sheet";
import { useToast } from "../toast";
import { autoGrow, canAutoFocus, clearUrlParams, localDate, useRefreshOnFocus } from "../hooks";

type MoodDay = { date: string; mood: number | null };

export function JournalBoard({
  entries,
  onThisDay,
  moods,
  initialOpenId,
  startNew,
  startMood,
}: {
  entries: JournalEntry[];
  onThisDay: JournalEntry[];
  moods: MoodDay[];
  initialOpenId?: string;
  startNew?: boolean;
  startMood?: number;
}) {
  useRefreshOnFocus();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(() => {
    if (startNew) return "new";
    if (initialOpenId && entries.some((e) => e.id === initialOpenId)) return initialOpenId;
    return null;
  });
  const editingEntry =
    editing && editing !== "new" ? [...entries, ...onThisDay].find((e) => e.id === editing) : undefined;

  useEffect(() => {
    if (startNew || initialOpenId) clearUrlParams();
  }, [startNew, initialOpenId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => `${e.title} ${e.content}`.toLowerCase().includes(q));
  }, [entries, query]);

  const byMonth = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const e of filtered) {
      const key = e.entryDate.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()];
  }, [filtered]);

  const today = localDate(new Date());
  const wroteToday = entries.some((e) => e.entryDate === today);

  return (
    <div className="page">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="muted text-sm font-medium">{entries.length} {entries.length === 1 ? "Eintrag" : "Einträge"}</p>
          <h1 className="page-title">Tagebuch</h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          <PenLine size={17} /> Neuer Eintrag
        </button>
      </header>

      {!wroteToday && (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="glass glass-interactive animate-pop mb-4 block w-full rounded-xl p-5 text-left"
        >
          <p className="text-[15px] font-semibold">Wie geht es dir heute?</p>
          <p className="muted mt-0.5 text-sm">Halte deine Gedanken fest – auch ein Satz zählt.</p>
          <div className="mt-3 flex gap-1.5">
            {MOODS.map((m) => {
              const Icon = MOOD_STYLES[m.value].icon;
              return (
                <span
                  key={m.value}
                  className="grid h-10 flex-1 place-items-center rounded-lg border"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Icon size={20} style={{ color: MOOD_STYLES[m.value].color }} />
                </span>
              );
            })}
          </div>
        </button>
      )}

      <section className="glass mb-4 rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Stimmung · 14 Tage</h2>
        </div>
        <div className="flex items-end justify-between gap-1">
          {moods.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full max-w-[16px] rounded-[4px] transition-all"
                style={{
                  height: d.mood ? 8 + d.mood * 10 : 4,
                  background: d.mood ? MOOD_STYLES[d.mood].color : "var(--border-strong)",
                  opacity: d.mood ? 0.85 : 1,
                }}
                title={d.mood ? MOODS[d.mood - 1].label : "Kein Eintrag"}
              />
              <span className="text-[10px] faint">{parseLocalDate(d.date).getDate()}</span>
            </div>
          ))}
        </div>
      </section>

      {onThisDay.length > 0 && (
        <section className="glass mb-4 rounded-xl p-4">
          <h2 className="section-title mb-2 flex items-center gap-1.5">
            <History size={14} /> An diesem Tag
          </h2>
          {onThisDay.map((e) => (
            <button key={e.id} type="button" className="block w-full text-left" onClick={() => setEditing(e.id)}>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                {parseLocalDate(e.entryDate).getFullYear()} <MoodIcon mood={e.mood} size={15} /> {e.title}
              </p>
              <p className="muted line-clamp-3 text-sm">{e.content}</p>
            </button>
          ))}
        </section>
      )}

      {entries.length > 3 && (
        <div className="glass mb-5 flex items-center gap-2 rounded-xl px-3.5">
          <Search size={17} className="faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Einträge durchsuchen"
            className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-[var(--text-3)]"
          />
        </div>
      )}

      {entries.length === 0 && (
        <EmptyState icon={BookOpen} title="Dein Tagebuch ist noch leer" text="Schreib deinen ersten Gedanken – mit Fotos, wenn du magst." />
      )}

      <div className="space-y-6">
        {byMonth.map(([month, list]) => (
          <section key={month}>
            <h2 className="section-title mb-2 px-1">
              {formatDate(`${month}-01`, { day: undefined, month: "long", year: "numeric" })}
            </h2>
            <div className="space-y-3">
              {list.map((e) => (
                <EntryCard key={e.id} entry={e} onOpen={() => setEditing(e.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {(editing === "new" || editingEntry) && (
        <JournalEditor
          key={editing}
          entry={editingEntry ?? null}
          initialMood={editing === "new" ? startMood : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EntryCard({ entry: e, onOpen }: { entry: JournalEntry; onOpen: () => void }) {
  const d = parseLocalDate(e.entryDate);
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(ev) => ev.key === "Enter" && onOpen()}
      className="glass glass-interactive animate-pop cursor-pointer overflow-hidden rounded-xl"
    >
      {e.images.length > 0 && <ImageCover images={e.images} className="max-h-56" />}
      <div className="flex gap-4 p-4">
        <div className="flex w-11 flex-none flex-col items-center">
          <span className="text-[22px] leading-none font-semibold tabular-nums">{d.getDate()}</span>
          <span className="faint mt-0.5 text-[11px] font-medium uppercase">
            {new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(d)}
          </span>
          {e.mood && <span className="mt-1.5"><MoodIcon mood={e.mood} size={18} /></span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="faint mb-0.5 flex items-center gap-1 text-xs font-medium tabular-nums">
            <Clock size={12} /> {formatTime(e.createdAt)} Uhr
          </p>
          {e.title && <h3 className="text-[15px] font-semibold leading-snug">{e.title}</h3>}
          <p className="muted line-clamp-3 text-sm leading-relaxed whitespace-pre-line">{e.content}</p>
        </div>
      </div>
    </article>
  );
}

const JOURNAL_FORM = "journal-form";

/** Read-only view first; "Bearbeiten" switches to the form. */
export function JournalEditor({
  entry,
  initialMood,
  onClose,
}: {
  entry: JournalEntry | null;
  initialMood?: number;
  onClose: () => void;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<"view" | "edit">(entry ? "view" : "edit");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  if (mode === "view" && entry) {
    return (
      <Sheet
        open
        wide
        onClose={onClose}
        title={formatDate(entry.entryDate, { weekday: "long" })}
        footer={
          <>
            <ConfirmButton
              className="btn btn-ghost !px-3.5"
              onConfirm={() =>
                startTransition(async () => {
                  await deleteJournalEntry(entry.id);
                  toast("Eintrag gelöscht");
                  onClose();
                })
              }
            >
              <Trash2 size={17} />
            </ConfirmButton>
            <button key="edit" type="button" className="btn btn-primary flex-1" onClick={() => setMode("edit")} disabled={pending}>
              <Pencil size={16} /> Bearbeiten
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="faint -mt-2 flex items-center gap-1.5 text-sm tabular-nums">
            <Clock size={14} /> Erstellt um {formatTime(entry.createdAt)} Uhr
            {entry.updatedAt.getTime() - entry.createdAt.getTime() > 60_000 &&
              ` · bearbeitet ${formatDate(entry.updatedAt, { year: undefined })}, ${formatTime(entry.updatedAt)} Uhr`}
          </p>
          {entry.mood && (
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium"
              style={{
                color: MOOD_STYLES[entry.mood].color,
                background: `color-mix(in srgb, ${MOOD_STYLES[entry.mood].color} 12%, transparent)`,
              }}
            >
              <MoodIcon mood={entry.mood} size={16} /> {MOODS[entry.mood - 1].label}
            </span>
          )}
          {entry.title && <h3 className="text-xl font-semibold leading-snug">{entry.title}</h3>}
          {entry.content && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{entry.content}</p>}
          <ImageGrid images={entry.images} />
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={entry ? "Eintrag bearbeiten" : "Neuer Eintrag"}
      footer={
        <>
          {entry && (
            <button key="cancel" type="button" className="btn btn-ghost" onClick={() => setMode("view")}>
              Abbrechen
            </button>
          )}
          <button key="save" type="submit" form={JOURNAL_FORM} className="btn btn-primary flex-1" disabled={pending || busy}>
            {busy ? "Bilder werden hochgeladen…" : "Speichern"}
          </button>
        </>
      }
    >
      <JournalForm
        entry={entry}
        initialMood={initialMood}
        onBusyChange={setBusy}
        onSubmit={(input) =>
          startTransition(async () => {
            const res = await saveJournalEntry({ id: entry?.id, ...input });
            if (res.error) {
              toast(res.error, "error");
              return;
            }
            toast(entry ? "Gespeichert" : "Eintrag gespeichert", "success");
            if (entry) setMode("view");
            else onClose();
          })
        }
      />
    </Sheet>
  );
}

function JournalForm({
  entry,
  initialMood,
  onSubmit,
  onBusyChange,
}: {
  entry: JournalEntry | null;
  initialMood?: number;
  onSubmit: (input: { title: string; content: string; mood: number | null; entryDate: string; images: ImageRef[] }) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [mood, setMood] = useState<number | null>(entry?.mood ?? initialMood ?? null);
  const [date, setDate] = useState(entry?.entryDate ?? localDate(new Date()));
  const [images, setImages] = useState<ImageRef[]>(entry?.images ?? []);

  return (
    <form
      id={JOURNAL_FORM}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, content, mood, entryDate: date, images });
      }}
    >
      <div>
        <span className="label">Stimmung</span>
        <div className="grid grid-cols-5 gap-1.5">
          {MOODS.map((m) => {
            const { icon: Icon, color } = MOOD_STYLES[m.value];
            const active = mood === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood(active ? null : m.value)}
                className="flex flex-col items-center gap-1 rounded-lg border py-2 transition-colors"
                style={{
                  borderColor: active ? color : "var(--border-strong)",
                  background: active ? `color-mix(in srgb, ${color} 12%, transparent)` : "var(--surface-solid)",
                }}
                aria-pressed={active}
              >
                <Icon size={22} style={{ color: active || !mood ? color : "var(--text-3)" }} />
                <span className="muted text-[11px] font-medium">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          className="field font-medium"
          placeholder="Titel (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input type="date" className="field w-40" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Datum" />
      </div>

      <textarea
        ref={autoGrow}
        className="field min-h-[200px]"
        placeholder="Was geht dir durch den Kopf?"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          autoGrow(e.target);
        }}
        autoFocus={!entry && canAutoFocus()}
      />

      <div>
        <span className="label">Fotos</span>
        <ImagePicker value={images} onChange={setImages} onBusyChange={onBusyChange} />
      </div>
    </form>
  );
}

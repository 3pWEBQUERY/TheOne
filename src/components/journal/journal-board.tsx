"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { BookOpen, History, PenLine, Search, Trash2 } from "lucide-react";
import { MOOD_STYLES, MoodIcon } from "../icons";
import { EmptyState } from "../empty-state";
import type { ImageRef, JournalEntry } from "@/db/schema";
import { deleteJournalEntry, saveJournalEntry } from "@/lib/actions/journal";
import { MOODS } from "@/lib/motivation";
import { formatDate, parseLocalDate } from "@/lib/dates";
import { ImageCover, ImagePicker } from "../images";
import { ConfirmButton, Sheet } from "../sheet";
import { useToast } from "../toast";
import { autoGrow, clearUrlParams, localDate, useRefreshOnFocus } from "../hooks";

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
  const [editing, setEditing] = useState<JournalEntry | "new" | null>(() => {
    if (startNew) return "new";
    if (initialOpenId) return entries.find((e) => e.id === initialOpenId) ?? null;
    return null;
  });

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
            <button key={e.id} type="button" className="block w-full text-left" onClick={() => setEditing(e)}>
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
                <EntryCard key={e.id} entry={e} onOpen={() => setEditing(e)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {editing && (
        <JournalEditor
          entry={editing === "new" ? null : editing}
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
          {e.title && <h3 className="text-[15px] font-semibold leading-snug">{e.title}</h3>}
          <p className="muted line-clamp-3 text-sm leading-relaxed whitespace-pre-line">{e.content}</p>
        </div>
      </div>
    </article>
  );
}

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
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [mood, setMood] = useState<number | null>(entry?.mood ?? initialMood ?? null);
  const [date, setDate] = useState(entry?.entryDate ?? localDate(new Date()));
  const [images, setImages] = useState<ImageRef[]>(entry?.images ?? []);

  const save = () =>
    startTransition(async () => {
      const res = await saveJournalEntry({ id: entry?.id, title, content, mood, entryDate: date, images });
      if (res.error) toast(res.error, "error");
      else {
        toast(entry ? "Gespeichert" : "Eintrag gespeichert", "success");
        onClose();
      }
    });

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={entry ? formatDate(entry.entryDate, { weekday: "long" }) : "Neuer Eintrag"}
      footer={
        <>
          {entry && (
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
              <Trash2 size={18} />
            </ConfirmButton>
          )}
          <button type="button" className="btn btn-primary flex-1" onClick={save} disabled={pending || busy}>
            {busy ? "Bilder werden hochgeladen…" : "Speichern"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
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
          autoFocus={!entry}
        />

        <div>
          <span className="label">Fotos</span>
          <ImagePicker value={images} onChange={setImages} onBusyChange={setBusy} />
        </div>

        {entry && entry.images.length > 0 && images.length === 0 && (
          <p className="faint text-xs">Alle Bilder werden beim Speichern entfernt.</p>
        )}
      </div>
    </Sheet>
  );
}

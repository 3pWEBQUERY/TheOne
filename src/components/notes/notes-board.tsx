"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, ListChecks, NotebookPen, Pencil, Pin, PinOff, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { formatDate, formatTime } from "@/lib/dates";
import { EmptyState } from "../empty-state";
import type { ImageRef, Note } from "@/db/schema";
import { deleteNote, noteToShopping, noteToTodos, saveNote, toggleNotePin } from "@/lib/actions/notes";
import { NOTE_COLORS } from "@/lib/note-colors";
import { ImageCover, ImageGrid, ImagePicker } from "../images";
import { ConfirmButton, Sheet } from "../sheet";
import { useToast } from "../toast";
import { autoGrow, canAutoFocus, clearUrlParams, useRefreshOnFocus } from "../hooks";

const tint = (color: string) => (color === "default" ? "" : `tint-${color}`);

export function NotesBoard({
  notes,
  initialOpenId,
  startNew,
}: {
  notes: Note[];
  initialOpenId?: string;
  startNew?: boolean;
}) {
  useRefreshOnFocus();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(() => {
    if (startNew) return "new";
    if (initialOpenId && notes.some((n) => n.id === initialOpenId)) return initialOpenId;
    return null;
  });
  const editingNote = editing && editing !== "new" ? notes.find((n) => n.id === editing) : undefined;

  useEffect(() => {
    if (startNew || initialOpenId) clearUrlParams();
  }, [startNew, initialOpenId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? notes.filter((n) => `${n.title} ${n.content}`.toLowerCase().includes(q)) : notes;
  }, [notes, query]);

  const pinned = filtered.filter((n) => n.pinned);
  const others = filtered.filter((n) => !n.pinned);

  return (
    <div className="page">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="muted text-sm font-medium">{notes.length} {notes.length === 1 ? "Notiz" : "Notizen"}</p>
          <h1 className="page-title">Notizen</h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus size={17} /> Neue Notiz
        </button>
      </header>

      <div className="glass mb-5 flex items-center gap-2 rounded-xl px-3.5">
        <Search size={17} className="faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Notizen durchsuchen"
          className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-[var(--text-3)]"
        />
      </div>

      {notes.length === 0 && (
        <EmptyState icon={NotebookPen} title="Noch keine Notizen" text="Ideen, Listen, Rezepte, Fotos – alles hat hier Platz.">
          <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
            <Plus size={16} /> Notiz erstellen
          </button>
        </EmptyState>
      )}

      {pinned.length > 0 && (
        <section className="mb-5">
          <h2 className="section-title mb-2 flex items-center gap-1 px-1">
            <Pin size={13} /> Angeheftet
          </h2>
          <div className="flex flex-col gap-3">
            {pinned.map((n) => (
              <NoteCard key={n.id} note={n} onOpen={() => setEditing(n.id)} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          {pinned.length > 0 && <h2 className="section-title mb-2 px-1">Weitere</h2>}
          <div className="flex flex-col gap-3">
            {others.map((n) => (
              <NoteCard key={n.id} note={n} onOpen={() => setEditing(n.id)} />
            ))}
          </div>
        </section>
      )}

      {(editing === "new" || editingNote) && (
        <NoteEditor key={editing} note={editingNote ?? null} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function NoteCard({ note: n, onOpen }: { note: Note; onOpen: () => void }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className={`glass glass-interactive animate-pop cursor-pointer overflow-hidden rounded-xl ${tint(n.color)}`}
    >
      {n.images.length > 0 && <ImageCover images={n.images} />}
      <div className="p-4">
        {n.title && <h3 className="mb-1 text-[15px] font-semibold leading-snug">{n.title}</h3>}
        {n.content && (
          <p className="muted text-sm leading-relaxed whitespace-pre-line" style={{ display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {n.content}
          </p>
        )}
        <p className="faint mt-2 text-[11px] font-medium">
          {new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" }).format(n.updatedAt)}
        </p>
      </div>
    </article>
  );
}

const NOTE_FORM = "note-form";

/** Read-only view first; "Bearbeiten" switches to the form. */
function NoteEditor({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<"view" | "edit">(note ? "view" : "edit");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  if (mode === "view" && note) {
    const convert = (kind: "shopping" | "todos") =>
      startTransition(async () => {
        const res = kind === "shopping" ? await noteToShopping(note.id) : await noteToTodos(note.id);
        if (res.error) toast(res.error, "error");
        else
          toast(
            kind === "shopping" ? `${res.count} Artikel zur Einkaufsliste hinzugefügt` : `${res.count} Aufgaben erstellt`,
            "success",
          );
      });

    return (
      <Sheet
        open
        wide
        onClose={onClose}
        title="Notiz"
        actions={
          <button
            type="button"
            className="icon-btn"
            onClick={() => startTransition(async () => void (await toggleNotePin(note.id, !note.pinned)))}
            aria-label={note.pinned ? "Lösen" : "Anheften"}
            title={note.pinned ? "Lösen" : "Anheften"}
            style={note.pinned ? { color: "var(--accent)" } : undefined}
          >
            {note.pinned ? <PinOff size={19} /> : <Pin size={19} />}
          </button>
        }
        footer={
          <>
            <ConfirmButton
              className="btn btn-ghost !px-3.5"
              onConfirm={() =>
                startTransition(async () => {
                  await deleteNote(note.id);
                  toast("Notiz gelöscht");
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
          <div className="flex items-start gap-2.5">
            {note.color !== "default" && (
              <span className="mt-2 h-2.5 w-2.5 flex-none rounded-full" style={{ background: `var(--note-${note.color})` }} />
            )}
            <div className="min-w-0 flex-1">
              {note.title && <h3 className="text-xl font-semibold leading-snug">{note.title}</h3>}
              <p className="faint mt-0.5 text-xs">
                Zuletzt bearbeitet am {formatDate(note.updatedAt)}, {formatTime(note.updatedAt)} Uhr
              </p>
            </div>
          </div>
          {note.content && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{note.content}</p>}
          <ImageGrid images={note.images} />

          {note.content.trim() && (
            <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <span className="label">Umwandeln</span>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => convert("todos")} disabled={pending}>
                  <ListChecks size={17} /> In Aufgaben
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => convert("shopping")} disabled={pending}>
                  <ShoppingCart size={17} /> In Einkauf
                </button>
              </div>
              <p className="faint mt-1.5 text-xs">Jede Zeile der Notiz wird zu einem eigenen Eintrag.</p>
            </div>
          )}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={note ? "Notiz bearbeiten" : "Neue Notiz"}
      footer={
        <>
          {note && (
            <button key="cancel" type="button" className="btn btn-ghost" onClick={() => setMode("view")}>
              Abbrechen
            </button>
          )}
          <button key="save" type="submit" form={NOTE_FORM} className="btn btn-primary flex-1" disabled={pending || busy}>
            {busy ? "Bilder werden hochgeladen…" : "Speichern"}
          </button>
        </>
      }
    >
      <NoteForm
        note={note}
        onBusyChange={setBusy}
        onSubmit={(input) =>
          startTransition(async () => {
            const res = await saveNote({ id: note?.id, ...input });
            if (res.error) {
              toast(res.error, "error");
              return;
            }
            toast(note ? "Gespeichert" : "Notiz erstellt", "success");
            if (note) setMode("view");
            else onClose();
          })
        }
      />
    </Sheet>
  );
}

function NoteForm({
  note,
  onSubmit,
  onBusyChange,
}: {
  note: Note | null;
  onSubmit: (input: { title: string; content: string; color: string; pinned: boolean; images: ImageRef[] }) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [color, setColor] = useState(note?.color ?? "default");
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [images, setImages] = useState<ImageRef[]>(note?.images ?? []);

  return (
    <form
      id={NOTE_FORM}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, content, color, pinned, images });
      }}
    >
      <input
        className="field !text-[17px] font-semibold"
        placeholder="Titel"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        ref={autoGrow}
        className="field min-h-[220px]"
        placeholder="Notiz schreiben… (jede Zeile kann später zur Aufgabe oder zum Einkauf werden)"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          autoGrow(e.target);
        }}
        autoFocus={!note && canAutoFocus()}
      />

      <div>
        <span className="label">Farbe</span>
        <div className="flex gap-2.5">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.id)}
              className="grid h-9 w-9 place-items-center rounded-full border transition-transform active:scale-95"
              style={{
                background: c.id === "default" ? "var(--surface-solid)" : `var(--note-${c.id})`,
                borderColor: c.id === "default" ? "var(--border-strong)" : "transparent",
                boxShadow: color === c.id ? "0 0 0 2px var(--surface-solid), 0 0 0 4px var(--accent)" : "none",
              }}
              aria-label={c.label}
              aria-pressed={color === c.id}
              title={c.label}
            >
              {color === c.id && <Check size={16} color={c.id === "default" ? "var(--text)" : "#fff"} strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        <Pin size={15} className="muted" /> Oben anheften
      </label>

      <div>
        <span className="label">Bilder</span>
        <ImagePicker value={images} onChange={setImages} onBusyChange={onBusyChange} />
      </div>
    </form>
  );
}

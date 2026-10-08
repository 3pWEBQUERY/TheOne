"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, ListChecks, NotebookPen, Pin, PinOff, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { EmptyState } from "../empty-state";
import type { ImageRef, Note } from "@/db/schema";
import { deleteNote, noteToShopping, noteToTodos, saveNote, toggleNotePin } from "@/lib/actions/notes";
import { NOTE_COLORS } from "@/lib/note-colors";
import { ImageCover, ImagePicker } from "../images";
import { ConfirmButton, Sheet } from "../sheet";
import { useToast } from "../toast";
import { autoGrow, clearUrlParams, useRefreshOnFocus } from "../hooks";

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
  const [editing, setEditing] = useState<Note | "new" | null>(() => {
    if (startNew) return "new";
    if (initialOpenId) return notes.find((n) => n.id === initialOpenId) ?? null;
    return null;
  });

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
              <NoteCard key={n.id} note={n} onOpen={() => setEditing(n)} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          {pinned.length > 0 && <h2 className="section-title mb-2 px-1">Weitere</h2>}
          <div className="flex flex-col gap-3">
            {others.map((n) => (
              <NoteCard key={n.id} note={n} onOpen={() => setEditing(n)} />
            ))}
          </div>
        </section>
      )}

      {editing && <NoteEditor note={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
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

function NoteEditor({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [color, setColor] = useState(note?.color ?? "default");
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [images, setImages] = useState<ImageRef[]>(note?.images ?? []);

  const dirty =
    !note ||
    title !== note.title ||
    content !== note.content ||
    color !== note.color ||
    pinned !== note.pinned ||
    JSON.stringify(images) !== JSON.stringify(note.images);

  const save = (after?: () => Promise<void>) =>
    startTransition(async () => {
      if (dirty) {
        const res = await saveNote({ id: note?.id, title, content, color, pinned, images });
        if (res.error) {
          toast(res.error, "error");
          return;
        }
      }
      if (after) await after();
      else toast(note ? "Gespeichert" : "Notiz erstellt", "success");
      onClose();
    });

  const convert = (kind: "shopping" | "todos") => {
    if (!note) return;
    save(async () => {
      const res = kind === "shopping" ? await noteToShopping(note.id) : await noteToTodos(note.id);
      if (res.error) toast(res.error, "error");
      else
        toast(
          kind === "shopping"
            ? `${res.count} Artikel zur Einkaufsliste hinzugefügt`
            : `${res.count} Aufgaben erstellt`,
          "success",
        );
    });
  };

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={note ? "Notiz" : "Neue Notiz"}
      actions={
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            setPinned((p) => !p);
            if (note) startTransition(async () => void (await toggleNotePin(note.id, !pinned)));
          }}
          aria-label={pinned ? "Lösen" : "Anheften"}
          style={pinned ? { color: "var(--accent)" } : undefined}
        >
          {pinned ? <PinOff size={20} /> : <Pin size={20} />}
        </button>
      }
      footer={
        <>
          {note && (
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
              <Trash2 size={18} />
            </ConfirmButton>
          )}
          <button type="button" className="btn btn-primary flex-1" onClick={() => save()} disabled={pending || busy}>
            {busy ? "Bilder werden hochgeladen…" : "Speichern"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
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
          autoFocus={!note}
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

        <div>
          <span className="label">Bilder</span>
          <ImagePicker value={images} onChange={setImages} onBusyChange={setBusy} />
        </div>

        {note && (
          <div>
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

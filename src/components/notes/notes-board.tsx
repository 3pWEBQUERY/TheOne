"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckSquare, Pin, PinOff, Plus, Search, ShoppingBasket, Trash2 } from "lucide-react";
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
          <p className="muted text-sm font-semibold">{notes.length} {notes.length === 1 ? "Notiz" : "Notizen"}</p>
          <h1 className="page-title">Notizen</h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus size={18} /> Neu
        </button>
      </header>

      <div className="glass glass-pill mb-5 flex items-center gap-2 px-4">
        <Search size={18} className="faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Notizen durchsuchen"
          className="min-w-0 flex-1 bg-transparent py-3 outline-none"
        />
      </div>

      {notes.length === 0 && (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="glass glass-interactive block w-full rounded-[28px] p-8 text-center"
        >
          <div className="mb-2 text-5xl">🗒️</div>
          <p className="text-lg font-bold">Noch keine Notizen</p>
          <p className="muted mt-1 text-sm">Ideen, Listen, Rezepte, Fotos – alles hat hier Platz.</p>
        </button>
      )}

      {pinned.length > 0 && (
        <section className="mb-5">
          <h2 className="section-title mb-2 flex items-center gap-1 px-1">
            <Pin size={13} /> Angeheftet
          </h2>
          <div className="masonry">
            {pinned.map((n) => (
              <NoteCard key={n.id} note={n} onOpen={() => setEditing(n)} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          {pinned.length > 0 && <h2 className="section-title mb-2 px-1">Weitere</h2>}
          <div className="masonry">
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
      className={`glass glass-interactive animate-pop cursor-pointer overflow-hidden rounded-[24px] ${tint(n.color)}`}
    >
      {n.images.length > 0 && <ImageCover images={n.images} />}
      <div className="p-4">
        {n.title && <h3 className="mb-1 font-bold leading-snug">{n.title}</h3>}
        {n.content && (
          <p className="muted text-[14.5px] leading-relaxed whitespace-pre-line" style={{ display: "-webkit-box", WebkitLineClamp: 9, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
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
      else toast(note ? "Gespeichert" : "Notiz erstellt ✨", "success");
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
            ? `${res.count} Artikel zur Einkaufsliste hinzugefügt 🛒`
            : `${res.count} Aufgaben erstellt ✅`,
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
          className="field !text-lg font-bold"
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
                className={`glass h-10 w-10 rounded-full ${tint(c.id)}`}
                style={{
                  outline: color === c.id ? "3px solid var(--accent)" : "none",
                  outlineOffset: 2,
                }}
                aria-label={c.label}
                title={c.label}
              />
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
                <CheckSquare size={17} /> In Aufgaben
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => convert("shopping")} disabled={pending}>
                <ShoppingBasket size={17} /> In Einkauf
              </button>
            </div>
            <p className="faint mt-1.5 text-xs">Jede Zeile der Notiz wird zu einem eigenen Eintrag.</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

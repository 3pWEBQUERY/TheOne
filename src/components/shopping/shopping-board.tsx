"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { ArrowUp, Camera, Check, CircleCheckBig, Pencil, Plus, RotateCcw, ShoppingCart, Trash2 } from "lucide-react";
import { CategoryIcon } from "../icons";
import { EmptyState } from "../empty-state";
import type { ImageRef, ShoppingItem } from "@/db/schema";
import {
  addShoppingItems,
  deleteShoppingItem,
  finishShopping,
  toggleShoppingItem,
  updateShoppingItem,
} from "@/lib/actions/shopping";
import { CATEGORIES, detectCategory, parseItemInput } from "@/lib/categories";
import { ImageGrid, ImagePicker, ImageStrip } from "../images";
import { ConfirmButton, Sheet } from "../sheet";
import { useToast } from "../toast";
import { confetti, haptic } from "../confetti";
import { autoGrow, clearUrlParams, useRefreshOnFocus } from "../hooks";

type Suggestion = { name: string; times: number; category: string };

type OptimisticAction =
  | { type: "toggle"; id: string; checked: boolean }
  | { type: "add"; items: ShoppingItem[] };

export function ShoppingBoard({
  items,
  suggestions,
  initialOpenId,
}: {
  items: ShoppingItem[];
  suggestions: Suggestion[];
  initialOpenId?: string;
}) {
  useRefreshOnFocus(5_000);
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [attach, setAttach] = useState<ImageRef[]>([]);
  const [showAttach, setShowAttach] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<string | null>(() =>
    initialOpenId && items.some((i) => i.id === initialOpenId) ? initialOpenId : null,
  );
  const editingItem = editing ? items.find((i) => i.id === editing) : undefined;

  useEffect(() => {
    if (initialOpenId) clearUrlParams();
  }, [initialOpenId]);

  const [list, apply] = useOptimistic(items, (state, a: OptimisticAction) => {
    switch (a.type) {
      case "toggle":
        return state.map((i) => (i.id === a.id ? { ...i, checked: a.checked } : i));
      case "add":
        return [...state, ...a.items];
    }
  });

  const open = list.filter((i) => !i.checked);
  const inCart = list.filter((i) => i.checked);
  const total = list.length;

  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const i of open) map.set(i.category, [...(map.get(i.category) ?? []), i]);
    return CATEGORIES.filter((c) => map.has(c.id)).map((c) => ({ cat: c, items: map.get(c.id)! }));
  }, [open]);

  const typed = value.trim().toLowerCase();
  const autocomplete = typed
    ? suggestions.filter((s) => s.name.toLowerCase().includes(typed) && s.name.toLowerCase() !== typed).slice(0, 5)
    : [];

  const add = (raw: string, images: ImageRef[] = []) => {
    const text = raw.trim();
    if (!text) return;
    haptic(10);
    const temp: ShoppingItem[] = text
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p, idx) => {
        const { name, quantity } = parseItemInput(p);
        return {
          id: `temp-${Date.now()}-${idx}`,
          userId: null,
          name,
          quantity,
          category: detectCategory(name),
          note: "",
          checked: false,
          checkedAt: null,
          archived: false,
          images: idx === 0 ? images : [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
    startTransition(async () => {
      apply({ type: "add", items: temp });
      const res = await addShoppingItems(text, images);
      if (res.error) toast(res.error, "error");
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    add(value, attach);
    setValue("");
    setAttach([]);
    setShowAttach(false);
    inputRef.current?.focus();
  };

  const toggle = (item: ShoppingItem) => {
    if (item.id.startsWith("temp-")) return;
    const next = !item.checked;
    haptic(next ? 12 : 6);
    if (next && open.length === 1) {
      setTimeout(() => confetti(window.innerWidth / 2, window.innerHeight / 3, 80), 150);
      toast("Alles im Wagen.", "success");
    }
    startTransition(async () => {
      apply({ type: "toggle", id: item.id, checked: next });
      await toggleShoppingItem(item.id, next);
    });
  };

  const finish = () =>
    startTransition(async () => {
      const r = await finishShopping();
      toast(`Einkauf abgeschlossen – ${r.count} Artikel`, "success");
    });

  const pct = total ? inCart.length / total : 0;

  return (
    <div className="page">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="muted text-sm font-medium">
            {open.length === 0 ? "Nichts mehr zu holen" : `${open.length} Artikel offen`}
          </p>
          <h1 className="page-title">Einkauf</h1>
        </div>
        {total > 0 && (
          <div className="text-right">
            <p className="text-xl font-semibold tabular-nums">{Math.round(pct * 100)}%</p>
            <p className="faint text-xs font-medium">im Wagen</p>
          </div>
        )}
      </header>

      {total > 0 && (
        <div className="mb-4 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct * 100}%`, background: "var(--accent)" }}
          />
        </div>
      )}

      {/* Add bar */}
      <form onSubmit={submit} className="relative z-10 mb-4">
        <div className="glass rounded-xl p-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="icon-btn flex-none"
              onClick={() => setShowAttach((v) => !v)}
              aria-label="Foto hinzufügen"
              style={showAttach || attach.length ? { color: "var(--accent)" } : undefined}
            >
              <Camera size={20} />
            </button>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder="z.B. 2x Milch, Brot, 500 g Hack"
              className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-[var(--text-3)]"
              enterKeyHint="send"
              autoComplete="off"
              aria-label="Artikel hinzufügen"
            />
            <button
              type="submit"
              className="btn btn-primary !h-9 !min-h-9 !w-9 flex-none !p-0"
              disabled={!value.trim() || busy}
              aria-label="Hinzufügen"
            >
              <ArrowUp size={20} />
            </button>
          </div>
          {showAttach && (
            <div className="px-2 pt-2 pb-1.5">
              <ImagePicker value={attach} onChange={setAttach} onBusyChange={setBusy} />
              <p className="faint mt-1.5 text-xs">Das Foto wird dem ersten Artikel angehängt – z.B. die richtige Marke.</p>
            </div>
          )}
        </div>
        {focused && autocomplete.length > 0 && (
          <div className="absolute inset-x-0 top-full mt-1.5 overflow-hidden rounded-xl border shadow-[var(--shadow-lg)]" style={{ background: "var(--surface-solid)", borderColor: "var(--border)" }}>
            {autocomplete.map((s) => (
              <button
                key={s.name}
                type="button"
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-hover)]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  add(s.name);
                  setValue("");
                }}
              >
                <CategoryIcon id={s.category} className="faint" />
                <span className="flex-1 font-medium">{s.name}</span>
                <span className="faint text-xs">{s.times}× gekauft</span>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <section className="mb-5">
          <h2 className="section-title mb-2 px-1">Schnell hinzufügen</h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {suggestions.slice(0, 16).map((s) => (
              <button key={s.name} type="button" className="chip flex-none" onClick={() => add(s.name)}>
                <CategoryIcon id={s.category} size={14} className="faint" />
                {s.name}
                <Plus size={14} className="faint" />
              </button>
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <EmptyState
          icon={ShoppingCart}
          title="Die Liste ist leer"
          text="Tippe oben, was du brauchst. Mehrere Artikel mit Komma trennen – sie werden automatisch nach Kategorien sortiert."
        />
      )}

      <div className="space-y-4">
        {grouped.map(({ cat, items: catItems }) => (
          <section key={cat.id}>
            <h2 className="section-title mb-2 flex items-center gap-1.5 px-1">
              <CategoryIcon id={cat.id} size={14} /> {cat.label}
            </h2>
            <ul className="glass divide-soft overflow-hidden rounded-xl">
              {catItems.map((i) => (
                <ItemRow key={i.id} item={i} onToggle={() => toggle(i)} onOpen={() => !i.id.startsWith("temp-") && setEditing(i.id)} />
              ))}
            </ul>
          </section>
        ))}

        {inCart.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="section-title">Im Wagen · {inCart.length}</h2>
            </div>
            <ul className="glass divide-soft overflow-hidden rounded-xl">
              {inCart.map((i) => (
                <ItemRow key={i.id} item={i} onToggle={() => toggle(i)} onOpen={() => setEditing(i.id)} />
              ))}
            </ul>
            <button type="button" className="btn btn-primary mt-3 w-full" onClick={finish}>
              <CircleCheckBig size={17} /> Einkauf abschließen
            </button>
            <p className="faint mt-2 text-center text-xs">
              Abgehakte Artikel wandern in deinen Verlauf und erscheinen als Vorschläge.
            </p>
          </section>
        )}
      </div>

      {editingItem && <ItemEditor key={editingItem.id} item={editingItem} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ItemRow({ item: i, onToggle, onOpen }: { item: ShoppingItem; onToggle: () => void; onOpen: () => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-hover)]">
      <button type="button" className="check" data-checked={i.checked} onClick={onToggle} aria-label={i.checked ? "Zurücklegen" : "In den Wagen"}>
        {i.checked && <Check size={13} color="white" strokeWidth={3.5} />}
      </button>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => e.key === "Enter" && onOpen()}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
      >
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-medium ${i.checked ? "faint line-through" : ""}`}>{i.name}</p>
          {i.note && <p className="muted truncate text-[13px]">{i.note}</p>}
        </div>
        {i.quantity && <span className="badge flex-none tabular-nums">{i.quantity}</span>}
        {i.images.length > 0 && <ImageStrip images={i.images} size={40} max={1} />}
      </div>
    </li>
  );
}

const ITEM_FORM = "shopping-item-form";

/** Read-only view first; "Bearbeiten" switches to the form. */
function ItemEditor({ item, onClose }: { item: ShoppingItem; onClose: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const category = CATEGORIES.find((c) => c.id === item.category) ?? CATEGORIES[CATEGORIES.length - 1];

  if (mode === "view") {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Artikel"
        footer={
          <>
            <ConfirmButton
              className="btn btn-ghost !px-3.5"
              confirmText="Entfernen?"
              onConfirm={() =>
                startTransition(async () => {
                  await deleteShoppingItem(item.id);
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
          <div>
            <h3 className={`text-xl font-semibold leading-snug ${item.checked ? "faint line-through" : ""}`}>
              {item.name}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="badge">
                <CategoryIcon id={category.id} size={13} /> {category.label}
              </span>
              {item.quantity && <span className="badge tabular-nums">Menge: {item.quantity}</span>}
              {item.checked && (
                <span className="badge" style={{ color: "var(--success)" }}>
                  <Check size={13} /> Im Wagen
                </span>
              )}
            </div>
          </div>
          {item.note && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{item.note}</p>}
          <ImageGrid images={item.images} />
          <button
            type="button"
            className="btn btn-ghost w-full"
            disabled={pending}
            style={item.checked ? undefined : { color: "var(--accent-text)", borderColor: "var(--accent)" }}
            onClick={() =>
              startTransition(async () => {
                await toggleShoppingItem(item.id, !item.checked);
                onClose();
              })
            }
          >
            {item.checked ? <RotateCcw size={16} /> : <Check size={16} />}
            {item.checked ? "Zurück auf die Liste" : "In den Wagen legen"}
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Artikel bearbeiten"
      footer={
        <>
          <button key="cancel" type="button" className="btn btn-ghost" onClick={() => setMode("view")}>
            Abbrechen
          </button>
          <button key="save" type="submit" form={ITEM_FORM} className="btn btn-primary flex-1" disabled={pending || busy}>
            {busy ? "Bilder werden hochgeladen…" : "Speichern"}
          </button>
        </>
      }
    >
      <ItemForm
        item={item}
        onBusyChange={setBusy}
        onSubmit={(input) =>
          startTransition(async () => {
            const res = await updateShoppingItem({ id: item.id, ...input });
            if (res.error) toast(res.error, "error");
            else {
              toast("Gespeichert", "success");
              setMode("view");
            }
          })
        }
      />
    </Sheet>
  );
}

function ItemForm({
  item,
  onSubmit,
  onBusyChange,
}: {
  item: ShoppingItem;
  onSubmit: (input: { name: string; quantity: string; category: string; note: string; images: ImageRef[] }) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [category, setCategory] = useState(item.category);
  const [note, setNote] = useState(item.note);
  const [images, setImages] = useState<ImageRef[]>(item.images);

  return (
    <form
      id={ITEM_FORM}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, quantity, category, note, images });
      }}
    >
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <input className="field font-semibold" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input className="field" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Menge" />
      </div>
      <div>
        <span className="label">Kategorie</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className="chip" data-active={category === c.id} onClick={() => setCategory(c.id)}>
              <CategoryIcon id={c.id} size={14} /> {c.label}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="label">Notiz</span>
        <textarea
          ref={autoGrow}
          className="field min-h-[70px]"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            autoGrow(e.target);
          }}
          placeholder="Marke, Sorte, Laden…"
        />
      </label>
      <div>
        <span className="label">Fotos</span>
        <ImagePicker value={images} onChange={setImages} onBusyChange={onBusyChange} />
      </div>
    </form>
  );
}

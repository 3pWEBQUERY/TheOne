"use client";

import { useState, useTransition } from "react";
import {
  ArrowDown,
  Bell,
  BellRing,
  CalendarDays,
  Check,
  Flag,
  Minus,
  Pencil,
  Repeat,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { ImageRef, Todo } from "@/db/schema";
import { deleteTodo, saveTodo, snoozeTodo, toggleTodo } from "@/lib/actions/todos";
import { formatDate, formatTime } from "@/lib/dates";
import { ConfirmButton, Sheet } from "../sheet";
import { ImageGrid, ImagePicker } from "../images";
import { useToast } from "../toast";
import { autoGrow, canAutoFocus, localDate, localTime } from "../hooks";
import { useAppConfig } from "../app-context";
import { enablePush } from "../push-client";
import { DetailRow } from "../detail";
import { haptic } from "../confetti";

const REMIND_OPTIONS = [
  { v: "none", label: "Keine" },
  { v: "0", label: "Zum Termin" },
  { v: "10", label: "10 Min. vorher" },
  { v: "60", label: "1 Std. vorher" },
  { v: "1440", label: "1 Tag vorher" },
  { v: "custom", label: "Eigene Zeit" },
];

const REPEAT_LABEL: Record<string, string> = {
  none: "Nie",
  daily: "Täglich",
  weekdays: "Werktags",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
};

const PRIORITY_LABEL = ["Niedrig", "Normal", "Wichtig"];

const FORM_ID = "todo-form";

function initialRemind(t: Todo | null) {
  if (!t?.remindAt) return "none";
  if (!t.dueAt) return "custom";
  const diff = Math.round((t.dueAt.getTime() - t.remindAt.getTime()) / 60000);
  return ["0", "10", "60", "1440"].includes(String(diff)) ? String(diff) : "custom";
}

function isAllDay(d: Date) {
  return d.getHours() === 23 && d.getMinutes() === 59;
}

function formatDue(d: Date) {
  const date = formatDate(d, { weekday: "long" });
  return isAllDay(d) ? date : `${date}, ${formatTime(d)} Uhr`;
}

/** Opens in read-only view for existing todos; "Bearbeiten" switches to the form. */
export function TodoEditor({ todo, onClose }: { todo: Todo | null; onClose: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<"view" | "edit">(todo ? "view" : "edit");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      if (!todo) return;
      await deleteTodo(todo.id);
      toast("Aufgabe gelöscht");
      onClose();
    });

  if (mode === "view" && todo) {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Aufgabe"
        footer={
          <>
            <ConfirmButton className="btn btn-ghost !px-3.5" onConfirm={remove}>
              <Trash2 size={17} />
            </ConfirmButton>
            <button key="edit" type="button" className="btn btn-primary flex-1" onClick={() => setMode("edit")}>
              <Pencil size={16} /> Bearbeiten
            </button>
          </>
        }
      >
        <TodoView todo={todo} onClose={onClose} />
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={todo ? "Aufgabe bearbeiten" : "Neue Aufgabe"}
      footer={
        <>
          {todo && (
            <button key="cancel" type="button" className="btn btn-ghost" onClick={() => setMode("view")}>
              Abbrechen
            </button>
          )}
          <button key="save" type="submit" form={FORM_ID} className="btn btn-primary flex-1" disabled={pending || busy}>
            {busy ? "Bilder werden hochgeladen…" : todo ? "Speichern" : "Aufgabe erstellen"}
          </button>
        </>
      }
    >
      <TodoForm
        todo={todo}
        onBusyChange={setBusy}
        onSubmit={(input) =>
          startTransition(async () => {
            const res = await saveTodo({ id: todo?.id, ...input });
            if (res.error) {
              toast(res.error, "error");
              return;
            }
            toast(todo ? "Gespeichert" : "Aufgabe erstellt", "success");
            if (todo) setMode("view");
            else onClose();
          })
        }
      />
    </Sheet>
  );
}

function TodoView({ todo, onClose }: { todo: Todo; onClose: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const now = new Date();
  const overdue = !todo.done && todo.dueAt && todo.dueAt < now;

  const toggle = () =>
    startTransition(async () => {
      haptic(todo.done ? 8 : [10, 30, 20]);
      const res = await toggleTodo(todo.id, !todo.done);
      if (res.error) toast(res.error, "error");
      else {
        toast(todo.done ? "Wieder offen" : "rolled" in res ? "Erledigt – nächster Termin geplant" : "Erledigt", "success");
        if (!todo.done && !("rolled" in res)) onClose();
      }
    });

  const snooze = (minutes: number) =>
    startTransition(async () => {
      await snoozeTodo(todo.id, minutes);
      toast("Erinnerung verschoben", "success");
    });

  return (
    <div className="space-y-5">
      <div>
        <h3 className={`text-xl font-semibold leading-snug ${todo.done ? "faint line-through" : ""}`}>
          {todo.priority === 2 && !todo.done && (
            <Flag size={16} className="mr-2 inline -translate-y-0.5" style={{ color: "var(--danger)" }} />
          )}
          {todo.title}
        </h3>
        <button
          type="button"
          className="btn btn-ghost mt-3 w-full"
          onClick={toggle}
          disabled={pending}
          style={todo.done ? undefined : { color: "var(--accent-text)", borderColor: "var(--accent)" }}
        >
          {todo.done ? <RotateCcw size={16} /> : <Check size={16} />}
          {todo.done ? "Wieder öffnen" : "Als erledigt markieren"}
        </button>
      </div>

      <div className="divide-soft rounded-lg border" style={{ borderColor: "var(--border)" }}>
        <DetailRow icon={CalendarDays} label="Fällig">
          {todo.dueAt ? (
            <span style={overdue ? { color: "var(--danger)" } : undefined}>{formatDue(todo.dueAt)}</span>
          ) : (
            <span className="faint">Ohne Datum</span>
          )}
        </DetailRow>
        <DetailRow icon={Bell} label="Erinnerung">
          {todo.remindAt ? `${formatDate(todo.remindAt, { weekday: "short" })}, ${formatTime(todo.remindAt)} Uhr` : <span className="faint">Keine</span>}
        </DetailRow>
        <DetailRow icon={Repeat} label="Wiederholen">
          {REPEAT_LABEL[todo.repeat] ?? "Nie"}
        </DetailRow>
        <DetailRow icon={Flag} label="Priorität">
          {PRIORITY_LABEL[todo.priority] ?? "Normal"}
        </DetailRow>
      </div>

      {todo.remindAt && !todo.done && (
        <div>
          <span className="label">Später erinnern</span>
          <div className="flex gap-2">
            <button type="button" className="chip" onClick={() => snooze(15)} disabled={pending}>
              +15 Min.
            </button>
            <button type="button" className="chip" onClick={() => snooze(60)} disabled={pending}>
              +1 Std.
            </button>
            <button type="button" className="chip" onClick={() => snooze(60 * 24)} disabled={pending}>
              Morgen
            </button>
          </div>
        </div>
      )}

      {todo.notes && (
        <div>
          <span className="label">Notizen</span>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{todo.notes}</p>
        </div>
      )}

      {todo.images.length > 0 && (
        <div>
          <span className="label">Bilder</span>
          <ImageGrid images={todo.images} />
        </div>
      )}
    </div>
  );
}

type TodoFormInput = {
  title: string;
  notes: string;
  priority: number;
  dueAt: string | null;
  remindAt: string | null;
  repeat: string;
  images: ImageRef[];
};

function TodoForm({
  todo,
  onSubmit,
  onBusyChange,
}: {
  todo: Todo | null;
  onSubmit: (input: TodoFormInput) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const toast = useToast();
  const { vapidPublicKey } = useAppConfig();

  const [title, setTitle] = useState(todo?.title ?? "");
  const [notes, setNotes] = useState(todo?.notes ?? "");
  const [priority, setPriority] = useState(todo?.priority ?? 1);
  const [date, setDate] = useState(todo?.dueAt ? localDate(todo.dueAt) : "");
  const [time, setTime] = useState(todo?.dueAt && !isAllDay(todo.dueAt) ? localTime(todo.dueAt) : "");
  const [remind, setRemind] = useState(initialRemind(todo));
  const [customRemind, setCustomRemind] = useState(
    todo?.remindAt ? `${localDate(todo.remindAt)}T${localTime(todo.remindAt)}` : "",
  );
  const [repeat, setRepeat] = useState(todo?.repeat ?? "none");
  const [images, setImages] = useState<ImageRef[]>(todo?.images ?? []);
  const [needsPush, setNeedsPush] = useState(false);

  const setQuickDate = (offsetDays: number | null) => {
    if (offsetDays === null) {
      setDate("");
      setTime("");
      if (remind !== "custom") setRemind("none");
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDate(localDate(d));
  };

  const computeDue = () => {
    if (!date) return null;
    const [y, m, d] = date.split("-").map(Number);
    const due = new Date(y, m - 1, d);
    if (time) {
      const [hh, mm] = time.split(":").map(Number);
      due.setHours(hh, mm, 0, 0);
    } else due.setHours(23, 59, 0, 0);
    return due;
  };

  const computeRemind = (due: Date | null) => {
    if (remind === "none") return null;
    if (remind === "custom") return customRemind ? new Date(customRemind) : null;
    if (!due) return null;
    const base = new Date(due);
    if (!time) base.setHours(9, 0, 0, 0); // all-day tasks: remind in the morning
    return new Date(base.getTime() - Number(remind) * 60000);
  };

  const onRemindChange = (v: string) => {
    setRemind(v);
    if (v !== "none" && typeof Notification !== "undefined" && Notification.permission !== "granted") {
      setNeedsPush(true);
    }
    if (v !== "none" && v !== "custom" && !date) setQuickDate(0);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast("Bitte gib einen Titel ein.", "error");
      return;
    }
    const due = computeDue();
    const remindAt = computeRemind(due);
    onSubmit({
      title,
      notes,
      priority,
      dueAt: due?.toISOString() ?? null,
      remindAt: remindAt?.toISOString() ?? null,
      repeat,
      images,
    });
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-4">
      <input
        className="field !text-[17px] font-medium"
        placeholder="Was möchtest du erledigen?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus={!todo && canAutoFocus()}
        enterKeyHint="done"
      />

      <div>
        <span className="label">Priorität</span>
        <div className="flex gap-2">
          {(
            [
              [0, "Niedrig", ArrowDown],
              [1, "Normal", Minus],
              [2, "Wichtig", Flag],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              className="chip flex-1 justify-center"
              data-active={priority === v}
              onClick={() => setPriority(v)}
            >
              <Icon size={14} style={v === 2 ? { color: "var(--danger)" } : undefined} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Fällig</span>
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
          <button type="button" className="chip" onClick={() => setQuickDate(0)}>Heute</button>
          <button type="button" className="chip" onClick={() => setQuickDate(1)}>Morgen</button>
          <button type="button" className="chip" onClick={() => setQuickDate(7)}>In 1 Woche</button>
          <button type="button" className="chip" onClick={() => setQuickDate(null)}>Ohne Datum</button>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Datum" />
          <input
            type="time"
            className="field w-32"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={!date}
            aria-label="Uhrzeit"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">Erinnerung</span>
          <select className="field" value={remind} onChange={(e) => onRemindChange(e.target.value)}>
            {REMIND_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Wiederholen</span>
          <select className="field" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
            {Object.entries(REPEAT_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {remind === "custom" && (
        <input
          type="datetime-local"
          className="field"
          value={customRemind}
          onChange={(e) => setCustomRemind(e.target.value)}
          aria-label="Erinnerungszeit"
        />
      )}

      {needsPush && (
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm"
          style={{ borderColor: "var(--border-strong)", background: "var(--accent-soft)" }}
          onClick={async () => {
            const r = await enablePush(vapidPublicKey);
            if (r.ok) {
              setNeedsPush(false);
              toast("Benachrichtigungen aktiviert", "success");
            } else toast(r.error ?? "Fehler", "error");
          }}
        >
          <BellRing className="flex-none text-[var(--accent)]" size={22} />
          <span>
            <b>Benachrichtigungen aktivieren</b>
            <br />
            <span className="muted">Damit dich TheOne pünktlich erinnern kann.</span>
          </span>
        </button>
      )}

      <label className="block">
        <span className="label">Notizen</span>
        <textarea
          ref={autoGrow}
          className="field min-h-[88px]"
          placeholder="Details, Links, Gedanken…"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            autoGrow(e.target);
          }}
        />
      </label>

      <div>
        <span className="label">Bilder</span>
        <ImagePicker value={images} onChange={setImages} onBusyChange={onBusyChange} />
      </div>
    </form>
  );
}

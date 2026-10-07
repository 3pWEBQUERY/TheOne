"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { ArrowUp, Bell, CalendarDays } from "lucide-react";
import { saveTodo } from "@/lib/actions/todos";
import { parseQuickTodo } from "@/lib/quick-parse";
import { relativeDue } from "@/lib/dates";
import { useToast } from "../toast";
import { haptic } from "../confetti";

export function QuickTodo() {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const parsed = useMemo(() => (value.trim() ? parseQuickTodo(value) : null), [value]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed?.title) return;
    const p = parsed;
    setValue("");
    haptic(10);
    startTransition(async () => {
      const res = await saveTodo({
        title: p.title,
        priority: p.priority,
        dueAt: p.dueAt?.toISOString() ?? null,
        remindAt: p.hasTime && p.dueAt ? p.dueAt.toISOString() : null,
      });
      if (res.error) {
        toast(res.error, "error");
        setValue(value);
      } else toast("Aufgabe hinzugefügt ✨", "success");
      input.current?.focus();
    });
  };

  return (
    <form onSubmit={submit} className="mb-4">
      <div className="glass-strong glass-pill flex items-center gap-2 py-1.5 pr-1.5 pl-5">
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Neue Aufgabe… z.B. „Sport morgen 18 Uhr“"
          className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-[var(--text-3)]"
          enterKeyHint="send"
          aria-label="Neue Aufgabe"
        />
        <button type="submit" className="btn btn-primary !h-10 !min-h-10 !w-10 !p-0" disabled={!value.trim() || pending} aria-label="Hinzufügen">
          <ArrowUp size={20} />
        </button>
      </div>
      {parsed?.dueAt && (
        <p className="muted mt-2 flex items-center gap-3 px-4 text-[13px] font-medium">
          <span className="flex items-center gap-1">
            <CalendarDays size={13} /> {relativeDue(parsed.dueAt)}
          </span>
          {parsed.hasTime && (
            <span className="flex items-center gap-1">
              <Bell size={13} /> Erinnerung
            </span>
          )}
          {parsed.priority === 2 && <span className="text-[var(--danger)]">Wichtig</span>}
        </p>
      )}
    </form>
  );
}

"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Bell, Check } from "lucide-react";
import type { ShoppingItem, Todo } from "@/db/schema";
import { toggleTodo } from "@/lib/actions/todos";
import { toggleShoppingItem } from "@/lib/actions/shopping";
import { relativeDue } from "@/lib/dates";
import { randomCheer } from "@/lib/motivation";
import { confetti, haptic } from "./confetti";
import { useToast } from "./toast";
import { useRefreshOnFocus } from "./hooks";

export function RefreshOnFocus() {
  useRefreshOnFocus();
  return null;
}

export function MiniTodos({ todos }: { todos: Todo[] }) {
  const toast = useToast();
  const [, start] = useTransition();
  const [list, remove] = useOptimistic(todos, (s, id: string) => s.filter((t) => t.id !== id));
  const now = new Date();

  if (list.length === 0) {
    return <p className="muted py-2 text-sm">Keine offenen Aufgaben – stark! 🎉</p>;
  }
  return (
    <ul className="space-y-1">
      {list.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-1.5">
          <button
            type="button"
            className="check !h-6 !w-6"
            data-priority={t.priority}
            aria-label="Erledigen"
            onClick={(e) => {
              haptic([10, 30, 20]);
              confetti(e.clientX, e.clientY, 35);
              toast(randomCheer(), "success");
              start(async () => {
                remove(t.id);
                await toggleTodo(t.id, true);
              });
            }}
          />
          <Link href={`/todos?open=${t.id}`} className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{t.title}</p>
            {t.dueAt && (
              <p className={`flex items-center gap-1 text-xs ${t.dueAt < now ? "font-semibold text-[var(--danger)]" : "muted"}`}>
                {relativeDue(t.dueAt, now)}
                {t.remindAt && <Bell size={11} />}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function MiniShopping({ items }: { items: ShoppingItem[] }) {
  const [, start] = useTransition();
  const [list, remove] = useOptimistic(items, (s, id: string) => s.filter((t) => t.id !== id));
  if (list.length === 0) return <p className="muted py-2 text-sm">Die Liste ist leer.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.slice(0, 10).map((i) => (
        <button
          key={i.id}
          type="button"
          className="chip !min-h-8"
          onClick={() => {
            haptic(10);
            start(async () => {
              remove(i.id);
              await toggleShoppingItem(i.id, true);
            });
          }}
          title="Abhaken"
        >
          <Check size={13} className="faint" />
          {i.quantity && <b>{i.quantity}</b>} {i.name}
        </button>
      ))}
      {list.length > 10 && <span className="chip !min-h-8 muted">+{list.length - 10}</span>}
    </div>
  );
}

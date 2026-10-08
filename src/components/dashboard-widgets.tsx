"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Bell } from "lucide-react";
import { CategoryIcon } from "./icons";
import type { ShoppingItem, Todo } from "@/db/schema";
import { toggleTodo } from "@/lib/actions/todos";
import { toggleShoppingItem } from "@/lib/actions/shopping";
import { relativeDue } from "@/lib/dates";
import { randomCheer } from "@/lib/motivation";
import { haptic } from "./confetti";
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
    return <p className="muted py-1 text-sm">Keine offenen Aufgaben.</p>;
  }
  return (
    <ul className="divide-soft">
      {list.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2">
          <button
            type="button"
            className="check"
            data-priority={t.priority}
            aria-label="Erledigen"
            onClick={() => {
              haptic([10, 30, 20]);
              toast(randomCheer(), "success");
              start(async () => {
                remove(t.id);
                await toggleTodo(t.id, true);
              });
            }}
          />
          <Link href={`/todos?open=${t.id}`} className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{t.title}</p>
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
  if (list.length === 0) return <p className="muted py-1 text-sm">Die Liste ist leer.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.slice(0, 10).map((i) => (
        <button
          key={i.id}
          type="button"
          className="chip"
          onClick={() => {
            haptic(10);
            start(async () => {
              remove(i.id);
              await toggleShoppingItem(i.id, true);
            });
          }}
          title="Abhaken"
        >
          <CategoryIcon id={i.category} size={14} className="faint" />
          {i.quantity && <span className="faint">{i.quantity}</span>} {i.name}
        </button>
      ))}
      {list.length > 10 && <span className="chip muted">+{list.length - 10}</span>}
    </div>
  );
}

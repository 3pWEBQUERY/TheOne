import type { Metadata } from "next";
import { TodoBoard } from "@/components/todos/todo-board";
import { getAllTodos, getTodoStats } from "@/lib/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Aufgaben" };

export default async function TodosPage(props: PageProps<"/todos">) {
  const sp = await props.searchParams;
  const user = await requireUser();
  const [{ open, done }, stats] = await Promise.all([getAllTodos(user.id), getTodoStats(user.id)]);
  return (
    <TodoBoard
      open={open}
      done={done}
      stats={stats}
      initialOpenId={typeof sp.open === "string" ? sp.open : undefined}
      startNew={sp.new === "1"}
    />
  );
}

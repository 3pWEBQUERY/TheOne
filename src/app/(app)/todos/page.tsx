import type { Metadata } from "next";
import { TodoBoard } from "@/components/todos/todo-board";
import { getAllTodos, getTodoStats } from "@/lib/queries";

export const metadata: Metadata = { title: "Aufgaben" };

export default async function TodosPage(props: PageProps<"/todos">) {
  const sp = await props.searchParams;
  const [{ open, done }, stats] = await Promise.all([getAllTodos(), getTodoStats()]);
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

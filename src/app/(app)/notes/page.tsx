import type { Metadata } from "next";
import { NotesBoard } from "@/components/notes/notes-board";
import { getNotes } from "@/lib/queries";

export const metadata: Metadata = { title: "Notizen" };

export default async function NotesPage(props: PageProps<"/notes">) {
  const sp = await props.searchParams;
  const notes = await getNotes();
  return (
    <NotesBoard
      notes={notes}
      initialOpenId={typeof sp.open === "string" ? sp.open : undefined}
      startNew={sp.new === "1"}
    />
  );
}

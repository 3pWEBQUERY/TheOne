import type { Metadata } from "next";
import { JournalBoard } from "@/components/journal/journal-board";
import { getJournalEntries, getMoodHistory, getOnThisDay } from "@/lib/queries";

export const metadata: Metadata = { title: "Tagebuch" };

export default async function JournalPage(props: PageProps<"/journal">) {
  const sp = await props.searchParams;
  const [entries, onThisDay, moods] = await Promise.all([getJournalEntries(), getOnThisDay(), getMoodHistory(14)]);
  const mood = Number(sp.mood);
  return (
    <JournalBoard
      entries={entries}
      onThisDay={onThisDay}
      moods={moods}
      initialOpenId={typeof sp.open === "string" ? sp.open : undefined}
      startNew={sp.new === "1"}
      startMood={mood >= 1 && mood <= 5 ? mood : undefined}
    />
  );
}

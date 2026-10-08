export const QUOTES: { text: string; author: string }[] = [
  { text: "Der Weg ist das Ziel.", author: "Konfuzius" },
  { text: "Auch eine Reise von tausend Meilen beginnt mit einem ersten Schritt.", author: "Laozi" },
  { text: "Es ist nicht wenig Zeit, die wir haben, sondern es ist viel Zeit, die wir nicht nutzen.", author: "Seneca" },
  { text: "Tu erst das Notwendige, dann das Mögliche, und plötzlich schaffst du das Unmögliche.", author: "Franz von Assisi" },
  { text: "Wer immer tut, was er schon kann, bleibt immer das, was er schon ist.", author: "Henry Ford" },
  { text: "Erfolg ist die Summe kleiner Anstrengungen, Tag für Tag wiederholt.", author: "Robert Collier" },
  { text: "Das Geheimnis des Vorankommens ist, anzufangen.", author: "Mark Twain" },
  { text: "Disziplin ist die Brücke zwischen Zielen und Erfolg.", author: "Jim Rohn" },
  { text: "Glück ist kein Ziel, sondern eine Art zu reisen.", author: "Margaret Lee Runbeck" },
  { text: "Mach es einfach. Mach es jetzt.", author: "TheOne" },
  { text: "Kleine Schritte sind besser als keine Schritte.", author: "TheOne" },
  { text: "Was du heute kannst besorgen, das verschiebe nicht auf morgen.", author: "Sprichwort" },
  { text: "Die beste Zeit, einen Baum zu pflanzen, war vor zwanzig Jahren. Die zweitbeste ist jetzt.", author: "Chinesisches Sprichwort" },
  { text: "Man muss das Unmögliche versuchen, um das Mögliche zu erreichen.", author: "Hermann Hesse" },
  { text: "Jeder Tag ist eine neue Chance, das zu tun, was du möchtest.", author: "Friedrich Schiller" },
  { text: "Konzentriere dich auf den Fortschritt, nicht auf Perfektion.", author: "Bill Phillips" },
  { text: "Du musst nicht großartig sein, um anzufangen – aber du musst anfangen, um großartig zu sein.", author: "Zig Ziglar" },
  { text: "Ordnung ist das halbe Leben.", author: "Sprichwort" },
  { text: "Wer kämpft, kann verlieren. Wer nicht kämpft, hat schon verloren.", author: "Bertolt Brecht" },
  { text: "Heute ist ein guter Tag, um etwas zu schaffen, auf das du morgen stolz bist.", author: "TheOne" },
];

export function quoteOfTheDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return QUOTES[day % QUOTES.length];
}

export const CHEERS = [
  "Erledigt. Weiter so!",
  "Gut gemacht.",
  "Ein Punkt weniger auf der Liste.",
  "Stark – dranbleiben!",
  "Wieder ein Schritt nach vorn.",
  "Sauber erledigt.",
];

export function randomCheer() {
  return CHEERS[Math.floor(Math.random() * CHEERS.length)];
}

export function progressMessage(done: number, total: number) {
  if (total === 0) return done > 0 ? "Alles erledigt für heute." : "Plane deinen Tag – was steht an?";
  const pct = done / total;
  if (pct >= 1) return "Alles erledigt. Starke Leistung!";
  if (pct >= 0.75) return "Fast geschafft – noch ein kleiner Endspurt.";
  if (pct >= 0.5) return "Mehr als die Hälfte ist geschafft.";
  if (pct > 0) return "Guter Start – bleib dran.";
  return "Der erste Haken ist der wichtigste.";
}

export const MOODS = [
  { value: 1, label: "Schlecht" },
  { value: 2, label: "Mäßig" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Gut" },
  { value: 5, label: "Super" },
] as const;

export function moodLabel(mood: number | null | undefined) {
  return MOODS.find((m) => m.value === mood)?.label ?? "";
}

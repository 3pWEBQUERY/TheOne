export const NOTE_COLORS = [
  { id: "default", label: "Glas" },
  { id: "sun", label: "Sonne" },
  { id: "rose", label: "Rose" },
  { id: "mint", label: "Minze" },
  { id: "sky", label: "Himmel" },
  { id: "lilac", label: "Flieder" },
] as const;

export const NOTE_COLOR_IDS: readonly string[] = NOTE_COLORS.map((c) => c.id);

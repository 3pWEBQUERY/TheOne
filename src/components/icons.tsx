import {
  Annoyed,
  Beef,
  Carrot,
  Cookie,
  Croissant,
  CupSoda,
  Droplets,
  Frown,
  Laugh,
  Meh,
  Milk,
  Package,
  PawPrint,
  ShoppingBag,
  Smile,
  Snowflake,
  SprayCan,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  obst: Carrot,
  backwaren: Croissant,
  milch: Milk,
  fleisch: Beef,
  vorrat: Package,
  tiefkuehl: Snowflake,
  snacks: Cookie,
  getraenke: CupSoda,
  drogerie: Droplets,
  haushalt: SprayCan,
  tier: PawPrint,
  sonstiges: ShoppingBag,
};

export function CategoryIcon({ id, size = 16, className }: { id: string; size?: number; className?: string }) {
  const Icon = CATEGORY_ICONS[id] ?? ShoppingBag;
  return <Icon size={size} className={className} strokeWidth={1.9} />;
}

export const MOOD_STYLES: Record<number, { icon: LucideIcon; color: string }> = {
  1: { icon: Frown, color: "#ef4444" },
  2: { icon: Annoyed, color: "#f97316" },
  3: { icon: Meh, color: "#a3a3a3" },
  4: { icon: Smile, color: "#22c55e" },
  5: { icon: Laugh, color: "#3b82f6" },
};

export function MoodIcon({ mood, size = 18, muted }: { mood: number | null | undefined; size?: number; muted?: boolean }) {
  if (!mood || !MOOD_STYLES[mood]) return null;
  const { icon: Icon, color } = MOOD_STYLES[mood];
  return <Icon size={size} strokeWidth={2} style={{ color: muted ? "var(--text-3)" : color }} aria-hidden />;
}

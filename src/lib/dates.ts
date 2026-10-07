export const APP_TIMEZONE = process.env.TZ || "Europe/Berlin";

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD in local time. */
export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = {}) {
  const date = typeof d === "string" ? parseLocalDate(d) : d;
  return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", ...opts }).format(date);
}

export function formatTime(d: Date) {
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(d);
}

/** Parses YYYY-MM-DD as local date (not UTC). */
export function parseLocalDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function relativeDue(due: Date, now = new Date()) {
  const today = startOfDay(now).getTime();
  const day = startOfDay(due).getTime();
  const diff = Math.round((day - today) / 86_400_000);
  const time = formatTime(due);
  const showTime = !(due.getHours() === 23 && due.getMinutes() === 59);
  const t = showTime ? `, ${time}` : "";
  if (diff === 0) return `Heute${t}`;
  if (diff === 1) return `Morgen${t}`;
  if (diff === -1) return `Gestern${t}`;
  if (diff > 1 && diff < 7) return `${new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(due)}${t}`;
  return `${formatDate(due, { day: "numeric", month: "short", year: diff > 300 || diff < -300 ? "numeric" : undefined })}${t}`;
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "Gute Nacht";
  if (h < 11) return "Guten Morgen";
  if (h < 14) return "Hallo";
  if (h < 18) return "Guten Nachmittag";
  return "Guten Abend";
}

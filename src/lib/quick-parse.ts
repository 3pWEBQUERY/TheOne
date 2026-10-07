/**
 * Tiny German natural-language parser for quick todos:
 * "Zahnarzt morgen um 15 Uhr !" → title "Zahnarzt", due tomorrow 15:00, high priority.
 */
const WEEKDAYS = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];

export type QuickParse = { title: string; dueAt: Date | null; hasTime: boolean; priority: number };

export function parseQuickTodo(input: string, now = new Date()): QuickParse {
  let text = ` ${input.trim()} `;
  let day: Date | null = null;
  let hours: number | null = null;
  let minutes = 0;
  let priority = 1;

  const take = (re: RegExp) => {
    const m = text.match(re);
    if (m) text = text.replace(m[0], " ");
    return m;
  };

  if (take(/\s(!{1,3}|wichtig|dringend)(?=\s)/i)) priority = 2;

  const base = new Date(now);
  base.setHours(0, 0, 0, 0);

  if (take(/\sübermorgen(?=\s)/i)) day = new Date(base.getTime() + 2 * 86_400_000);
  else if (take(/\smorgen(?=\s)/i)) day = new Date(base.getTime() + 86_400_000);
  else if (take(/\sheute(?=\s)/i)) day = new Date(base);
  else if (take(/\snächste[n]? woche(?=\s)/i)) {
    day = new Date(base);
    day.setDate(day.getDate() + ((8 - day.getDay()) % 7 || 7));
  } else {
    const wd = take(new RegExp(`\\s(?:am\\s)?(${WEEKDAYS.join("|")})(?=\\s)`, "i"));
    if (wd) {
      const target = WEEKDAYS.indexOf(wd[1].toLowerCase());
      day = new Date(base);
      const diff = (target - day.getDay() + 7) % 7 || 7;
      day.setDate(day.getDate() + diff);
    } else {
      const dm = take(/\s(?:am\s)?(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?(?=\s)/);
      if (dm) {
        const year = dm[3] ? Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : base.getFullYear();
        day = new Date(year, Number(dm[2]) - 1, Number(dm[1]));
        if (!dm[3] && day < base) day.setFullYear(year + 1);
      }
    }
  }

  const tm =
    take(/\s(?:um\s)?(\d{1,2})[:.](\d{2})(?:\s?uhr)?(?=\s)/i) ?? take(/\s(?:um\s)?(\d{1,2})\s?uhr(?=\s)/i);
  if (tm) {
    const h = Number(tm[1]);
    const m = tm[2] ? Number(tm[2]) : 0;
    if (h < 24 && m < 60) {
      hours = h;
      minutes = m;
    }
  }

  if (hours !== null && !day) {
    day = new Date(base);
    const candidate = new Date(day);
    candidate.setHours(hours, minutes);
    if (candidate < now) day.setDate(day.getDate() + 1);
  }

  let dueAt: Date | null = null;
  if (day) {
    dueAt = new Date(day);
    if (hours !== null) dueAt.setHours(hours, minutes, 0, 0);
    else dueAt.setHours(23, 59, 0, 0);
  }

  const title = text.replace(/\s+/g, " ").trim();
  return { title: title || input.trim(), dueAt, hasTime: hours !== null, priority };
}

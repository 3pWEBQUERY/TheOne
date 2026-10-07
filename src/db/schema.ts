import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export type ImageRef = {
  key: string;
  thumb: string;
  w: number;
  h: number;
};

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

const images = () => jsonb("images").$type<ImageRef[]>().notNull().default([]);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull().default(""),
    content: text("content").notNull().default(""),
    mood: smallint("mood"),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    images: images(),
    ...timestamps,
  },
  (t) => [index("journal_entry_date_idx").on(t.entryDate)],
);

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    priority: smallint("priority").notNull().default(1),
    dueAt: timestamp("due_at", { withTimezone: true }),
    remindAt: timestamp("remind_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    repeat: text("repeat").notNull().default("none"),
    done: boolean("done").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    images: images(),
    ...timestamps,
  },
  (t) => [
    index("todos_done_due_idx").on(t.done, t.dueAt),
    index("todos_remind_idx").on(t.remindAt),
    index("todos_completed_idx").on(t.completedAt),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull().default(""),
    content: text("content").notNull().default(""),
    color: text("color").notNull().default("default"),
    pinned: boolean("pinned").notNull().default(false),
    images: images(),
    ...timestamps,
  },
  (t) => [index("notes_pinned_updated_idx").on(t.pinned, t.updatedAt)],
);

export const shoppingItems = pgTable(
  "shopping_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    quantity: text("quantity").notNull().default(""),
    category: text("category").notNull().default("sonstiges"),
    note: text("note").notNull().default(""),
    checked: boolean("checked").notNull().default(false),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    archived: boolean("archived").notNull().default(false),
    images: images(),
    ...timestamps,
  },
  (t) => [index("shopping_state_idx").on(t.archived, t.checked)],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export type JournalEntry = typeof journalEntries.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type ShoppingItem = typeof shoppingItems.$inferSelect;

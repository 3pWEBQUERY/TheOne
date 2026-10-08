import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  primaryKey,
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

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Owner of a row. Nullable only for data created before accounts existed (claimed by the first user). */
const owner = () => uuid("user_id").references(() => users.id, { onDelete: "cascade" });

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: owner(),
    title: text("title").notNull().default(""),
    content: text("content").notNull().default(""),
    mood: smallint("mood"),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    images: images(),
    ...timestamps,
  },
  (t) => [index("journal_entry_date_idx").on(t.entryDate), index("journal_user_idx").on(t.userId)],
);

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: owner(),
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
    index("todos_user_idx").on(t.userId),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: owner(),
    title: text("title").notNull().default(""),
    content: text("content").notNull().default(""),
    color: text("color").notNull().default("default"),
    pinned: boolean("pinned").notNull().default(false),
    images: images(),
    ...timestamps,
  },
  (t) => [index("notes_pinned_updated_idx").on(t.pinned, t.updatedAt), index("notes_user_idx").on(t.userId)],
);

export const shoppingItems = pgTable(
  "shopping_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: owner(),
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
  (t) => [index("shopping_state_idx").on(t.archived, t.checked), index("shopping_user_idx").on(t.userId)],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: owner(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Legacy single-user settings (kept so old deployments migrate cleanly). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);

export type User = typeof users.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type ShoppingItem = typeof shoppingItems.$inferSelect;

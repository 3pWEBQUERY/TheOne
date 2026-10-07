import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
  db?: NodePgDatabase<typeof schema>;
};

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ist nicht gesetzt");
  const needsSsl = /sslmode=require/.test(url) || process.env.DATABASE_SSL === "true";
  return new Pool({
    connectionString: url,
    max: 10,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

export function getDb() {
  if (!globalForDb.db) {
    globalForDb.pgPool = createPool();
    globalForDb.db = drizzle(globalForDb.pgPool, { schema });
  }
  return globalForDb.db;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export * from "./schema";

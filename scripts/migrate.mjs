// Runs pending Drizzle migrations before the server starts.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL ist nicht gesetzt – Migration übersprungen.");
  process.exit(1);
}

const ssl =
  /sslmode=require/.test(url) || process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined;

const pool = new pg.Pool({ connectionString: url, ssl, max: 1 });

for (let attempt = 1; ; attempt++) {
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.log("[migrate] Datenbank ist aktuell.");
    break;
  } catch (err) {
    if (attempt >= 10) {
      console.error("[migrate] fehlgeschlagen:", err);
      await pool.end();
      process.exit(1);
    }
    console.warn(`[migrate] Versuch ${attempt} fehlgeschlagen, neuer Versuch in 3s…`, err.message);
    await new Promise((r) => setTimeout(r, 3000));
  }
}
await pool.end();

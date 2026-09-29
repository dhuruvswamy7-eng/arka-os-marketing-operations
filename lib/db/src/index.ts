import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const rawUrl = process.env.DATABASE_URL;
// Remove sslmode query param so it doesn't conflict with our explicit ssl config
const cleanUrl = rawUrl.replace(/(\?|&)sslmode=[^&]+/g, "");

export const pool = new Pool({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err: any) => {
  console.warn("Recovered from idle PostgreSQL connection reset:", err.message || err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";

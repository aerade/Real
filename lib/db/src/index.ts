import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

/**
 * Keep the history table available before the API starts serving requests.
 *
 * The production API can run against an external PostgreSQL database where
 * Replit's publish-time schema sync is not available. This statement is
 * intentionally narrow and idempotent: it only creates the table introduced
 * for lead search history and never changes existing lead or user data.
 */
export async function ensureLeadSearchHistoryTable(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('real:lead_search_history'))`);
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS "lead_search_history" (
        "user_id" integer NOT NULL,
        "lead_id" integer NOT NULL,
        "first_seen_at" timestamptz NOT NULL DEFAULT now(),
        "last_seen_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "lead_search_history_user_id_lead_id_pk"
          PRIMARY KEY ("user_id", "lead_id"),
        CONSTRAINT "lead_search_history_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "lead_search_history_lead_id_leads_id_fk"
          FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE
      )
    `);
  });
}

export * from "./schema";

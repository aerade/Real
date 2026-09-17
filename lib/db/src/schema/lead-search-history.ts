import { integer, pgTable, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { leadsTable } from "./leads";
import { usersTable } from "./users";

export const leadSearchHistoryTable = pgTable("lead_search_history", {
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").notNull().references(() => leadsTable.id, { onDelete: "cascade" }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.leadId] }),
]);

export type LeadSearchHistoryRow = typeof leadSearchHistoryTable.$inferSelect;
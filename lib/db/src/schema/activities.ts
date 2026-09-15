import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({
  id: true,
});

export type InsertActivity = typeof activitiesTable.$inferInsert;
export type ActivityRow = typeof activitiesTable.$inferSelect;
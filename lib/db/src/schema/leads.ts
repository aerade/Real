import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgEnum, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "claimed",
  "contacted",
  "replied",
  "rejected",
  "no_reply",
  "deal",
]);

export type StoredContact = {
  type: string;
  value: string;
  url: string;
};

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  sourceId: text("source_id").notNull().unique(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  industry: text("industry").notNull(),
  website: text("website"),
  status: leadStatusEnum("status").notNull().default("new"),
  score: integer("score").notNull(),
  scoreReasons: text("score_reasons").array().notNull(),
  issues: text("issues").array().notNull(),
  reviewsCount: integer("reviews_count").notNull().default(0),
  rating: real("rating"),
  branchesCount: integer("branches_count").notNull().default(1),
  contacts: jsonb("contacts").$type<StoredContact[]>().notNull(),
  source: text("source").notNull(),
  websiteAudit: jsonb("website_audit").$type<Record<string, unknown> | null>(),
  scoreBreakdown: jsonb("score_breakdown").$type<Array<Record<string, unknown>>>().notNull().default([]),
  scoreVersion: text("score_version").notNull().default("legacy-v1"),
  auditCheckedAt: timestamp("audit_checked_at", { withTimezone: true }),
  assigneeId: integer("assignee_id").references(() => usersTable.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = typeof leadsTable.$inferInsert;
export type LeadRow = typeof leadsTable.$inferSelect;
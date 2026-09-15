import { createInsertSchema } from "drizzle-zod";
import { boolean, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["owner", "manager"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  login: text("login").notNull().unique(),
  role: userRoleEnum("role").notNull().default("manager"),
  active: boolean("active").notNull().default(true),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = typeof usersTable.$inferInsert;
export type UserRow = typeof usersTable.$inferSelect;
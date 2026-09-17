import { createInsertSchema } from "drizzle-zod";
import { boolean, pgTable, text } from "drizzle-orm/pg-core";

export const countriesTable = pgTable("countries", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

export const insertCountrySchema = createInsertSchema(countriesTable);

export type InsertCountry = typeof countriesTable.$inferInsert;
export type CountryRow = typeof countriesTable.$inferSelect;
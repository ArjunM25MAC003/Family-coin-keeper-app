import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { familiesTable } from "./families";
import { membersTable } from "./members";
import { choresTable } from "./chores";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => familiesTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  type: text("type").notNull(), // earned | spent | allowance | bonus | deducted
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  choreId: integer("chore_id").references(() => choresTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;

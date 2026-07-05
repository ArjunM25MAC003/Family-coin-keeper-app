import { pgTable, serial, integer, text, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { familiesTable } from "./families";
import { membersTable } from "./members";

export const allowancesTable = pgTable("allowances", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => familiesTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  coinAmount: integer("coin_amount").notNull(),
  frequency: text("frequency").notNull(), // daily | weekly | monthly
  isActive: boolean("is_active").notNull().default(true),
  nextPayDate: date("next_pay_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAllowanceSchema = createInsertSchema(allowancesTable).omit({ id: true, createdAt: true });
export type InsertAllowance = z.infer<typeof insertAllowanceSchema>;
export type Allowance = typeof allowancesTable.$inferSelect;

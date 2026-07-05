import { pgTable, serial, integer, text, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { familiesTable } from "./families";
import { membersTable } from "./members";

export const savingsGoalsTable = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => familiesTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  name: text("name").notNull(),
  description: text("description"),
  targetCoins: integer("target_coins").notNull(),
  currentCoins: integer("current_coins").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  targetDate: date("target_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSavingsGoalSchema = createInsertSchema(savingsGoalsTable).omit({ id: true, createdAt: true });
export type InsertSavingsGoal = z.infer<typeof insertSavingsGoalSchema>;
export type SavingsGoal = typeof savingsGoalsTable.$inferSelect;

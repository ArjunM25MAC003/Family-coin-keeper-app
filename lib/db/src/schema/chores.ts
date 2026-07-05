import { pgTable, serial, text, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { familiesTable } from "./families";
import { membersTable } from "./members";

export const choresTable = pgTable("chores", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => familiesTable.id),
  title: text("title").notNull(),
  description: text("description"),
  coinReward: integer("coin_reward").notNull().default(10),
  status: text("status").notNull().default("pending"), // pending | completed | approved | rejected
  assigneeId: integer("assignee_id").references(() => membersTable.id),
  dueDate: date("due_date", { mode: "string" }),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringFrequency: text("recurring_frequency"), // daily | weekly | monthly
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChoreSchema = createInsertSchema(choresTable).omit({ id: true, createdAt: true });
export type InsertChore = z.infer<typeof insertChoreSchema>;
export type Chore = typeof choresTable.$inferSelect;

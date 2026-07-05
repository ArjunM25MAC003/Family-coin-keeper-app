import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { familiesTable } from "./families";
import { membersTable } from "./members";

export const activityEventsTable = pgTable("activity_events", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => familiesTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  type: text("type").notNull(), // chore_completed | chore_approved | coins_awarded | expense_added | receipt_scanned | goal_reached | allowance_paid
  description: text("description").notNull(),
  coinsAmount: integer("coins_amount"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivityEventSchema = createInsertSchema(activityEventsTable).omit({ id: true });
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;
export type ActivityEvent = typeof activityEventsTable.$inferSelect;

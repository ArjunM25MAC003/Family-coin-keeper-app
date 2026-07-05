import { pgTable, serial, integer, text, numeric, date, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { familiesTable } from "./families";
import { membersTable } from "./members";

export const receiptsTable = pgTable("receipts", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => familiesTable.id),
  memberId: integer("member_id").notNull().references(() => membersTable.id),
  merchantName: text("merchant_name").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  date: date("date", { mode: "string" }).notNull(),
  imageUrl: text("image_url"),
  rawText: text("raw_text"),
  lineItems: jsonb("line_items").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReceiptSchema = createInsertSchema(receiptsTable).omit({ id: true, createdAt: true });
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receiptsTable.$inferSelect;

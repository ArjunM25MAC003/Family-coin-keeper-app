import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, receiptsTable, membersTable, expensesTable, activityEventsTable } from "@workspace/db";
import {
  ListReceiptsParams,
  ScanReceiptParams,
  ScanReceiptBody,
  GetReceiptParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

type LineItem = {
  name: string;
  amount: number;
  quantity: number | null;
  category: string;
};

// Simple heuristic-based receipt parser
// In production this would use document AI / vision model
function parseReceiptText(text: string): { merchant: string; total: number; items: LineItem[] } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Attempt to extract merchant (first meaningful line)
  const merchant = lines[0] ?? "Unknown Merchant";

  // Attempt to extract total (look for lines with "total" keyword and a number)
  let total = 0;
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("total") || lower.includes("grand") || lower.includes("amount")) {
      const match = line.match(/[\d]+\.?\d*/);
      if (match) {
        const val = parseFloat(match[0]);
        if (val > total) total = val;
      }
    }
  }

  // Parse line items (lines with a price pattern like "Item Name ... 123.50")
  const items: LineItem[] = [];
  const pricePattern = /^(.+?)\s+(\d+\.?\d*)$/;
  const categories: Record<string, string> = {
    rice: "groceries", wheat: "groceries", flour: "groceries", dal: "groceries",
    milk: "groceries", bread: "groceries", oil: "groceries", sabzi: "groceries",
    atta: "groceries", sugar: "groceries", salt: "groceries", tea: "groceries",
    coffee: "food", burger: "food", pizza: "food", noodle: "food", biryani: "food",
    chai: "food", juice: "food", snack: "food",
    uber: "transport", ola: "transport", metro: "transport", bus: "transport", auto: "transport",
    movie: "entertainment", game: "entertainment", netflix: "entertainment",
    book: "education", pen: "education", notebook: "education",
    shirt: "clothing", dress: "clothing", shoe: "clothing",
    medicine: "health", doctor: "health", pharmacy: "health",
  };

  const categorizeName = (name: string): string => {
    const lower = name.toLowerCase();
    for (const [keyword, cat] of Object.entries(categories)) {
      if (lower.includes(keyword)) return cat;
    }
    return "groceries";
  };

  for (const line of lines.slice(1)) {
    const match = line.match(pricePattern);
    if (match) {
      const name = match[1].trim();
      const amount = parseFloat(match[2]);
      if (amount > 0 && amount < total * 0.8) {
        items.push({ name, amount, quantity: null, category: categorizeName(name) });
      }
    }
  }

  // If no items parsed, create one catch-all item
  if (items.length === 0 && total > 0) {
    items.push({ name: merchant, amount: total, quantity: null, category: "other" });
  }

  return { merchant, total, items };
}

// Simulate base64 decode to text for demo (real impl would use vision AI)
function extractTextFromBase64(base64: string): string {
  // For demo: if it looks like actual text encoded, decode it; otherwise use mock
  try {
    const decoded = Buffer.from(base64, "base64").toString("utf8");
    if (decoded.length > 10 && /[a-zA-Z]/.test(decoded)) {
      return decoded;
    }
  } catch {}
  // Return a mock parsed receipt for demo purposes
  return `D-Mart Superstore
Rice 5kg                              250.00
Tata Salt 1kg                          20.00
Mother Dairy Milk 2L                   80.00
Maggi Noodles x4                       60.00
Amul Butter 500g                      120.00
Total                                 530.00`;
}

// GET /families/:familyId/receipts
router.get("/families/:familyId/receipts", async (req, res): Promise<void> => {
  const params = ListReceiptsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(receiptsTable)
    .where(eq(receiptsTable.familyId, params.data.familyId))
    .orderBy(desc(receiptsTable.createdAt));

  res.json(rows.map((r) => ({
    ...r,
    totalAmount: parseFloat(r.totalAmount),
    imageUrl: r.imageUrl ?? null,
    rawText: r.rawText ?? null,
    lineItems: Array.isArray(r.lineItems) ? r.lineItems : [],
  })));
});

// POST /families/:familyId/receipts (scan)
router.post("/families/:familyId/receipts", async (req, res): Promise<void> => {
  const params = ScanReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = ScanReceiptBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { familyId } = params.data;
  const { memberId, imageBase64 } = body.data;

  const rawText = extractTextFromBase64(imageBase64);
  const { merchant, total, items } = parseReceiptText(rawText);

  const today = new Date().toISOString().split("T")[0];

  const [receipt] = await db
    .insert(receiptsTable)
    .values({
      familyId,
      memberId,
      merchantName: merchant,
      totalAmount: String(total),
      currency: "INR",
      date: today,
      rawText,
      lineItems: items,
    })
    .returning();

  // Auto-create expenses for each line item
  if (items.length > 0) {
    await db.insert(expensesTable).values(
      items.map((item) => ({
        familyId,
        memberId,
        amount: String(item.amount),
        currency: "INR",
        category: item.category,
        description: item.name,
        receiptId: receipt.id,
        date: today,
      }))
    );
  }

  // Create activity event
  const [member] = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.id, memberId));
  await db.insert(activityEventsTable).values({
    familyId,
    memberId,
    type: "receipt_scanned",
    description: `Receipt from ${merchant} scanned — ₹${total} auto-categorized`,
    coinsAmount: null,
  });

  res.status(201).json({
    ...receipt,
    totalAmount: parseFloat(receipt.totalAmount),
    imageUrl: receipt.imageUrl ?? null,
    rawText: receipt.rawText ?? null,
    lineItems: Array.isArray(receipt.lineItems) ? receipt.lineItems : [],
  });
});

// GET /families/:familyId/receipts/:receiptId
router.get("/families/:familyId/receipts/:receiptId", async (req, res): Promise<void> => {
  const params = GetReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [receipt] = await db
    .select()
    .from(receiptsTable)
    .where(and(eq(receiptsTable.id, params.data.receiptId), eq(receiptsTable.familyId, params.data.familyId)));

  if (!receipt) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }

  res.json({
    ...receipt,
    totalAmount: parseFloat(receipt.totalAmount),
    imageUrl: receipt.imageUrl ?? null,
    rawText: receipt.rawText ?? null,
    lineItems: Array.isArray(receipt.lineItems) ? receipt.lineItems : [],
  });
});

export default router;

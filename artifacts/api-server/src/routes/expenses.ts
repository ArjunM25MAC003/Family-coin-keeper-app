import { Router, type IRouter } from "express";
import { eq, and, gte, desc } from "drizzle-orm";
import { db, expensesTable, membersTable, activityEventsTable } from "@workspace/db";
import {
  ListExpensesParams,
  CreateExpenseParams,
  CreateExpenseBody,
  GetExpenseSummaryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /families/:familyId/expenses
router.get("/families/:familyId/expenses", async (req, res): Promise<void> => {
  const params = ListExpensesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: expensesTable.id,
      familyId: expensesTable.familyId,
      memberId: expensesTable.memberId,
      memberName: membersTable.name,
      amount: expensesTable.amount,
      currency: expensesTable.currency,
      category: expensesTable.category,
      description: expensesTable.description,
      receiptId: expensesTable.receiptId,
      date: expensesTable.date,
      createdAt: expensesTable.createdAt,
    })
    .from(expensesTable)
    .leftJoin(membersTable, eq(expensesTable.memberId, membersTable.id))
    .where(eq(expensesTable.familyId, params.data.familyId))
    .orderBy(desc(expensesTable.date));

  res.json(rows.map((r) => ({
    ...r,
    amount: parseFloat(r.amount),
    memberName: r.memberName ?? "Unknown",
    receiptId: r.receiptId ?? null,
  })));
});

// POST /families/:familyId/expenses
router.post("/families/:familyId/expenses", async (req, res): Promise<void> => {
  const params = CreateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateExpenseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { familyId } = params.data;

  const [member] = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.id, body.data.memberId));

  const [expense] = await db
    .insert(expensesTable)
    .values({
      ...body.data,
      familyId,
      amount: String(body.data.amount),
      date: String(body.data.date),
    })
    .returning();

  await db.insert(activityEventsTable).values({
    familyId,
    memberId: body.data.memberId,
    type: "expense_added",
    description: `₹${body.data.amount} spent on ${body.data.description} (${body.data.category})`,
    coinsAmount: null,
  });

  res.status(201).json({
    ...expense,
    amount: parseFloat(expense.amount),
    memberName: member?.name ?? "Unknown",
    receiptId: expense.receiptId ?? null,
  });
});

// GET /families/:familyId/expenses/summary
router.get("/families/:familyId/expenses/summary", async (req, res): Promise<void> => {
  const params = GetExpenseSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { familyId } = params.data;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const rows = await db
    .select({
      id: expensesTable.id,
      memberId: expensesTable.memberId,
      memberName: membersTable.name,
      amount: expensesTable.amount,
      category: expensesTable.category,
    })
    .from(expensesTable)
    .leftJoin(membersTable, eq(expensesTable.memberId, membersTable.id))
    .where(and(eq(expensesTable.familyId, familyId), gte(expensesTable.date, monthStart)));

  const totalSpent = rows.reduce((s, r) => s + parseFloat(r.amount), 0);

  // By category
  const catMap: Record<string, { amount: number; count: number }> = {};
  for (const r of rows) {
    if (!catMap[r.category]) catMap[r.category] = { amount: 0, count: 0 };
    catMap[r.category].amount += parseFloat(r.amount);
    catMap[r.category].count += 1;
  }
  const byCategory = Object.entries(catMap).map(([category, data]) => ({
    category,
    amount: data.amount,
    percentage: totalSpent > 0 ? Math.round((data.amount / totalSpent) * 100) : 0,
    count: data.count,
  }));

  // By member
  const memberMap: Record<string, { name: string; amount: number }> = {};
  for (const r of rows) {
    if (!memberMap[r.memberId]) memberMap[r.memberId] = { name: r.memberName ?? "Unknown", amount: 0 };
    memberMap[r.memberId].amount += parseFloat(r.amount);
  }
  const byMember = Object.entries(memberMap).map(([memberId, data]) => ({
    memberId: parseInt(memberId, 10),
    name: data.name,
    amount: data.amount,
  }));

  res.json({
    familyId,
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    totalSpent,
    byCategory,
    byMember,
  });
});

export default router;

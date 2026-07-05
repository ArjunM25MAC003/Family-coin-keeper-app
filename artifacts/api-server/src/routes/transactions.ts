import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, transactionsTable, membersTable, activityEventsTable } from "@workspace/db";
import {
  ListTransactionsParams,
  CreateTransactionParams,
  CreateTransactionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /families/:familyId/transactions
router.get("/families/:familyId/transactions", async (req, res): Promise<void> => {
  const params = ListTransactionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: transactionsTable.id,
      familyId: transactionsTable.familyId,
      memberId: transactionsTable.memberId,
      memberName: membersTable.name,
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      description: transactionsTable.description,
      choreId: transactionsTable.choreId,
      createdAt: transactionsTable.createdAt,
    })
    .from(transactionsTable)
    .leftJoin(membersTable, eq(transactionsTable.memberId, membersTable.id))
    .where(eq(transactionsTable.familyId, params.data.familyId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(50);

  res.json(rows.map((r) => ({
    ...r,
    memberName: r.memberName ?? "Unknown",
    choreId: r.choreId ?? null,
  })));
});

// POST /families/:familyId/transactions
router.post("/families/:familyId/transactions", async (req, res): Promise<void> => {
  const params = CreateTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateTransactionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { familyId } = params.data;
  const { memberId, type, amount, description, choreId } = body.data;

  // Adjust coin balance
  const delta = (type === "earned" || type === "allowance" || type === "bonus") ? amount : -amount;

  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, memberId));

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const [tx] = await db
    .insert(transactionsTable)
    .values({ familyId, memberId, type, amount, description, choreId })
    .returning();

  await Promise.all([
    db.update(membersTable).set({ coinBalance: member.coinBalance + delta }).where(eq(membersTable.id, memberId)),
    db.insert(activityEventsTable).values({
      familyId,
      memberId,
      type: "coins_awarded",
      description: `${delta > 0 ? "+" : ""}${delta} coins: ${description}`,
      coinsAmount: delta,
    }),
  ]);

  res.status(201).json({
    ...tx,
    memberName: member.name,
    choreId: tx.choreId ?? null,
  });
});

export default router;

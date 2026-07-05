import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, allowancesTable, membersTable, transactionsTable, activityEventsTable } from "@workspace/db";
import {
  ListAllowancesParams,
  CreateAllowanceParams,
  CreateAllowanceBody,
  UpdateAllowanceParams,
  UpdateAllowanceBody,
  DeleteAllowanceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const nextPayDate = (frequency: string): string => {
  const d = new Date();
  if (frequency === "daily") d.setDate(d.getDate() + 1);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
};

const toResponse = (a: typeof allowancesTable.$inferSelect, memberName: string) => ({
  ...a,
  memberName,
  nextPayDate: a.nextPayDate ?? null,
});

// GET /families/:familyId/allowances
router.get("/families/:familyId/allowances", async (req, res): Promise<void> => {
  const params = ListAllowancesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: allowancesTable.id,
      familyId: allowancesTable.familyId,
      memberId: allowancesTable.memberId,
      memberName: membersTable.name,
      coinAmount: allowancesTable.coinAmount,
      frequency: allowancesTable.frequency,
      isActive: allowancesTable.isActive,
      nextPayDate: allowancesTable.nextPayDate,
      createdAt: allowancesTable.createdAt,
    })
    .from(allowancesTable)
    .leftJoin(membersTable, eq(allowancesTable.memberId, membersTable.id))
    .where(eq(allowancesTable.familyId, params.data.familyId));

  res.json(rows.map((r) => ({ ...r, memberName: r.memberName ?? "Unknown", nextPayDate: r.nextPayDate ?? null })));
});

// POST /families/:familyId/allowances
router.post("/families/:familyId/allowances", async (req, res): Promise<void> => {
  const params = CreateAllowanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateAllowanceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [member] = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.id, body.data.memberId));
  const [allowance] = await db
    .insert(allowancesTable)
    .values({ ...body.data, familyId: params.data.familyId, nextPayDate: nextPayDate(body.data.frequency) })
    .returning();

  res.status(201).json(toResponse(allowance, member?.name ?? "Unknown"));
});

// PATCH /families/:familyId/allowances/:allowanceId
router.patch("/families/:familyId/allowances/:allowanceId", async (req, res): Promise<void> => {
  const params = UpdateAllowanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateAllowanceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [allowance] = await db
    .update(allowancesTable)
    .set(body.data)
    .where(and(eq(allowancesTable.id, params.data.allowanceId), eq(allowancesTable.familyId, params.data.familyId)))
    .returning();

  if (!allowance) {
    res.status(404).json({ error: "Allowance not found" });
    return;
  }

  const [member] = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.id, allowance.memberId));
  res.json(toResponse(allowance, member?.name ?? "Unknown"));
});

// DELETE /families/:familyId/allowances/:allowanceId
router.delete("/families/:familyId/allowances/:allowanceId", async (req, res): Promise<void> => {
  const params = DeleteAllowanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(allowancesTable)
    .where(and(eq(allowancesTable.id, params.data.allowanceId), eq(allowancesTable.familyId, params.data.familyId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Allowance not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

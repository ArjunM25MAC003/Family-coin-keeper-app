import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, savingsGoalsTable, membersTable, activityEventsTable } from "@workspace/db";
import {
  ListSavingsGoalsParams,
  CreateSavingsGoalParams,
  CreateSavingsGoalBody,
  UpdateSavingsGoalParams,
  UpdateSavingsGoalBody,
  DeleteSavingsGoalParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const toGoalResponse = (g: typeof savingsGoalsTable.$inferSelect, memberName: string) => ({
  ...g,
  memberName,
  description: g.description ?? null,
  targetDate: g.targetDate ?? null,
});

// GET /families/:familyId/savings
router.get("/families/:familyId/savings", async (req, res): Promise<void> => {
  const params = ListSavingsGoalsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: savingsGoalsTable.id,
      familyId: savingsGoalsTable.familyId,
      memberId: savingsGoalsTable.memberId,
      memberName: membersTable.name,
      name: savingsGoalsTable.name,
      description: savingsGoalsTable.description,
      targetCoins: savingsGoalsTable.targetCoins,
      currentCoins: savingsGoalsTable.currentCoins,
      isCompleted: savingsGoalsTable.isCompleted,
      targetDate: savingsGoalsTable.targetDate,
      createdAt: savingsGoalsTable.createdAt,
    })
    .from(savingsGoalsTable)
    .leftJoin(membersTable, eq(savingsGoalsTable.memberId, membersTable.id))
    .where(eq(savingsGoalsTable.familyId, params.data.familyId));

  res.json(rows.map((r) => ({ ...r, memberName: r.memberName ?? "Unknown", description: r.description ?? null, targetDate: r.targetDate ?? null })));
});

// POST /families/:familyId/savings
router.post("/families/:familyId/savings", async (req, res): Promise<void> => {
  const params = CreateSavingsGoalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateSavingsGoalBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [member] = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.id, body.data.memberId));
  const [goal] = await db.insert(savingsGoalsTable).values({
    ...body.data,
    familyId: params.data.familyId,
    targetDate: body.data.targetDate ? String(body.data.targetDate) : undefined,
  }).returning();

  res.status(201).json(toGoalResponse(goal, member?.name ?? "Unknown"));
});

// PATCH /families/:familyId/savings/:goalId
router.patch("/families/:familyId/savings/:goalId", async (req, res): Promise<void> => {
  const params = UpdateSavingsGoalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateSavingsGoalBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...body.data };
  // Check if goal is reached
  if (body.data.currentCoins !== undefined) {
    const [existing] = await db.select().from(savingsGoalsTable).where(eq(savingsGoalsTable.id, params.data.goalId));
    if (existing && body.data.currentCoins >= existing.targetCoins) {
      updateData.isCompleted = true;
    }
  }

  const [goal] = await db
    .update(savingsGoalsTable)
    .set(updateData)
    .where(and(eq(savingsGoalsTable.id, params.data.goalId), eq(savingsGoalsTable.familyId, params.data.familyId)))
    .returning();

  if (!goal) {
    res.status(404).json({ error: "Savings goal not found" });
    return;
  }

  if (goal.isCompleted) {
    await db.insert(activityEventsTable).values({
      familyId: params.data.familyId,
      memberId: goal.memberId,
      type: "goal_reached",
      description: `Savings goal "${goal.name}" completed!`,
      coinsAmount: goal.currentCoins,
    });
  }

  const [member] = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.id, goal.memberId));
  res.json(toGoalResponse(goal, member?.name ?? "Unknown"));
});

// DELETE /families/:familyId/savings/:goalId
router.delete("/families/:familyId/savings/:goalId", async (req, res): Promise<void> => {
  const params = DeleteSavingsGoalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(savingsGoalsTable)
    .where(and(eq(savingsGoalsTable.id, params.data.goalId), eq(savingsGoalsTable.familyId, params.data.familyId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Savings goal not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

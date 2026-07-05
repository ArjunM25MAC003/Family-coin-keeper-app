import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import {
  db,
  choresTable,
  membersTable,
  transactionsTable,
  activityEventsTable,
} from "@workspace/db";
import {
  ListChoresParams,
  CreateChoreParams,
  CreateChoreBody,
  GetChoreParams,
  UpdateChoreParams,
  UpdateChoreBody,
  DeleteChoreParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /families/:familyId/chores
router.get("/families/:familyId/chores", async (req, res): Promise<void> => {
  const params = ListChoresParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const chores = await db
    .select({
      id: choresTable.id,
      familyId: choresTable.familyId,
      title: choresTable.title,
      description: choresTable.description,
      coinReward: choresTable.coinReward,
      status: choresTable.status,
      assigneeId: choresTable.assigneeId,
      assigneeName: membersTable.name,
      dueDate: choresTable.dueDate,
      isRecurring: choresTable.isRecurring,
      recurringFrequency: choresTable.recurringFrequency,
      completedAt: choresTable.completedAt,
      createdAt: choresTable.createdAt,
    })
    .from(choresTable)
    .leftJoin(membersTable, eq(choresTable.assigneeId, membersTable.id))
    .where(eq(choresTable.familyId, params.data.familyId))
    .orderBy(choresTable.createdAt);

  res.json(chores.map((c) => ({
    ...c,
    description: c.description ?? null,
    assigneeId: c.assigneeId ?? null,
    assigneeName: c.assigneeName ?? null,
    dueDate: c.dueDate ?? null,
    recurringFrequency: c.recurringFrequency ?? null,
    completedAt: c.completedAt ? c.completedAt.toISOString() : null,
  })));
});

// POST /families/:familyId/chores
router.post("/families/:familyId/chores", async (req, res): Promise<void> => {
  const params = CreateChoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateChoreBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [chore] = await db
    .insert(choresTable)
    .values({
      ...body.data,
      familyId: params.data.familyId,
      dueDate: body.data.dueDate ? String(body.data.dueDate) : undefined,
    })
    .returning();

  res.status(201).json({
    ...chore,
    description: chore.description ?? null,
    assigneeId: chore.assigneeId ?? null,
    assigneeName: null,
    dueDate: chore.dueDate ?? null,
    recurringFrequency: chore.recurringFrequency ?? null,
    completedAt: chore.completedAt ? chore.completedAt.toISOString() : null,
  });
});

// GET /families/:familyId/chores/:choreId
router.get("/families/:familyId/chores/:choreId", async (req, res): Promise<void> => {
  const params = GetChoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [chore] = await db
    .select({
      id: choresTable.id,
      familyId: choresTable.familyId,
      title: choresTable.title,
      description: choresTable.description,
      coinReward: choresTable.coinReward,
      status: choresTable.status,
      assigneeId: choresTable.assigneeId,
      assigneeName: membersTable.name,
      dueDate: choresTable.dueDate,
      isRecurring: choresTable.isRecurring,
      recurringFrequency: choresTable.recurringFrequency,
      completedAt: choresTable.completedAt,
      createdAt: choresTable.createdAt,
    })
    .from(choresTable)
    .leftJoin(membersTable, eq(choresTable.assigneeId, membersTable.id))
    .where(and(eq(choresTable.id, params.data.choreId), eq(choresTable.familyId, params.data.familyId)));

  if (!chore) {
    res.status(404).json({ error: "Chore not found" });
    return;
  }

  res.json({
    ...chore,
    description: chore.description ?? null,
    assigneeId: chore.assigneeId ?? null,
    assigneeName: chore.assigneeName ?? null,
    dueDate: chore.dueDate ?? null,
    recurringFrequency: chore.recurringFrequency ?? null,
    completedAt: chore.completedAt ? chore.completedAt.toISOString() : null,
  });
});

// PATCH /families/:familyId/chores/:choreId
router.patch("/families/:familyId/chores/:choreId", async (req, res): Promise<void> => {
  const params = UpdateChoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateChoreBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...body.data };

  // When a chore is completed, record the timestamp
  if (body.data.status === "completed") {
    updateData.completedAt = new Date();
  }

  const [updatedChore] = await db
    .update(choresTable)
    .set(updateData)
    .where(and(eq(choresTable.id, params.data.choreId), eq(choresTable.familyId, params.data.familyId)))
    .returning();

  if (!updatedChore) {
    res.status(404).json({ error: "Chore not found" });
    return;
  }

  // If approved: award coins to assignee and create activity event + transaction
  if (body.data.status === "approved" && updatedChore.assigneeId) {
    const memberId = updatedChore.assigneeId;
    const coins = updatedChore.coinReward;

    await Promise.all([
      db
        .update(membersTable)
        .set({ coinBalance: sql`${membersTable.coinBalance} + ${coins}`, streak: sql`${membersTable.streak} + 1` })
        .where(eq(membersTable.id, memberId)),
      db.insert(transactionsTable).values({
        familyId: params.data.familyId,
        memberId,
        type: "earned",
        amount: coins,
        description: `Chore completed: ${updatedChore.title}`,
        choreId: updatedChore.id,
      }),
      db.insert(activityEventsTable).values({
        familyId: params.data.familyId,
        memberId,
        type: "chore_approved",
        description: `${updatedChore.title} approved — ${coins} coins awarded`,
        coinsAmount: coins,
      }),
    ]);
  }

  // Activity event for completion request
  if (body.data.status === "completed" && updatedChore.assigneeId) {
    await db.insert(activityEventsTable).values({
      familyId: params.data.familyId,
      memberId: updatedChore.assigneeId,
      type: "chore_completed",
      description: `${updatedChore.title} marked as done — awaiting approval`,
      coinsAmount: null,
    });
  }

  // Resolve assignee name
  let assigneeName: string | null = null;
  if (updatedChore.assigneeId) {
    const [assignee] = await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.id, updatedChore.assigneeId));
    assigneeName = assignee?.name ?? null;
  }

  res.json({
    ...updatedChore,
    description: updatedChore.description ?? null,
    assigneeId: updatedChore.assigneeId ?? null,
    assigneeName,
    dueDate: updatedChore.dueDate ?? null,
    recurringFrequency: updatedChore.recurringFrequency ?? null,
    completedAt: updatedChore.completedAt ? updatedChore.completedAt.toISOString() : null,
  });
});

// DELETE /families/:familyId/chores/:choreId
router.delete("/families/:familyId/chores/:choreId", async (req, res): Promise<void> => {
  const params = DeleteChoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(choresTable)
    .where(and(eq(choresTable.id, params.data.choreId), eq(choresTable.familyId, params.data.familyId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Chore not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

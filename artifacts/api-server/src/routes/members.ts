import { Router, type IRouter } from "express";
import { eq, and, desc, gte } from "drizzle-orm";
import {
  db,
  membersTable,
  transactionsTable,
  savingsGoalsTable,
} from "@workspace/db";
import {
  ListMembersParams,
  CreateMemberParams,
  CreateMemberBody,
  GetMemberParams,
  UpdateMemberParams,
  UpdateMemberBody,
  GetMemberWalletParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /families/:familyId/members
router.get("/families/:familyId/members", async (req, res): Promise<void> => {
  const params = ListMembersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const members = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.familyId, params.data.familyId));
  res.json(members.map((m) => ({ ...m, avatarUrl: m.avatarUrl ?? null, upiId: m.upiId ?? null, age: m.age ?? null })));
});

// POST /families/:familyId/members
router.post("/families/:familyId/members", async (req, res): Promise<void> => {
  const params = CreateMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateMemberBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [member] = await db
    .insert(membersTable)
    .values({ ...body.data, familyId: params.data.familyId })
    .returning();
  res.status(201).json({ ...member, avatarUrl: member.avatarUrl ?? null, upiId: member.upiId ?? null, age: member.age ?? null });
});

// GET /families/:familyId/members/:memberId
router.get("/families/:familyId/members/:memberId", async (req, res): Promise<void> => {
  const params = GetMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [member] = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.id, params.data.memberId), eq(membersTable.familyId, params.data.familyId)));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json({ ...member, avatarUrl: member.avatarUrl ?? null, upiId: member.upiId ?? null, age: member.age ?? null });
});

// PATCH /families/:familyId/members/:memberId
router.patch("/families/:familyId/members/:memberId", async (req, res): Promise<void> => {
  const params = UpdateMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateMemberBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [member] = await db
    .update(membersTable)
    .set(body.data)
    .where(and(eq(membersTable.id, params.data.memberId), eq(membersTable.familyId, params.data.familyId)))
    .returning();
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json({ ...member, avatarUrl: member.avatarUrl ?? null, upiId: member.upiId ?? null, age: member.age ?? null });
});

// GET /families/:familyId/members/:memberId/wallet
router.get("/families/:familyId/members/:memberId/wallet", async (req, res): Promise<void> => {
  const params = GetMemberWalletParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { familyId, memberId } = params.data;

  const [member] = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.familyId, familyId)));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recentTransactions, weeklyTransactions, savingsGoals] = await Promise.all([
    db
      .select()
      .from(transactionsTable)
      .where(and(eq(transactionsTable.memberId, memberId), eq(transactionsTable.familyId, familyId)))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(10),
    db
      .select()
      .from(transactionsTable)
      .where(and(eq(transactionsTable.memberId, memberId), eq(transactionsTable.familyId, familyId), gte(transactionsTable.createdAt, weekAgo))),
    db
      .select()
      .from(savingsGoalsTable)
      .where(and(eq(savingsGoalsTable.memberId, memberId), eq(savingsGoalsTable.familyId, familyId))),
  ]);

  const coinsEarnedThisWeek = weeklyTransactions
    .filter((t) => t.type === "earned" || t.type === "allowance" || t.type === "bonus")
    .reduce((s, t) => s + t.amount, 0);

  res.json({
    memberId: member.id,
    name: member.name,
    avatarUrl: member.avatarUrl ?? null,
    coinBalance: member.coinBalance,
    streak: member.streak,
    level: member.level,
    coinsEarnedThisWeek,
    recentTransactions: recentTransactions.map((t) => ({
      ...t,
      memberName: member.name,
      choreId: t.choreId ?? null,
    })),
    savingsGoals: savingsGoals.map((g) => ({
      ...g,
      memberName: member.name,
      description: g.description ?? null,
      targetDate: g.targetDate ?? null,
    })),
  });
});

export default router;

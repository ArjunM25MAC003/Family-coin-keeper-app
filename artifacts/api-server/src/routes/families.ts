import { Router, type IRouter } from "express";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import {
  db,
  familiesTable,
  membersTable,
  choresTable,
  expensesTable,
  transactionsTable,
  activityEventsTable,
} from "@workspace/db";
import {
  CreateFamilyBody,
  GetFamilyParams,
  GetFamilyDashboardParams,
  GetFamilyActivityParams,
  GetFamilyLeaderboardParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// POST /families
router.post("/families", async (req, res): Promise<void> => {
  const parsed = CreateFamilyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [family] = await db.insert(familiesTable).values(parsed.data).returning();
  res.status(201).json(family);
});

// GET /families/:familyId
router.get("/families/:familyId", async (req, res): Promise<void> => {
  const params = GetFamilyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [family] = await db.select().from(familiesTable).where(eq(familiesTable.id, params.data.familyId));
  if (!family) {
    res.status(404).json({ error: "Family not found" });
    return;
  }
  res.json(family);
});

// GET /families/:familyId/dashboard
router.get("/families/:familyId/dashboard", async (req, res): Promise<void> => {
  const params = GetFamilyDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { familyId } = params.data;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [members, chores, expenses, transactions] = await Promise.all([
    db.select().from(membersTable).where(eq(membersTable.familyId, familyId)),
    db.select().from(choresTable).where(eq(choresTable.familyId, familyId)),
    db.select().from(expensesTable).where(
      and(eq(expensesTable.familyId, familyId), gte(expensesTable.date, monthStart.toISOString().split("T")[0]))
    ),
    db.select().from(transactionsTable).where(
      and(eq(transactionsTable.familyId, familyId), gte(transactionsTable.createdAt, weekAgo))
    ),
  ]);

  const totalCoinsInCirculation = members.reduce((sum, m) => sum + m.coinBalance, 0);
  const pendingChoresCount = chores.filter((c) => c.status === "completed").length;
  const completedChoresThisWeek = chores.filter(
    (c) => c.status === "approved" && c.completedAt && new Date(c.completedAt) >= weekAgo
  ).length;
  const totalExpensesThisMonth = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // Per-member transactions this week for coin earned
  const weeklyByMember: Record<number, number> = {};
  for (const tx of transactions) {
    if (tx.type === "earned" || tx.type === "allowance" || tx.type === "bonus") {
      weeklyByMember[tx.memberId] = (weeklyByMember[tx.memberId] ?? 0) + tx.amount;
    }
  }

  const memberSummaries = members.map((m) => ({
    memberId: m.id,
    name: m.name,
    avatarUrl: m.avatarUrl ?? null,
    role: m.role,
    coinBalance: m.coinBalance,
    streak: m.streak,
    completedChores: chores.filter((c) => c.assigneeId === m.id && c.status === "approved").length,
  }));

  res.json({
    familyId,
    totalCoinsInCirculation,
    pendingChoresCount,
    completedChoresThisWeek,
    totalExpensesThisMonth,
    memberSummaries,
  });
});

// GET /families/:familyId/activity
router.get("/families/:familyId/activity", async (req, res): Promise<void> => {
  const params = GetFamilyActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { familyId } = params.data;

  const events = await db
    .select({
      id: activityEventsTable.id,
      type: activityEventsTable.type,
      description: activityEventsTable.description,
      coinsAmount: activityEventsTable.coinsAmount,
      occurredAt: activityEventsTable.occurredAt,
      memberName: membersTable.name,
      memberAvatarUrl: membersTable.avatarUrl,
    })
    .from(activityEventsTable)
    .leftJoin(membersTable, eq(activityEventsTable.memberId, membersTable.id))
    .where(eq(activityEventsTable.familyId, familyId))
    .orderBy(desc(activityEventsTable.occurredAt))
    .limit(20);

  res.json(events.map((e) => ({
    ...e,
    memberName: e.memberName ?? "Unknown",
    memberAvatarUrl: e.memberAvatarUrl ?? null,
    coinsAmount: e.coinsAmount ?? null,
  })));
});

// GET /families/:familyId/leaderboard
router.get("/families/:familyId/leaderboard", async (req, res): Promise<void> => {
  const params = GetFamilyLeaderboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { familyId } = params.data;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const members = await db.select().from(membersTable).where(eq(membersTable.familyId, familyId));
  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.familyId, familyId), gte(transactionsTable.createdAt, monthStart)));

  const earnedByMember: Record<number, number> = {};
  for (const tx of transactions) {
    if (tx.type === "earned" || tx.type === "allowance" || tx.type === "bonus") {
      earnedByMember[tx.memberId] = (earnedByMember[tx.memberId] ?? 0) + tx.amount;
    }
  }

  const leaderboard = members
    .map((m) => ({
      memberId: m.id,
      name: m.name,
      avatarUrl: m.avatarUrl ?? null,
      role: m.role,
      coinsEarnedThisMonth: earnedByMember[m.id] ?? 0,
      totalCoins: m.coinBalance,
      streak: m.streak,
      level: m.level,
    }))
    .sort((a, b) => b.coinsEarnedThisMonth - a.coinsEarnedThisMonth)
    .map((entry, idx) => ({ rank: idx + 1, ...entry }));

  res.json(leaderboard);
});

export default router;

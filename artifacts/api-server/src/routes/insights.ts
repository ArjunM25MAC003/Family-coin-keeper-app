import { Router, type IRouter } from "express";
import { eq, and, gte, desc } from "drizzle-orm";
import { db, expensesTable, transactionsTable, choresTable, membersTable, savingsGoalsTable } from "@workspace/db";
import { GetSpendingInsightsParams } from "@workspace/api-zod";

const router: IRouter = Router();

type Insight = {
  type: "overspend" | "saving_opportunity" | "positive_trend" | "chore_streak" | "goal_milestone";
  title: string;
  description: string;
  value: number | null;
  category: string | null;
};

// GET /families/:familyId/insights
router.get("/families/:familyId/insights", async (req, res): Promise<void> => {
  const params = GetSpendingInsightsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { familyId } = params.data;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [currentExpenses, prevExpenses, members, chores, goals, transactions] = await Promise.all([
    db.select().from(expensesTable).where(and(eq(expensesTable.familyId, familyId), gte(expensesTable.date, monthStart))),
    db.select().from(expensesTable).where(and(eq(expensesTable.familyId, familyId), gte(expensesTable.date, prevMonthStart))),
    db.select().from(membersTable).where(eq(membersTable.familyId, familyId)),
    db.select().from(choresTable).where(eq(choresTable.familyId, familyId)),
    db.select().from(savingsGoalsTable).where(eq(savingsGoalsTable.familyId, familyId)),
    db.select().from(transactionsTable).where(and(eq(transactionsTable.familyId, familyId), gte(transactionsTable.createdAt, weekAgo))),
  ]);

  const filteredPrev = prevExpenses.filter((e) => e.date >= prevMonthStart && e.date <= prevMonthEnd);

  const currentTotal = currentExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const prevTotal = filteredPrev.reduce((s, e) => s + parseFloat(e.amount), 0);

  // Build category maps
  const currentByCat: Record<string, number> = {};
  for (const e of currentExpenses) {
    currentByCat[e.category] = (currentByCat[e.category] ?? 0) + parseFloat(e.amount);
  }
  const prevByCat: Record<string, number> = {};
  for (const e of filteredPrev) {
    prevByCat[e.category] = (prevByCat[e.category] ?? 0) + parseFloat(e.amount);
  }

  const insights: Insight[] = [];
  const tips: string[] = [];

  // Overspend insights
  for (const [cat, amount] of Object.entries(currentByCat)) {
    const prev = prevByCat[cat] ?? 0;
    if (prev > 0 && amount > prev * 1.2) {
      insights.push({
        type: "overspend",
        title: `Higher ${cat} spending`,
        description: `Your ${cat} spend is ₹${Math.round(amount - prev)} more than last month (${Math.round(((amount - prev) / prev) * 100)}% up).`,
        value: amount,
        category: cat,
      });
    }
  }

  // Saving opportunities
  if (currentByCat["entertainment"] && currentByCat["entertainment"] > 500) {
    insights.push({
      type: "saving_opportunity",
      title: "Entertainment spending opportunity",
      description: `You've spent ₹${Math.round(currentByCat["entertainment"])} on entertainment. Cutting 20% could save ₹${Math.round(currentByCat["entertainment"] * 0.2)}/month.`,
      value: currentByCat["entertainment"] * 0.2,
      category: "entertainment",
    });
    tips.push("Try free streaming options or plan movie nights at home instead.");
  }

  // Positive trends
  if (prevTotal > 0 && currentTotal < prevTotal * 0.9) {
    insights.push({
      type: "positive_trend",
      title: "Great spending control this month!",
      description: `Your family has spent ₹${Math.round(prevTotal - currentTotal)} less than last month so far. Keep it up!`,
      value: prevTotal - currentTotal,
      category: null,
    });
  }

  // Chore streaks
  const topStreaker = members.filter((m) => m.role !== "parent").sort((a, b) => b.streak - a.streak)[0];
  if (topStreaker && topStreaker.streak >= 3) {
    insights.push({
      type: "chore_streak",
      title: `${topStreaker.name} is on a ${topStreaker.streak}-day streak!`,
      description: `${topStreaker.name} has been consistently completing chores. Consider a bonus reward!`,
      value: topStreaker.streak,
      category: null,
    });
  }

  // Goal milestones
  for (const goal of goals) {
    const pct = goal.targetCoins > 0 ? (goal.currentCoins / goal.targetCoins) * 100 : 0;
    if (pct >= 50 && pct < 100) {
      const member = members.find((m) => m.id === goal.memberId);
      insights.push({
        type: "goal_milestone",
        title: `${member?.name ?? "Member"} is halfway to "${goal.name}"`,
        description: `${Math.round(pct)}% of the way there — ${goal.targetCoins - goal.currentCoins} more coins to go!`,
        value: pct,
        category: null,
      });
    }
  }

  // Default tips
  tips.push("Assign recurring chores to build consistent earning habits.");
  tips.push("Set a monthly family budget and review it together every week.");
  if (currentByCat["food"] && currentByCat["groceries"]) {
    const ratio = currentByCat["food"] / (currentByCat["food"] + currentByCat["groceries"]);
    if (ratio > 0.4) {
      tips.push("Your eating-out spend is high — try cooking at home 2 more days a week.");
    }
  }
  tips.push("Use the receipt scanner to automatically track grocery bills.");
  tips.push("Teach kids to save 20% of their coins before spending.");

  const summary = currentTotal === 0
    ? "No expenses recorded this month yet. Start tracking by adding expenses or scanning receipts."
    : `Your family has spent ₹${Math.round(currentTotal)} this month across ${currentExpenses.length} transactions. ${
        prevTotal > 0
          ? currentTotal < prevTotal
            ? `That's ₹${Math.round(prevTotal - currentTotal)} less than last month — great progress!`
            : `That's ₹${Math.round(currentTotal - prevTotal)} more than last month.`
          : "Keep tracking to see month-over-month comparisons."
      }`;

  res.json({
    familyId,
    generatedAt: now.toISOString(),
    summary,
    insights,
    tips: tips.slice(0, 5),
  });
});

export default router;

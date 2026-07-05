import { useGetFamilyDashboard, useGetFamilyActivity } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, CheckCircle2, TrendingDown, Clock, Loader2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function ParentDashboard() {
  const { familyId } = useAuthStore();
  const { data: dashboard, isLoading: dashLoading } = useGetFamilyDashboard(familyId);
  const { data: activity, isLoading: actLoading } = useGetFamilyActivity(familyId);

  if (dashLoading || actLoading) {
    return (
      <AppShell role="parent">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="parent">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Family Command Center</h1>
          <p className="text-muted-foreground">Here is what is happening with the family finances today.</p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[hsl(var(--primary))] text-primary-foreground border-none shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 translate-x-1/4 -translate-y-1/4">
              <Coins className="w-32 h-32" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-primary-foreground/80 text-sm font-medium">Total Coins in Circulation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold">{dashboard?.totalCoinsInCirculation || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-muted-foreground text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.pendingChoresCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Chores awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-muted-foreground text-sm font-medium">Chores Completed</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.completedChoresThisWeek || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">This week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-muted-foreground text-sm font-medium">Total Spend (INR)</CardTitle>
              <TrendingDown className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">₹{dashboard?.totalExpensesThisMonth || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Member Overview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Family Members</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dashboard?.memberSummaries?.filter(m => m.role !== 'parent').map((member, i) => (
                <motion.div key={member.memberId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-5 flex items-center gap-4">
                      <img src={member.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${member.name}`} alt="" className="w-16 h-16 rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="font-bold text-lg">{member.name}</div>
                        <div className="text-sm text-muted-foreground capitalize mb-2">{member.role}</div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 font-semibold text-primary">
                            <Coins className="w-4 h-4" /> {member.coinBalance}
                          </div>
                          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md font-medium">
                            {member.streak}d streak
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent Activity</h2>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {activity?.slice(0, 5).map((event) => (
                    <div key={event.id} className="p-4 flex gap-3 items-start">
                      <img src={event.memberAvatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${event.memberName}`} className="w-8 h-8 rounded-full bg-muted mt-1" alt="" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{event.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })}
                        </p>
                      </div>
                      {event.coinsAmount && (
                        <div className={`text-sm font-bold flex items-center gap-1 shrink-0 ${event.coinsAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {event.coinsAmount > 0 ? '+' : ''}{event.coinsAmount} <Coins className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  ))}
                  {(!activity || activity.length === 0) && (
                    <div className="p-8 text-center text-muted-foreground text-sm">No recent activity</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

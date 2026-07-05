import { useGetMemberWallet } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Flame, Trophy, ArrowUpRight, ArrowDownRight, IndianRupee } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function TeenDashboard() {
  const { familyId, currentMemberId } = useAuthStore();
  const { data: wallet, isLoading } = useGetMemberWallet(familyId, currentMemberId!);

  return (
    <AppShell role="teen">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">Your Wallet</h1>
          <p className="text-muted-foreground">Track your coins, streaks, and goals.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 bg-gradient-to-br from-[hsl(var(--teen-accent))] to-purple-800 text-white border-none shadow-lg relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
              <Coins className="w-64 h-64" />
            </div>
            <CardContent className="p-8 relative z-10 flex flex-col justify-between h-full">
              <div>
                <div className="text-white/80 font-medium mb-1 uppercase tracking-wider text-sm">Available Balance</div>
                <div className="text-6xl font-extrabold flex items-center gap-3">
                  <Coins className="w-12 h-12 text-amber-400" />
                  {wallet?.coinBalance || 0}
                </div>
              </div>
              
              <div className="mt-8 flex gap-8">
                <div>
                  <div className="text-white/60 text-xs uppercase font-bold tracking-wider mb-1">Weekly Earnings</div>
                  <div className="text-2xl font-bold flex items-center gap-1">
                    <ArrowUpRight className="w-5 h-5 text-green-400" />
                    {wallet?.coinsEarnedThisWeek || 0}
                  </div>
                </div>
                <div>
                  <div className="text-white/60 text-xs uppercase font-bold tracking-wider mb-1">Current Level</div>
                  <div className="text-2xl font-bold flex items-center gap-1">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    {wallet?.level || 1}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col items-center justify-center p-8 text-center bg-card border-2">
            <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center mb-4 relative">
              <Flame className="w-12 h-12 text-orange-500" />
              <div className="absolute -bottom-2 -right-2 bg-foreground text-background text-xs font-bold px-2 py-1 rounded-full border-2 border-card">
                Hot!
              </div>
            </div>
            <h2 className="text-3xl font-extrabold mb-1">{wallet?.streak || 0} Day</h2>
            <p className="text-muted-foreground font-medium">Chore Streak</p>
            <p className="text-xs text-muted-foreground mt-4">Complete a chore tomorrow to keep it going!</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <Link href="/teen/spending" className="text-sm font-medium text-[hsl(var(--teen-accent))] hover:underline">View All</Link>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {wallet?.recentTransactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        ['earned', 'allowance', 'bonus'].includes(tx.type) ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {['earned', 'allowance', 'bonus'].includes(tx.type) ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{tx.description}</div>
                        <div className="text-xs text-muted-foreground capitalize">{tx.type} • {formatDistanceToNow(new Date(tx.createdAt), {addSuffix: true})}</div>
                      </div>
                    </div>
                    <div className={`font-bold ${['earned', 'allowance', 'bonus'].includes(tx.type) ? 'text-green-600' : 'text-foreground'}`}>
                      {['earned', 'allowance', 'bonus'].includes(tx.type) ? '+' : '-'}{tx.amount} <Coins className="w-3 h-3 inline pb-0.5" />
                    </div>
                  </div>
                ))}
                {(!wallet?.recentTransactions || wallet.recentTransactions.length === 0) && (
                  <div className="py-8 text-center text-muted-foreground text-sm">No transactions yet.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Savings Goals</CardTitle>
              <Link href="/teen/goals" className="text-sm font-medium text-[hsl(var(--teen-accent))] hover:underline">Manage Goals</Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 pt-2">
                {wallet?.savingsGoals.slice(0, 3).map(goal => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div className="font-bold">{goal.name}</div>
                      <div className="text-sm font-medium">
                        {goal.currentCoins} / {goal.targetCoins} <Coins className="w-3 h-3 inline text-primary pb-0.5" />
                      </div>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[hsl(var(--teen-accent))] rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, (goal.currentCoins / goal.targetCoins) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(!wallet?.savingsGoals || wallet.savingsGoals.length === 0) && (
                  <div className="py-8 text-center text-muted-foreground text-sm">No active goals. Set one up!</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

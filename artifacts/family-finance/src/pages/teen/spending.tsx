import { useListExpenses, useGetExpenseSummary } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Store, Coffee, Bus, GraduationCap, Popcorn, ShoppingBag, Heart, MoreHorizontal } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { format } from "date-fns";

export default function TeenSpending() {
  const { familyId, currentMemberId } = useAuthStore();
  const { data: expenses } = useListExpenses(familyId);
  const { data: summary } = useGetExpenseSummary(familyId);

  const myExpenses = expenses?.filter(e => e.memberId === currentMemberId) || [];
  
  // Need to filter summary.byMember on backend ideally, but we'll extract just our categories here if possible
  // For demo, we'll just use the raw list to group categories
  const categoryTotals = myExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  const COLORS = ['#F59E0B', '#4F46E5', '#10B981', '#8B5CF6', '#EC4899', '#3B82F6', '#EF4444', '#06B6D4', '#64748B'];

  const categoryIcons: Record<string, React.ReactNode> = {
    food: <Coffee className="w-4 h-4" />,
    groceries: <Store className="w-4 h-4" />,
    transport: <Bus className="w-4 h-4" />,
    education: <GraduationCap className="w-4 h-4" />,
    entertainment: <Popcorn className="w-4 h-4" />,
    clothing: <ShoppingBag className="w-4 h-4" />,
    health: <Heart className="w-4 h-4" />,
    other: <MoreHorizontal className="w-4 h-4" />
  };

  const categoryColors: Record<string, string> = {
    food: "bg-orange-100 text-orange-800",
    groceries: "bg-green-100 text-green-800",
    transport: "bg-blue-100 text-blue-800",
    entertainment: "bg-purple-100 text-purple-800",
    education: "bg-indigo-100 text-indigo-800",
    utilities: "bg-cyan-100 text-cyan-800",
    health: "bg-red-100 text-red-800",
    clothing: "bg-pink-100 text-pink-800",
    other: "bg-slate-100 text-slate-800",
  };

  const totalSpent = myExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <AppShell role="teen">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Spending Tracker</h1>
          <p className="text-muted-foreground">Keep an eye on where your UPI money goes.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gradient-to-br from-[hsl(var(--teen-accent))] to-purple-800 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="text-white/80 text-sm font-medium uppercase tracking-wider mb-1">Spent This Month</div>
                <div className="text-5xl font-extrabold flex items-center gap-1">
                  <IndianRupee className="w-8 h-8 text-white/50" />
                  {totalSpent}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Where it went</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-[250px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: number) => [`₹${value}`, 'Amount']}
                          labelFormatter={(label) => <span className="capitalize">{label}</span>}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', textTransform: 'capitalize' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No spending data yet. Good job saving!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Recent Expenses</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {myExpenses.map(exp => (
                    <div key={exp.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${categoryColors[exp.category] || 'bg-muted text-muted-foreground'}`}>
                        {categoryIcons[exp.category] || <IndianRupee className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-foreground truncate text-lg">{exp.description}</p>
                          <p className="font-bold text-foreground shrink-0 text-lg">₹{exp.amount}</p>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground font-medium">{format(new Date(exp.date), "MMM d, yyyy")}</span>
                          <span className="capitalize text-muted-foreground text-xs bg-muted px-2 py-0.5 rounded-full">{exp.category}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {myExpenses.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground">
                      No expenses recorded yet.
                    </div>
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

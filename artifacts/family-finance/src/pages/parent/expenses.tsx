import { useGetExpenseSummary, useListExpenses, useListMembers, useScanReceipt } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, UploadCloud, FileText, Loader2, Plus } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { useState } from "react";
import { format } from "date-fns";

export default function FamilyExpenses() {
  const { familyId } = useAuthStore();
  const { data: summary, isLoading: sumLoading } = useGetExpenseSummary(familyId);
  const { data: expenses, isLoading: expLoading } = useListExpenses(familyId);
  const { data: members } = useListMembers(familyId);
  const scanReceipt = useScanReceipt();
  
  const [scanOpen, setScanOpen] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);

  const COLORS = ['#F59E0B', '#4F46E5', '#10B981', '#8B5CF6', '#EC4899', '#3B82F6', '#EF4444', '#06B6D4', '#64748B'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScanFile(e.target.files[0]);
    }
  };

  const handleScan = () => {
    if (!scanFile || !members) return;
    
    // Convert to base64
    const reader = new FileReader();
    reader.readAsDataURL(scanFile);
    reader.onload = () => {
      const base64 = reader.result as string;
      const parentMember = members.find(m => m.role === 'parent');
      
      scanReceipt.mutate(
        { 
          familyId, 
          data: { 
            memberId: parentMember?.id || members[0].id, 
            imageBase64: base64.split(',')[1] 
          } 
        },
        {
          onSuccess: (data) => {
            setScanResult(data);
          }
        }
      );
    };
  };

  const categoryColors: Record<string, string> = {
    food: "bg-orange-100 text-orange-800 border-orange-200",
    groceries: "bg-green-100 text-green-800 border-green-200",
    transport: "bg-blue-100 text-blue-800 border-blue-200",
    entertainment: "bg-purple-100 text-purple-800 border-purple-200",
    education: "bg-indigo-100 text-indigo-800 border-indigo-200",
    utilities: "bg-cyan-100 text-cyan-800 border-cyan-200",
    health: "bg-red-100 text-red-800 border-red-200",
    clothing: "bg-pink-100 text-pink-800 border-pink-200",
    other: "bg-slate-100 text-slate-800 border-slate-200",
  };

  return (
    <AppShell role="parent">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">Family Expenses</h1>
            <p className="text-muted-foreground">Track UPI spending and scan bills.</p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={scanOpen} onOpenChange={(open) => {
              setScanOpen(open);
              if (!open) {
                setScanFile(null);
                setScanResult(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="shrink-0 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
                  <UploadCloud className="w-4 h-4" /> Scan Receipt
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Scan a Receipt</DialogTitle>
                </DialogHeader>
                <div className="py-6">
                  {!scanResult ? (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-input rounded-xl p-8 text-center flex flex-col items-center justify-center bg-muted/30">
                        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                        <label className="cursor-pointer">
                          <span className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-primary/90 transition-colors">
                            Choose Image
                          </span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                        {scanFile && <p className="mt-4 text-sm font-medium text-indigo-600">{scanFile.name}</p>}
                      </div>
                      <Button 
                        className="w-full" 
                        disabled={!scanFile || scanReceipt.isPending} 
                        onClick={handleScan}
                      >
                        {scanReceipt.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing AI...</> : "Extract Line Items"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-muted p-4 rounded-xl">
                        <div className="font-bold text-lg border-b pb-2 mb-2 flex justify-between items-center">
                          <span>{scanResult.merchantName}</span>
                          <span className="text-muted-foreground text-sm">{format(new Date(scanResult.date), "MMM d, yyyy")}</span>
                        </div>
                        <div className="space-y-2 mb-4">
                          {scanResult.lineItems.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                              <div>
                                <span>{item.name}</span>
                                {item.quantity && item.quantity > 1 && <span className="text-muted-foreground ml-2 text-xs">x{item.quantity}</span>}
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className={`text-[10px] capitalize ${categoryColors[item.category] || ''}`}>
                                  {item.category}
                                </Badge>
                                <span className="font-medium">₹{item.amount.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="border-t pt-2 flex justify-between items-center font-bold text-lg">
                          <span>Total</span>
                          <span>₹{scanResult.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                      <Button className="w-full" onClick={() => setScanOpen(false)}>Done</Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Add Manual
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts/Summary */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-indigo-900 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="text-indigo-200 text-sm font-medium mb-1">Total Spent This Month</div>
                <div className="text-4xl font-extrabold flex items-center gap-1">
                  <IndianRupee className="w-8 h-8" />
                  {summary?.totalSpent || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {summary && summary.byCategory.length > 0 ? (
                  <div className="h-[250px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summary.byCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="amount"
                          nameKey="category"
                        >
                          {summary.byCategory.map((entry, index) => (
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
                    No data to chart
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expense List */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {expenses?.map(exp => (
                    <div key={exp.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <IndianRupee className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-foreground truncate">{exp.description}</p>
                          <p className="font-bold text-foreground shrink-0">₹{exp.amount}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium text-foreground">{exp.memberName}</span>
                            <span>•</span>
                            <span>{format(new Date(exp.date), "MMM d")}</span>
                          </div>
                          <Badge variant="outline" className={`capitalize border ${categoryColors[exp.category] || ''}`}>
                            {exp.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!expenses || expenses.length === 0) && (
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

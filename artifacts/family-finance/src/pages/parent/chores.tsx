import { useListChores, useUpdateChore, useCreateChore, useListMembers } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Coins, Plus, Check, X, Clock, RefreshCw } from "lucide-react";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { getListChoresQueryKey, getGetFamilyDashboardQueryKey } from "@workspace/api-client-react";

export default function ChoreManager() {
  const { familyId } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: chores, isLoading } = useListChores(familyId);
  const { data: members } = useListMembers(familyId);
  const updateChore = useUpdateChore();
  const createChore = useCreateChore();
  const [open, setOpen] = useState(false);

  const [newChore, setNewChore] = useState({
    title: "",
    description: "",
    coinReward: 10,
    assigneeId: "",
    isRecurring: false,
    recurringFrequency: "daily"
  });

  const handleCreate = () => {
    createChore.mutate(
      { 
        familyId, 
        data: {
          title: newChore.title,
          description: newChore.description,
          coinReward: Number(newChore.coinReward),
          assigneeId: newChore.assigneeId ? Number(newChore.assigneeId) : undefined,
          isRecurring: newChore.isRecurring,
          recurringFrequency: newChore.isRecurring ? (newChore.recurringFrequency as any) : undefined
        }
      },
      {
        onSuccess: () => {
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: getListChoresQueryKey(familyId) });
          queryClient.invalidateQueries({ queryKey: getGetFamilyDashboardQueryKey(familyId) });
          setNewChore({ title: "", description: "", coinReward: 10, assigneeId: "", isRecurring: false, recurringFrequency: "daily" });
        }
      }
    );
  };

  const handleUpdateStatus = (choreId: number, status: "approved" | "rejected") => {
    updateChore.mutate(
      { familyId, choreId, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListChoresQueryKey(familyId) });
          queryClient.invalidateQueries({ queryKey: getGetFamilyDashboardQueryKey(familyId) });
        }
      }
    );
  };

  const kidsAndTeens = members?.filter(m => m.role !== 'parent') || [];

  return (
    <AppShell role="parent">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">Chore Manager</h1>
            <p className="text-muted-foreground">Assign tasks and approve completions to award coins.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2 font-bold shadow-lg">
                <Plus className="w-4 h-4" /> New Chore
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Chore</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={newChore.title} onChange={e => setNewChore({...newChore, title: e.target.value})} placeholder="e.g. Wash the dishes" />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input value={newChore.description} onChange={e => setNewChore({...newChore, description: e.target.value})} placeholder="Make sure to use soap" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Coin Reward</Label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-3 h-5 w-5 text-primary" />
                      <Input type="number" className="pl-10 font-bold" value={newChore.coinReward} onChange={e => setNewChore({...newChore, coinReward: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee (Optional)</Label>
                    <Select value={newChore.assigneeId} onValueChange={v => setNewChore({...newChore, assigneeId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Anyone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Anyone</SelectItem>
                        {kidsAndTeens.map(k => (
                          <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-xl bg-muted/50">
                  <Checkbox 
                    id="recurring" 
                    checked={newChore.isRecurring} 
                    onCheckedChange={(c) => setNewChore({...newChore, isRecurring: c as boolean})} 
                  />
                  <div className="grid gap-1.5 leading-none flex-1">
                    <Label htmlFor="recurring">Recurring Chore</Label>
                  </div>
                  {newChore.isRecurring && (
                    <Select value={newChore.recurringFrequency} onValueChange={v => setNewChore({...newChore, recurringFrequency: v})}>
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button className="w-full mt-4" onClick={handleCreate} disabled={!newChore.title || createChore.isPending}>
                  {createChore.isPending ? "Creating..." : "Create Chore"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="needs-approval" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="needs-approval" className="relative">
              Needs Approval
              {chores?.filter(c => c.status === "completed").length ? (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          
          {["needs-approval", "pending", "approved", "all"].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-4 outline-none">
              {chores?.filter(c => {
                if (tab === "needs-approval") return c.status === "completed";
                if (tab === "pending") return c.status === "pending";
                if (tab === "approved") return c.status === "approved";
                return true;
              }).map(chore => (
                <Card key={chore.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center p-4 sm:p-5 gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 shrink-0">
                      <Coins className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg truncate">{chore.title}</h3>
                        {chore.isRecurring && (
                          <Badge variant="secondary" className="text-[10px] uppercase gap-1 shrink-0">
                            <RefreshCw className="w-3 h-3" /> {chore.recurringFrequency}
                          </Badge>
                        )}
                        {chore.status === 'completed' && <Badge className="bg-amber-500 hover:bg-amber-600">Review</Badge>}
                        {chore.status === 'pending' && <Badge variant="outline" className="text-muted-foreground">To Do</Badge>}
                        {chore.status === 'approved' && <Badge variant="success">Approved</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="font-medium text-primary">+{chore.coinReward} Coins</span>
                        {chore.assigneeName ? (
                          <span>Assigned to: <span className="font-semibold text-foreground">{chore.assigneeName}</span></span>
                        ) : (
                          <span>Up for grabs</span>
                        )}
                        {chore.createdAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> Added {format(new Date(chore.createdAt), "MMM d")}</span>}
                      </div>
                    </div>
                    
                    {chore.status === 'completed' && (
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
                          onClick={() => handleUpdateStatus(chore.id, "rejected")}
                          disabled={updateChore.isPending}
                        >
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto shadow-md shadow-green-600/20"
                          onClick={() => handleUpdateStatus(chore.id, "approved")}
                          disabled={updateChore.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              
              {chores?.filter(c => {
                if (tab === "needs-approval") return c.status === "completed";
                if (tab === "pending") return c.status === "pending";
                if (tab === "approved") return c.status === "approved";
                return true;
              }).length === 0 && (
                <div className="text-center p-12 border-2 border-dashed rounded-2xl text-muted-foreground">
                  No chores found in this category.
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  );
}

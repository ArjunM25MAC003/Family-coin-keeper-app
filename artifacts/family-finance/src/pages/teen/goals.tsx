import { useListSavingsGoals, useCreateSavingsGoal, useDeleteSavingsGoal, useGetMemberWallet } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Coins, Plus, Target, Trash2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListSavingsGoalsQueryKey, getGetMemberWalletQueryKey } from "@workspace/api-client-react";

export default function TeenGoals() {
  const { familyId, currentMemberId } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: goals, isLoading } = useListSavingsGoals(familyId);
  const { data: wallet } = useGetMemberWallet(familyId, currentMemberId!);
  
  const createGoal = useCreateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();

  const myGoals = goals?.filter(g => g.memberId === currentMemberId) || [];

  const [open, setOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: "",
    description: "",
    targetCoins: 500,
  });

  const handleCreate = () => {
    if (!newGoal.name) return;
    
    createGoal.mutate(
      { 
        familyId, 
        data: {
          memberId: currentMemberId!,
          name: newGoal.name,
          description: newGoal.description,
          targetCoins: Number(newGoal.targetCoins)
        }
      },
      {
        onSuccess: () => {
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: getListSavingsGoalsQueryKey(familyId) });
          queryClient.invalidateQueries({ queryKey: getGetMemberWalletQueryKey(familyId, currentMemberId!) });
          setNewGoal({ name: "", description: "", targetCoins: 500 });
        }
      }
    );
  };

  const handleDelete = (goalId: number) => {
    if(confirm("Delete this goal? The coins are safe in your wallet.")) {
      deleteGoal.mutate(
        { familyId, goalId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSavingsGoalsQueryKey(familyId) });
            queryClient.invalidateQueries({ queryKey: getGetMemberWalletQueryKey(familyId, currentMemberId!) });
          }
        }
      );
    }
  }

  return (
    <AppShell role="teen">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">Savings Goals</h1>
            <p className="text-muted-foreground">Dream big. Save up. Reach your targets.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="teen" className="shrink-0 gap-2 font-bold shadow-lg">
                <Plus className="w-4 h-4" /> New Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Goal Name</Label>
                  <Input value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} placeholder="e.g. New Headphones" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={newGoal.description} onChange={e => setNewGoal({...newGoal, description: e.target.value})} placeholder="Sony WH-1000XM4" />
                </div>
                <div className="space-y-2">
                  <Label>Target Coins</Label>
                  <div className="relative">
                    <Target className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input type="number" className="pl-10 font-bold" value={newGoal.targetCoins} onChange={e => setNewGoal({...newGoal, targetCoins: Number(e.target.value)})} />
                  </div>
                </div>
                <Button variant="teen" className="w-full mt-4" onClick={handleCreate} disabled={!newGoal.name || createGoal.isPending}>
                  {createGoal.isPending ? "Creating..." : "Save Goal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card border-2 p-6 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Available to Allocate</p>
            <div className="text-3xl font-extrabold flex items-center gap-2 text-[hsl(var(--teen-accent))]">
              <Coins className="w-8 h-8" /> {wallet?.coinBalance || 0}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myGoals.map(goal => {
            const percent = Math.min(100, Math.max(0, (goal.currentCoins / goal.targetCoins) * 100));
            const isComplete = percent >= 100;

            return (
              <Card key={goal.id} className={`overflow-hidden transition-all duration-300 ${isComplete ? 'border-green-500 shadow-green-500/20 shadow-lg' : 'hover:border-[hsl(var(--teen-accent))]/50'}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-xl mb-1 flex items-center gap-2">
                        {goal.name} 
                        {isComplete && <Badge variant="success">Completed!</Badge>}
                      </h3>
                      {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-600 -mt-2 -mr-2" onClick={() => handleDelete(goal.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between items-end text-sm">
                      <span className="font-bold text-2xl flex items-center gap-1">
                        {goal.currentCoins} <Coins className="w-4 h-4 text-primary" />
                      </span>
                      <span className="text-muted-foreground font-medium">of {goal.targetCoins}</span>
                    </div>
                    <Progress value={percent} indicatorColor={isComplete ? "bg-green-500" : "bg-[hsl(var(--teen-accent))]"} className="h-3" />
                  </div>

                  {!isComplete && (
                    <div className="pt-4 border-t flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {goal.targetCoins - goal.currentCoins} coins left
                      </span>
                      <Button variant="outline" size="sm" className="gap-2 text-[hsl(var(--teen-accent))] border-[hsl(var(--teen-accent))]/30 hover:bg-[hsl(var(--teen-accent))]/10">
                        Add Coins <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {myGoals.length === 0 && (
            <div className="col-span-full p-12 border-2 border-dashed rounded-3xl text-center text-muted-foreground bg-muted/30">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-bold text-foreground mb-1">No goals yet</h3>
              <p>Set a target and start saving those coins!</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

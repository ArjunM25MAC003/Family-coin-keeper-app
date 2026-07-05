import { useListAllowances, useCreateAllowance, useDeleteAllowance, useListMembers } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, Plus, Clock, Trash2, Calendar } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { getListAllowancesQueryKey } from "@workspace/api-client-react";

export default function Allowances() {
  const { familyId } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: allowances, isLoading } = useListAllowances(familyId);
  const { data: members } = useListMembers(familyId);
  const createAllowance = useCreateAllowance();
  const deleteAllowance = useDeleteAllowance();
  
  const [open, setOpen] = useState(false);
  const [newAllowance, setNewAllowance] = useState({
    memberId: "",
    coinAmount: 50,
    frequency: "weekly"
  });

  const kidsAndTeens = members?.filter(m => m.role !== 'parent') || [];

  const handleCreate = () => {
    if (!newAllowance.memberId) return;
    
    createAllowance.mutate(
      { 
        familyId, 
        data: {
          memberId: Number(newAllowance.memberId),
          coinAmount: Number(newAllowance.coinAmount),
          frequency: newAllowance.frequency as "daily" | "weekly" | "monthly"
        }
      },
      {
        onSuccess: () => {
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: getListAllowancesQueryKey(familyId) });
          setNewAllowance({ memberId: "", coinAmount: 50, frequency: "weekly" });
        }
      }
    );
  };

  const handleDelete = (allowanceId: number) => {
    if (confirm("Are you sure you want to delete this allowance?")) {
      deleteAllowance.mutate(
        { familyId, allowanceId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAllowancesQueryKey(familyId) });
          }
        }
      );
    }
  };

  return (
    <AppShell role="parent">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">Allowances</h1>
            <p className="text-muted-foreground">Manage recurring coin payouts for the family.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2 font-bold shadow-lg">
                <Plus className="w-4 h-4" /> New Allowance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Setup Allowance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Family Member</Label>
                  <Select value={newAllowance.memberId} onValueChange={v => setNewAllowance({...newAllowance, memberId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {kidsAndTeens.map(k => (
                        <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Coin Amount</Label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-3 h-5 w-5 text-primary" />
                      <Input type="number" className="pl-10 font-bold" value={newAllowance.coinAmount} onChange={e => setNewAllowance({...newAllowance, coinAmount: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={newAllowance.frequency} onValueChange={v => setNewAllowance({...newAllowance, frequency: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full mt-4" onClick={handleCreate} disabled={!newAllowance.memberId || createAllowance.isPending}>
                  {createAllowance.isPending ? "Creating..." : "Save Allowance"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allowances?.map(allowance => {
            const member = members?.find(m => m.id === allowance.memberId);
            return (
              <Card key={allowance.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <img src={member?.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${allowance.memberName}`} className="w-12 h-12 rounded-full bg-muted" alt="" />
                      <div>
                        <div className="font-bold text-lg">{allowance.memberName}</div>
                        <Badge variant={allowance.isActive ? "default" : "secondary"} className="mt-1">
                          {allowance.isActive ? "Active" : "Paused"}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-600 h-8 w-8" onClick={() => handleDelete(allowance.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="bg-muted rounded-xl p-4 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Coins className="w-6 h-6 text-primary" />
                      <span className="text-2xl font-extrabold">{allowance.coinAmount}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold capitalize">{allowance.frequency}</div>
                      <div className="text-xs text-muted-foreground">Payout</div>
                    </div>
                  </div>
                  
                  {allowance.nextPayDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Next payout: {format(new Date(allowance.nextPayDate), "MMM d, yyyy")}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {(!allowances || allowances.length === 0) && (
            <div className="col-span-full text-center p-12 border-2 border-dashed rounded-2xl text-muted-foreground">
              No allowances setup yet. Kids gotta earn their keep!
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

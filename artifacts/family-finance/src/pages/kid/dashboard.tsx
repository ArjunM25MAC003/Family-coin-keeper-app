import { useListChores, useUpdateChore, useGetMemberWallet } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Star, Trophy, Sparkles, CheckCircle2, Flame, Loader2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getListChoresQueryKey } from "@workspace/api-client-react";
import { useState, useEffect } from "react";

export default function KidDashboard() {
  const { familyId, currentMemberId } = useAuthStore();
  const queryClient = useQueryClient();
  
  const { data: chores, isLoading: choresLoading } = useListChores(familyId);
  const { data: wallet, isLoading: walletLoading } = useGetMemberWallet(familyId, currentMemberId!);
  const updateChore = useUpdateChore();

  const [showSparkles, setShowSparkles] = useState(false);

  // Filter for chores assigned to this kid, or unassigned chores, that are pending
  const myChores = chores?.filter(c => 
    (c.assigneeId === currentMemberId || !c.assigneeId) && c.status === "pending"
  ) || [];

  const completedChores = chores?.filter(c => 
    (c.assigneeId === currentMemberId || c.assigneeName) && c.status === "completed"
  ) || [];

  const handleComplete = (choreId: number) => {
    updateChore.mutate(
      { familyId, choreId, data: { status: "completed" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListChoresQueryKey(familyId) });
          setShowSparkles(true);
          setTimeout(() => setShowSparkles(false), 2000);
        }
      }
    );
  };

  if (choresLoading || walletLoading) {
    return (
      <AppShell role="kid">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-[hsl(var(--kid-accent))]" />
        </div>
      </AppShell>
    );
  }

  // Calculate XP progress (fake logic for visual: 100 XP per level)
  const currentXP = wallet ? (wallet.coinBalance % 100) : 0;
  
  return (
    <AppShell role="kid">
      <div className="space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-[hsl(var(--kid-accent))] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
          {/* Decorative background shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full -translate-x-1/4 translate-y-1/4" />
          
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-4 py-1.5 px-4 text-sm gap-2 backdrop-blur-md">
              <Trophy className="w-4 h-4 text-amber-300" /> Level {wallet?.level || 1} Explorer
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 flex items-center gap-3">
              Hello, {wallet?.name.split(' ')[0]}! 
              {showSparkles && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Sparkles className="w-8 h-8 text-amber-300" />
                </motion.div>
              )}
            </h1>
            <p className="text-white/80 font-medium text-lg">Ready for today's adventures?</p>
            
            <div className="mt-6 w-full max-w-sm">
              <div className="flex justify-between text-sm font-bold mb-2">
                <span>XP to next level</span>
                <span>{currentXP} / 100</span>
              </div>
              <div className="h-4 bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${currentXP}%` }}
                  className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                />
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-row md:flex-col gap-4">
            <div className="bg-white text-foreground p-4 rounded-3xl shadow-xl flex flex-col items-center justify-center min-w-[140px] transform hover:scale-105 transition-transform duration-300">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">My Coins</div>
              <div className="text-4xl font-black text-amber-500 flex items-center gap-2">
                <Coins className="w-8 h-8 fill-amber-500 text-white stroke-2" />
                {wallet?.coinBalance || 0}
              </div>
            </div>
            <div className="bg-white text-foreground p-4 rounded-3xl shadow-xl flex flex-col items-center justify-center min-w-[140px] transform hover:scale-105 transition-transform duration-300">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Streak</div>
              <div className="text-4xl font-black text-orange-500 flex items-center gap-2">
                <Flame className="w-8 h-8 fill-orange-500 text-white stroke-2" />
                {wallet?.streak || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Quests Section */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Star className="w-8 h-8 text-[hsl(var(--kid-accent))] fill-[hsl(var(--kid-accent))]" />
            <h2 className="text-3xl font-black">Daily Quests</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {myChores.map((chore, i) => (
                <motion.div 
                  key={chore.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="border-4 border-[hsl(var(--kid-accent))]/20 shadow-none hover:border-[hsl(var(--kid-accent))] hover:shadow-lg transition-all duration-300 overflow-hidden rounded-[2rem] bg-white group cursor-pointer"
                        onClick={() => handleComplete(chore.id)}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--kid-accent))]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform group-hover:bg-[hsl(var(--kid-accent))] group-hover:text-white">
                          <CheckCircle2 className="w-8 h-8 text-[hsl(var(--kid-accent))] group-hover:text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1 line-clamp-1">{chore.title}</h3>
                          <div className="flex items-center gap-2 font-bold text-amber-500 bg-amber-50 inline-flex px-3 py-1 rounded-full text-sm">
                            <Coins className="w-4 h-4 fill-amber-500 text-white" /> +{chore.coinReward} Coins
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {myChores.length === 0 && (
              <div className="col-span-full p-12 bg-gray-50 border-4 border-dashed border-gray-200 rounded-[3rem] text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-400 mb-2">No Quests Left!</h3>
                <p className="text-gray-500 font-medium">You finished everything. Awesome job!</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Approval Section */}
        {completedChores.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-muted-foreground">Waiting for Parent...</h2>
            <div className="space-y-3 opacity-70">
              {completedChores.map(chore => (
                <div key={chore.id} className="bg-muted rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="font-bold line-clamp-1">{chore.title}</span>
                  </div>
                  <span className="font-bold text-amber-600 flex items-center gap-1 shrink-0">
                    +{chore.coinReward} <Coins className="w-3 h-3" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

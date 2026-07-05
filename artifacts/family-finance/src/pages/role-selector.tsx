import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/store";
import { useListMembers } from "@workspace/api-client-react";
import { Coins, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function RoleSelector() {
  const [, setLocation] = useLocation();
  const { setMemberId, familyId } = useAuthStore();
  const { data: members, isLoading } = useListMembers(familyId);

  const handleSelectRole = (memberId: number, role: string) => {
    setMemberId(memberId);
    if (role === "parent") setLocation("/parent");
    if (role === "teen") setLocation("/teen");
    if (role === "kid") setLocation("/kid");
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const roleColors = {
    parent: "bg-[hsl(var(--parent-accent))] text-white border-[hsl(var(--parent-accent))]",
    teen: "bg-[hsl(var(--teen-accent))] text-white border-[hsl(var(--teen-accent))]",
    kid: "bg-[hsl(var(--kid-accent))] text-white border-[hsl(var(--kid-accent))]"
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[hsl(var(--primary))]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[hsl(var(--kid-accent))]/10 rounded-full blur-3xl pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 relative z-10"
      >
        <div className="bg-primary/20 p-4 rounded-3xl inline-flex mb-6 mx-auto">
          <Coins className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">Welcome to KoinKart</h1>
        <p className="text-muted-foreground text-lg">Who is using the app right now?</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl relative z-10">
        {members?.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`cursor-pointer hover-elevate transition-all duration-300 hover:-translate-y-2 border-2 ${roleColors[member.role] || "bg-card"}`}
              onClick={() => handleSelectRole(member.id, member.role)}
            >
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 mb-6 bg-white shadow-xl">
                  <img 
                    src={member.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${member.name}`} 
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-2xl font-bold mb-2">{member.name}</h2>
                <div className="bg-white/20 px-4 py-1 rounded-full text-sm font-semibold capitalize backdrop-blur-md">
                  {member.role}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

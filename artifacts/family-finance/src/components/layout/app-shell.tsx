import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/lib/store";
import { useGetMember } from "@workspace/api-client-react";
import { Coins, LogOut, Home, ListTodo, PieChart, Star, Target, IndianRupee } from "lucide-react";

export function AppShell({ children, role }: { children: React.ReactNode, role: "parent" | "teen" | "kid" }) {
  const { currentMemberId, familyId, setMemberId } = useAuthStore();
  const [, setLocation] = useLocation();

  const { data: member } = useGetMember(familyId, currentMemberId ?? 0, {
    query: { enabled: !!currentMemberId, queryKey: ["getMember", familyId, currentMemberId] }
  });

  const handleLogout = () => {
    setMemberId(null);
    setLocation("/");
  };

  const navItems = {
    parent: [
      { name: "Dashboard", href: "/parent", icon: Home },
      { name: "Chores", href: "/parent/chores", icon: ListTodo },
      { name: "Expenses", href: "/parent/expenses", icon: IndianRupee },
      { name: "Insights", href: "/parent/insights", icon: PieChart },
      { name: "Allowances", href: "/allowances", icon: Coins },
    ],
    teen: [
      { name: "Wallet", href: "/teen", icon: Home },
      { name: "Goals", href: "/teen/goals", icon: Target },
      { name: "Spending", href: "/teen/spending", icon: IndianRupee },
    ],
    kid: [
      { name: "My Quests", href: "/kid", icon: Star },
    ]
  };

  const items = navItems[role] || [];
  
  const themeClasses = {
    parent: "bg-[hsl(var(--parent-accent))] text-white",
    teen: "bg-[hsl(var(--teen-accent))] text-white",
    kid: "bg-[hsl(var(--kid-accent))] text-white",
  };

  const activeThemeClass = themeClasses[role];

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row bg-background">
      {/* Sidebar (Desktop) */}
      <aside className={`hidden md:flex flex-col w-64 ${activeThemeClass} p-4`}>
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="bg-white/20 p-2 rounded-xl">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">KoinKart</span>
        </div>

        <nav className="flex-1 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-white/90 hover:text-white font-medium">
                  <Icon className="w-5 h-5" />
                  {item.name}
                </div>
              </Link>
            )
          })}
        </nav>

        {member && (
          <div className="mt-auto border-t border-white/20 pt-4 px-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={member.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${member.name}`} className="w-10 h-10 rounded-full bg-white/20" alt="" />
              <div>
                <div className="font-bold text-sm">{member.name}</div>
                <div className="text-white/70 text-xs capitalize">{member.role}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-3 px-2 py-2 text-sm text-white/70 hover:text-white transition-colors w-full">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative pb-20 md:pb-0">
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${activeThemeClass}`}>
              <Coins className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">KoinKart</span>
          </div>
          {member && (
            <img src={member.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${member.name}`} onClick={handleLogout} className="w-8 h-8 rounded-full cursor-pointer" alt="Sign out" />
          )}
        </header>

        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 z-20 pb-safe">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div className="flex flex-col items-center gap-1 p-2 w-16 cursor-pointer text-muted-foreground hover:text-foreground">
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </div>
            </Link>
          )
        })}
      </nav>
    </div>
  );
}

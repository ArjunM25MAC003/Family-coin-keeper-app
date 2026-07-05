import { useGetSpendingInsights } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, AlertTriangle, Target, Loader2, Info } from "lucide-react";

export default function ParentInsights() {
  const { familyId } = useAuthStore();
  const { data: insightsData, isLoading } = useGetSpendingInsights(familyId);

  const getIconForType = (type: string) => {
    switch(type) {
      case 'overspend': return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case 'saving_opportunity': return <Lightbulb className="w-6 h-6 text-amber-500" />;
      case 'positive_trend': return <TrendingUp className="w-6 h-6 text-green-500" />;
      case 'goal_milestone': return <Target className="w-6 h-6 text-indigo-500" />;
      default: return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getColorClassForType = (type: string) => {
    switch(type) {
      case 'overspend': return "border-red-200 bg-red-50/50";
      case 'saving_opportunity': return "border-amber-200 bg-amber-50/50";
      case 'positive_trend': return "border-green-200 bg-green-50/50";
      case 'goal_milestone': return "border-indigo-200 bg-indigo-50/50";
      default: return "border-blue-200 bg-blue-50/50";
    }
  };

  if (isLoading) {
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">AI Spending Insights</h1>
          <p className="text-muted-foreground">Smart analysis of your family's money habits.</p>
        </div>
        
        {insightsData && (
          <>
            <Card className="bg-gradient-to-br from-[hsl(var(--parent-accent))] to-indigo-900 text-white border-none shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl shrink-0">
                    <Lightbulb className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-2 text-white">Monthly Summary</h2>
                    <p className="text-indigo-100 leading-relaxed text-lg">{insightsData.summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {insightsData.insights.map((insight, i) => (
                <Card key={i} className={`border-2 ${getColorClassForType(insight.type)}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      {getIconForType(insight.type)}
                      <h3 className="font-bold text-lg text-foreground leading-tight">{insight.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">{insight.description}</p>
                    
                    {insight.value && insight.category && (
                      <div className="mt-4 bg-white/50 rounded-lg p-3 flex justify-between items-center text-sm font-medium">
                        <span className="capitalize text-muted-foreground">{insight.category}</span>
                        <span className="font-bold text-foreground">₹{insight.value}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-t-4 border-t-amber-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" /> Actionable Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {insightsData.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">
                        {i + 1}
                      </div>
                      <span className="leading-snug">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Users, Gift, TrendingUp } from "lucide-react";

interface DashboardStatsProps {
  freeGenerations: number;
  successfulReferrals: number;
  generationsEarned: number;
  generationsUsed: number;
}

export function DashboardStats({
  freeGenerations,
  successfulReferrals,
  generationsEarned,
  generationsUsed,
}: DashboardStatsProps) {
  const stats = [
    {
      label: "Restaurations gratuites",
      value: freeGenerations,
      sublabel: `disponible${freeGenerations !== 1 ? "s" : ""}`,
      icon: Sparkles,
      highlight: true,
    },
    {
      label: "Parrainages réussis",
      value: successfulReferrals,
      sublabel: `ami${successfulReferrals !== 1 ? "s" : ""} invité${successfulReferrals !== 1 ? "s" : ""}`,
      icon: Users,
    },
    {
      label: "Générations gagnées",
      value: generationsEarned,
      sublabel: "via parrainage",
      icon: Gift,
    },
    {
      label: "Générations utilisées",
      value: generationsUsed,
      sublabel: "photos restaurées",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card 
          key={stat.label} 
          className={stat.highlight ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent" : ""}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <stat.icon className="h-4 w-4" />
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stat.highlight ? "text-primary" : ""}`}>
              {stat.value}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{stat.sublabel}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

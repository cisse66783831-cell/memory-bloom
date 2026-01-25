import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Image, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  Gift,
  DollarSign,
  Percent
} from "lucide-react";

interface KPIData {
  totalUsers: number;
  activeUsers: number;
  totalPhotos: number;
  totalRevenue: number;
  revenueToday: number;
  revenueThisMonth: number;
  totalReferralRewards: number;
  estimatedAICost: number;
  estimatedGrossProfit: number;
}

interface AdminKPICardsProps {
  data: KPIData;
  isLoading?: boolean;
}

export function AdminKPICards({ data, isLoading }: AdminKPICardsProps) {
  const kpis = [
    {
      label: "Total utilisateurs",
      value: data.totalUsers,
      icon: Users,
      format: "number",
    },
    {
      label: "Utilisateurs actifs (30j)",
      value: data.activeUsers,
      icon: Calendar,
      format: "number",
    },
    {
      label: "Photos traitées",
      value: data.totalPhotos,
      icon: Image,
      format: "number",
    },
    {
      label: "Revenus totaux",
      value: data.totalRevenue,
      icon: CreditCard,
      format: "currency",
      highlight: true,
    },
    {
      label: "Revenus aujourd'hui",
      value: data.revenueToday,
      icon: TrendingUp,
      format: "currency",
    },
    {
      label: "Revenus ce mois",
      value: data.revenueThisMonth,
      icon: DollarSign,
      format: "currency",
    },
    {
      label: "Récompenses parrainage",
      value: data.totalReferralRewards,
      icon: Gift,
      format: "number",
    },
    {
      label: "Coût IA estimé",
      value: data.estimatedAICost,
      icon: DollarSign,
      format: "currency",
      negative: true,
    },
    {
      label: "Profit brut estimé",
      value: data.estimatedGrossProfit,
      icon: Percent,
      format: "currency",
      highlight: true,
    },
  ];

  const formatValue = (value: number, format: string) => {
    if (format === "currency") {
      return `${value.toLocaleString("fr-FR")} XOF`;
    }
    return value.toLocaleString("fr-FR");
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map((kpi) => (
        <Card 
          key={kpi.label}
          className={kpi.highlight ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent" : ""}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <kpi.icon className="h-3.5 w-3.5" />
              {kpi.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${kpi.negative ? "text-destructive" : kpi.highlight ? "text-primary" : ""}`}>
              {isLoading ? "..." : formatValue(kpi.value, kpi.format)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

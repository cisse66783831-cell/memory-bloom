import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Percent, Globe, Users } from "lucide-react";

interface FinancialData {
  revenueByDay: { date: string; amount: number }[];
  revenueByMonth: { month: string; amount: number }[];
  conversionRate: number;
  arpu: number;
  estimatedAICostPerMonth: number;
  grossMargin: number;
}

interface AdminFinancialInsightsProps {
  data: FinancialData;
}

export function AdminFinancialInsights({ data }: AdminFinancialInsightsProps) {
  const kpis = [
    {
      label: "Taux de conversion",
      value: `${data.conversionRate.toFixed(1)}%`,
      sublabel: "aperçu → paiement",
      icon: Percent,
    },
    {
      label: "ARPU",
      value: `${data.arpu.toLocaleString("fr-FR")} XOF`,
      sublabel: "revenu moyen par utilisateur",
      icon: Users,
    },
    {
      label: "Coût IA / mois",
      value: `${data.estimatedAICostPerMonth.toLocaleString("fr-FR")} XOF`,
      sublabel: "estimation",
      icon: DollarSign,
    },
    {
      label: "Marge brute",
      value: `${data.grossMargin.toFixed(1)}%`,
      sublabel: "après coûts IA",
      icon: TrendingUp,
      highlight: data.grossMargin > 50,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card 
            key={kpi.label}
            className={kpi.highlight ? "border-success/30 bg-gradient-to-br from-success/5 to-transparent" : ""}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <kpi.icon className="h-3.5 w-3.5" />
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpi.highlight ? "text-success" : ""}`}>
                {kpi.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sublabel}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Charts - Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenus par jour (7 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenueByDay.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Pas assez de données
              </div>
            ) : (
              <div className="space-y-2">
                {data.revenueByDay.map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{day.date}</span>
                    <span className="font-medium">
                      {day.amount.toLocaleString("fr-FR")} XOF
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Revenus par mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenueByMonth.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Pas assez de données
              </div>
            ) : (
              <div className="space-y-2">
                {data.revenueByMonth.map((month) => (
                  <div key={month.month} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{month.month}</span>
                    <span className="font-medium">
                      {month.amount.toLocaleString("fr-FR")} XOF
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Gift, TrendingUp, Users, DollarSign, Loader2, Check, X } from "lucide-react";
import { useAdminReferrals, useAdminReferralStats } from "@/hooks/useReferrals";

export function AdminReferralsTable() {
  const { data: referrals, isLoading: referralsLoading } = useAdminReferrals();
  const { data: stats, isLoading: statsLoading } = useAdminReferralStats();

  const isLoading = referralsLoading || statsLoading;

  const roi = stats && stats.estimatedCost > 0 
    ? (((stats.successfulReferrals * 1000) - stats.estimatedCost) / stats.estimatedCost * 100).toFixed(1)
    : "0";

  const kpis = [
    { label: "Total parrainages", value: stats?.totalReferrals || 0, icon: Users },
    { label: "Parrainages payés", value: stats?.successfulReferrals || 0, icon: TrendingUp },
    { label: "Récompenses données", value: stats?.totalRewardsGiven || 0, icon: Gift },
    { label: "Coût estimé", value: `${(stats?.estimatedCost || 0).toLocaleString("fr-FR")} XOF`, icon: DollarSign },
    { label: "ROI", value: `${roi}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <kpi.icon className="h-3.5 w-3.5" />
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Détail des parrainages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !referrals || referrals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun parrainage trouvé
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parrain</TableHead>
                    <TableHead>Filleul</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Récompense</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {referral.referrer?.first_name} {referral.referrer?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {referral.referrer?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {referral.referred?.first_name} {referral.referred?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {referral.referred?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {referral.reward_type === "free_generation" 
                            ? "Génération gratuite" 
                            : "Commission partenaire"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {referral.reward_amount > 0 ? (
                          <Badge className="gap-1 bg-success">
                            <Check className="h-3 w-3" />
                            {referral.reward_type === "free_generation" 
                              ? `+${referral.reward_amount}` 
                              : `${referral.reward_amount} XOF`}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <X className="h-3 w-3" /> Limite atteinte
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(referral.created_at), "dd MMM yyyy HH:mm", {
                          locale: fr,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

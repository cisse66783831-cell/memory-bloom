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

interface ReferralData {
  referrer: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  referred: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    created_at: string;
  };
  hasPaid: boolean;
  rewardGranted: boolean;
}

interface AdminReferralsTableProps {
  referrals: ReferralData[];
  isLoading: boolean;
  stats: {
    totalReferrals: number;
    successfulReferrals: number;
    totalRewardsGiven: number;
    estimatedCost: number;
  };
}

export function AdminReferralsTable({
  referrals,
  isLoading,
  stats,
}: AdminReferralsTableProps) {
  const roi = stats.estimatedCost > 0 
    ? ((stats.successfulReferrals * 1000 - stats.estimatedCost) / stats.estimatedCost * 100).toFixed(1)
    : 0;

  const kpis = [
    { label: "Total parrainages", value: stats.totalReferrals, icon: Users },
    { label: "Parrainages payés", value: stats.successfulReferrals, icon: TrendingUp },
    { label: "Récompenses données", value: stats.totalRewardsGiven, icon: Gift },
    { label: "Coût estimé", value: `${stats.estimatedCost.toLocaleString("fr-FR")} XOF`, icon: DollarSign },
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
          ) : referrals.length === 0 ? (
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
                    <TableHead>A payé</TableHead>
                    <TableHead>Récompense</TableHead>
                    <TableHead>Date inscription</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {referral.referrer.first_name} {referral.referrer.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {referral.referrer.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {referral.referred.first_name} {referral.referred.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {referral.referred.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {referral.hasPaid ? (
                          <Badge className="gap-1 bg-success">
                            <Check className="h-3 w-3" /> Oui
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <X className="h-3 w-3" /> Non
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {referral.rewardGranted ? (
                          <Badge className="gap-1 bg-success">
                            <Check className="h-3 w-3" /> Oui
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <X className="h-3 w-3" /> Non
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(referral.referred.created_at), "dd MMM yyyy", {
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

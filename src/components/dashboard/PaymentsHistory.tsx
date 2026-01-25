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
import { CreditCard, Loader2, Receipt } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Payment {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  restoration_id: string;
}

export function PaymentsHistory() {
  const { user } = useAuth();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["user-payments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get user's restoration IDs
      const { data: restorations } = await supabase
        .from("photo_restorations")
        .select("id")
        .eq("user_id", user.id);

      if (!restorations || restorations.length === 0) return [];

      const restorationIds = restorations.map((r) => r.id);

      // Then get payments for those restorations
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .in("restoration_id", restorationIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!user?.id,
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      completed: { label: "Payé", variant: "default" },
      pending: { label: "En attente", variant: "secondary" },
      failed: { label: "Échec", variant: "destructive" },
    };
    const statusConfig = config[status] || { label: status, variant: "secondary" };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Historique des paiements
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Historique des paiements
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Aucun paiement pour l'instant
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalSpent = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Historique des paiements
        </CardTitle>
        <Badge variant="secondary" className="text-sm">
          Total: {totalSpent.toLocaleString("fr-FR")} XOF
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Méthode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {format(new Date(payment.created_at), "dd MMM yyyy HH:mm", {
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.amount.toLocaleString("fr-FR")} {payment.currency}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.provider || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

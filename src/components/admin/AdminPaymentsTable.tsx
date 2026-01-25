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
import { CreditCard, Loader2 } from "lucide-react";

interface Payment {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  restoration_id: string;
}

interface AdminPaymentsTableProps {
  payments: Payment[];
  isLoading: boolean;
  getUserForRestoration: (restorationId: string) => string;
}

export function AdminPaymentsTable({
  payments,
  isLoading,
  getUserForRestoration,
}: AdminPaymentsTableProps) {
  const totalRevenue = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      completed: { variant: "default", label: "Payé" },
      pending: { variant: "secondary", label: "En attente" },
      failed: { variant: "destructive", label: "Échec" },
    };
    const statusConfig = config[status] || { variant: "secondary", label: status };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Historique des paiements ({payments.length})
        </CardTitle>
        <div className="flex gap-4">
          <Badge variant="secondary" className="text-sm">
            Total: {totalRevenue.toLocaleString("fr-FR")} XOF
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun paiement trouvé
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Photo ID</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">
                      {payment.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      {getUserForRestoration(payment.restoration_id)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.restoration_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.amount.toLocaleString("fr-FR")} {payment.currency}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.provider || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(payment.created_at), "dd MMM yyyy HH:mm", {
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
  );
}

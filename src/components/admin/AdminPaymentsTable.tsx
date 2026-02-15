import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditCard, Loader2, CheckCircle2, XCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  restoration_id: string;
  deposit_method?: string | null;
  sender_phone?: string | null;
}

interface AdminPaymentsTableProps {
  payments: Payment[];
  isLoading: boolean;
  getUserForRestoration: (restorationId: string) => string;
  onRefresh?: () => void;
}

export function AdminPaymentsTable({
  payments, isLoading, getUserForRestoration, onRefresh,
}: AdminPaymentsTableProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const totalRevenue = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  const handleValidate = async (paymentId: string) => {
    setProcessingId(paymentId);
    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: { action: "validate", paymentId },
      });
      if (error || !data?.success) throw new Error(data?.error || "Validation failed");
      toast({ title: "✅ Paiement validé", description: "L'utilisateur peut maintenant télécharger." });
      onRefresh?.();
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (paymentId: string) => {
    setProcessingId(paymentId);
    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: { action: "reject", paymentId },
      });
      if (error || !data?.success) throw new Error(data?.error || "Rejection failed");
      toast({ title: "Paiement rejeté" });
      onRefresh?.();
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast({ title: "Numéro copié", description: phone });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      completed: { variant: "default", label: "✅ Validé" },
      pending: { variant: "outline", label: "⏳ En attente" },
      rejected: { variant: "destructive", label: "❌ Rejeté" },
      failed: { variant: "destructive", label: "Échec" },
    };
    const c = config[status] || { variant: "secondary", label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Paiements ({payments.length})
        </CardTitle>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-sm border-orange-500/30 text-orange-400">
              {pendingCount} en attente
            </Badge>
          )}
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
          <p className="text-center text-muted-foreground py-8">Aucun paiement trouvé</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>N° Expéditeur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} className={payment.status === "pending" ? "bg-orange-500/5" : ""}>
                    <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                    <TableCell className="max-w-[120px] truncate">{getUserForRestoration(payment.restoration_id)}</TableCell>
                    <TableCell className="font-medium">{payment.amount.toLocaleString("fr-FR")} {payment.currency}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{payment.deposit_method || payment.provider || "—"}</TableCell>
                    <TableCell>
                      {payment.sender_phone ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-mono">{payment.sender_phone}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopyPhone(payment.sender_phone!)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(payment.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {payment.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleValidate(payment.id)}
                            disabled={processingId === payment.id}
                            className="h-8 px-2"
                          >
                            {processingId === payment.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(payment.id)}
                            disabled={processingId === payment.id}
                            className="h-8 px-2"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
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

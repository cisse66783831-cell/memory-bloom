import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Building2, 
  Loader2, 
  Check, 
  X, 
  Wallet,
  UserPlus,
  DollarSign,
  Clock,
  CheckCircle2,
  Ban
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  useAdminPartners, 
  useAdminPartnerPayouts,
  useApprovePartnerPayout,
  useMarkPayoutPaid 
} from "@/hooks/useAdminPartners";

export function AdminPartnersTable() {
  const { toast } = useToast();
  const { data: partners, isLoading: partnersLoading } = useAdminPartners();
  const { data: payouts, isLoading: payoutsLoading } = useAdminPartnerPayouts();
  const approvePayout = useApprovePartnerPayout();
  const markPaid = useMarkPayoutPaid();
  
  const [selectedPayout, setSelectedPayout] = useState<{
    id: string;
    partnerUserId: string;
    amount: number;
    action: "approve" | "pay";
  } | null>(null);

  const handleApprovePayout = async () => {
    if (!selectedPayout) return;
    
    try {
      await approvePayout.mutateAsync(selectedPayout.id);
      toast({
        title: "Versement approuvé",
        description: "Le partenaire sera notifié",
      });
      setSelectedPayout(null);
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedPayout) return;
    
    try {
      await markPaid.mutateAsync({
        payoutId: selectedPayout.id,
        partnerUserId: selectedPayout.partnerUserId,
        amount: selectedPayout.amount,
      });
      toast({
        title: "Versement effectué",
        description: "Le solde du partenaire a été mis à jour",
      });
      setSelectedPayout(null);
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const isLoading = partnersLoading || payoutsLoading;

  // Stats
  const totalPartners = partners?.length || 0;
  const totalCommissions = partners?.reduce((sum, p) => sum + p.totalCommissions, 0) || 0;
  const pendingCommissions = partners?.reduce((sum, p) => sum + p.pendingCommissions, 0) || 0;
  const pendingPayouts = payouts?.filter(p => p.status === "requested" || p.status === "approved").length || 0;

  const stats = [
    { label: "Partenaires actifs", value: totalPartners, icon: Building2 },
    { label: "Commissions totales", value: `${totalCommissions.toLocaleString("fr-FR")} XOF`, icon: DollarSign },
    { label: "Commissions en attente", value: `${pendingCommissions.toLocaleString("fr-FR")} XOF`, icon: Clock },
    { label: "Demandes de versement", value: pendingPayouts, icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <stat.icon className="h-3.5 w-3.5" />
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Partners Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Liste des partenaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !partners || partners.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Aucun partenaire pour l'instant
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Promouvez un utilisateur en partenaire depuis l'onglet Utilisateurs
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partenaire</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Commissions totales</TableHead>
                    <TableHead>En attente</TableHead>
                    <TableHead>Versé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {partner.first_name} {partner.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {partner.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {partner.partner_code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {partner.totalCommissions.toLocaleString("fr-FR")} XOF
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {partner.pendingCommissions.toLocaleString("fr-FR")} XOF
                        </Badge>
                      </TableCell>
                      <TableCell className="text-success">
                        {partner.paidCommissions.toLocaleString("fr-FR")} XOF
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Demandes de versement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payoutsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !payouts || payouts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune demande de versement
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partenaire</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date demande</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {payout.partner?.first_name} {payout.partner?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payout.partner?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {payout.amount.toLocaleString("fr-FR")} XOF
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(payout.requested_at), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            payout.status === "paid" 
                              ? "bg-success" 
                              : payout.status === "approved" 
                                ? "bg-primary" 
                                : "bg-warning"
                          }
                        >
                          {payout.status === "paid" 
                            ? "Versé" 
                            : payout.status === "approved" 
                              ? "Approuvé" 
                              : "En attente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payout.status === "requested" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedPayout({
                              id: payout.id,
                              partnerUserId: payout.partner_user_id,
                              amount: payout.amount,
                              action: "approve",
                            })}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                        )}
                        {payout.status === "approved" && (
                          <Button 
                            size="sm"
                            onClick={() => setSelectedPayout({
                              id: payout.id,
                              partnerUserId: payout.partner_user_id,
                              amount: payout.amount,
                              action: "pay",
                            })}
                          >
                            <Wallet className="h-4 w-4 mr-1" />
                            Marquer payé
                          </Button>
                        )}
                        {payout.status === "paid" && (
                          <span className="text-sm text-muted-foreground">
                            {payout.paid_at && format(new Date(payout.paid_at), "dd/MM/yy", { locale: fr })}
                          </span>
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

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPayout?.action === "approve" ? "Approuver le versement" : "Confirmer le paiement"}
            </DialogTitle>
            <DialogDescription>
              {selectedPayout?.action === "approve" 
                ? "Cette action approuvera la demande de versement."
                : "Cette action marquera le versement comme effectué et déduira le solde du partenaire."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Montant</p>
              <p className="text-2xl font-bold">
                {selectedPayout?.amount.toLocaleString("fr-FR")} XOF
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPayout(null)}>
              Annuler
            </Button>
            <Button 
              onClick={selectedPayout?.action === "approve" ? handleApprovePayout : handleMarkPaid}
              disabled={approvePayout.isPending || markPaid.isPending}
            >
              {(approvePayout.isPending || markPaid.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

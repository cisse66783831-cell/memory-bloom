import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
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
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerStatus, usePartnerStats, usePartnerCommissions, usePartnerPayouts, useRequestPayout } from "@/hooks/usePartner";
import { 
  Loader2, 
  Link as LinkIcon, 
  UserPlus, 
  CreditCard, 
  DollarSign,
  Wallet,
  Copy,
  Check,
  Building2,
  Clock,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const MIN_PAYOUT_AMOUNT = 5000; // Minimum 5,000 XOF

export default function Partner() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: partnerStatus, isLoading: statusLoading } = usePartnerStatus();
  const { data: stats, isLoading: statsLoading } = usePartnerStats();
  const { data: commissions } = usePartnerCommissions();
  const { data: payouts } = usePartnerPayouts();
  const requestPayout = useRequestPayout();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const partnerLink = partnerStatus?.partnerCode
    ? `${window.location.origin}/auth?ref=${partnerStatus.partnerCode}`
    : "";

  const handleCopyLink = async () => {
    if (!partnerLink) return;
    await navigator.clipboard.writeText(partnerLink);
    setCopied(true);
    toast({
      title: "Lien copié !",
      description: "Partagez ce lien pour gagner des commissions",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestPayout = async () => {
    if (!stats || stats.commissionPending < MIN_PAYOUT_AMOUNT) {
      toast({
        title: "Montant insuffisant",
        description: `Le minimum de retrait est de ${MIN_PAYOUT_AMOUNT.toLocaleString("fr-FR")} XOF`,
        variant: "destructive",
      });
      return;
    }

    try {
      await requestPayout.mutateAsync(stats.commissionPending);
      toast({
        title: "Demande envoyée",
        description: "Votre demande de versement sera traitée sous 48h",
      });
      setShowPayoutDialog(false);
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Show coming soon if not a partner
  if (!partnerStatus?.isPartner) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto text-center"
          >
            <Building2 className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="font-heading text-3xl font-bold mb-4">
              Programme Partenaires REVIVO
            </h1>
            <p className="text-muted-foreground mb-8">
              Bientôt disponible ! Devenez partenaire REVIVO et gagnez des commissions 
              en recommandant notre service à vos clients.
            </p>
            <Card className="text-left">
              <CardHeader>
                <CardTitle className="text-lg">Avantages partenaires</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <p className="font-medium">250 F CFA par vente</p>
                    <p className="text-sm text-muted-foreground">
                      Commission fixe sur chaque paiement
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <p className="font-medium">Suivi en temps réel</p>
                    <p className="text-sm text-muted-foreground">
                      Dashboard dédié avec statistiques détaillées
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <p className="font-medium">Paiements réguliers</p>
                    <p className="text-sm text-muted-foreground">
                      Versements sur demande, minimum 5,000 F
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground mt-8">
              Contactez-nous à partenaires@revivo.app pour rejoindre le programme
            </p>
          </motion.div>
        </main>
      </div>
    );
  }

  const statsCards = [
    { label: "Inscriptions", value: stats?.totalSignups || 0, icon: UserPlus },
    { label: "Clients payants", value: stats?.totalPayingUsers || 0, icon: CreditCard },
    { label: "Revenus générés", value: `${(stats?.revenueGenerated || 0).toLocaleString("fr-FR")} XOF`, icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-heading text-3xl font-bold">Espace Partenaire</h1>
              <p className="text-muted-foreground">
                Commission: 250 F CFA par vente
              </p>
            </div>
          </div>

          {/* Referral Link */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Votre lien partenaire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                  {partnerLink || "Chargement..."}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Code partenaire: <span className="font-mono font-medium">{partnerStatus?.partnerCode}</span>
              </p>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          {statsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {statsCards.map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <stat.icon className="h-3.5 w-3.5" />
                      {stat.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Commission Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Vos commissions
              </CardTitle>
              <Button 
                onClick={() => setShowPayoutDialog(true)}
                disabled={(stats?.commissionPending || 0) < MIN_PAYOUT_AMOUNT}
              >
                <Clock className="h-4 w-4 mr-2" />
                Demander un versement
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Total gagné</p>
                  <p className="text-2xl font-bold text-primary">
                    {(stats?.commissionEarned || 0).toLocaleString("fr-FR")} XOF
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">Déjà versé</p>
                  <p className="text-2xl font-bold">
                    {(stats?.commissionPaid || 0).toLocaleString("fr-FR")} XOF
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">En attente</p>
                  <p className="text-2xl font-bold">
                    {(stats?.commissionPending || 0).toLocaleString("fr-FR")} XOF
                  </p>
                </div>
              </div>

              {/* Recent commissions */}
              {commissions && commissions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Dernières commissions</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.slice(0, 5).map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell className="text-sm">
                            {format(new Date(commission.created_at), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell className="font-medium">
                            +{commission.commission_amount.toLocaleString("fr-FR")} XOF
                          </TableCell>
                          <TableCell>
                            <Badge className={commission.status === "paid" ? "bg-success" : "bg-warning"}>
                              {commission.status === "paid" ? "Versé" : "En attente"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payouts History */}
          {payouts && payouts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historique des versements</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date demande</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date versement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="text-sm">
                          {format(new Date(payout.requested_at), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {payout.amount.toLocaleString("fr-FR")} XOF
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
                        <TableCell className="text-sm">
                          {payout.paid_at 
                            ? format(new Date(payout.paid_at), "dd MMM yyyy", { locale: fr })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>

      {/* Payout Request Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demander un versement</DialogTitle>
            <DialogDescription>
              Vous allez demander le versement de vos commissions en attente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Montant à verser</p>
              <p className="text-3xl font-bold text-primary">
                {(stats?.commissionPending || 0).toLocaleString("fr-FR")} XOF
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Le versement sera traité sous 48h ouvrées.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleRequestPayout} disabled={requestPayout.isPending}>
              {requestPayout.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer la demande
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

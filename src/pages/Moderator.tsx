import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useModeratorRole } from "@/hooks/useModeratorRole";
import {
  useModeratorPartners,
  useModeratorCommissions,
  useModeratorPayouts,
  useRequestModeratorPayout,
  usePromoteToPartner,
} from "@/hooks/useModerator";
import { useProfile } from "@/hooks/useProfile";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Users,
  Briefcase,
  TrendingUp,
  Wallet,
  Loader2,
  UserPlus,
  CreditCard,
  UserCheck,
  UserX,
  Copy,
  Share2,
  Link as LinkIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Moderator = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isModerator, loading: modLoading } = useModeratorRole();
  const { data: partners = [], isLoading: partnersLoading } = useModeratorPartners();
  const { data: commissions = [] } = useModeratorCommissions();
  const { data: payouts = [] } = useModeratorPayouts();
  const { data: profile } = useProfile();
  const requestPayout = useRequestModeratorPayout();
  const promoteToPartner = usePromoteToPartner();
  const { toast } = useToast();

  const moderatorCode = profile?.moderator_code;
  const inviteLink = moderatorCode ? `https://revivo.lovable.app/?mod=${moderatorCode}` : "";

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    toast({ title: "Lien copie", description: "Le lien d'invitation a ete copie." });
  };

  const handleShareWhatsApp = () => {
    if (!inviteLink) return;
    const message = "Rejoins REVIVO pour restaurer des photos anciennes et gagner des commissions sur chaque inscription ! Inscris-toi ici : " + inviteLink;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handlePromoteToPartner = async (userId: string) => {
    try {
      await promoteToPartner.mutateAsync(userId);
      toast({ title: "Partenaire nomme", description: "L'utilisateur est maintenant partenaire." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de promouvoir en partenaire.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!modLoading && !isModerator && user) navigate("/");
  }, [isModerator, modLoading, user, navigate]);

  if (authLoading || modLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isModerator) return null;

  const totalCommissions = commissions.reduce((s, c) => s + c.commission_amount, 0);
  const pendingCommissions = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + c.commission_amount, 0);
  const totalSignups = partners.reduce((s, p) => s + p.signupsCount, 0);
  const totalPayments = partners.reduce((s, p) => s + p.paymentsCount, 0);

  const handleRequestPayout = async () => {
    if (pendingCommissions < 5000) {
      toast({
        title: "Seuil non atteint",
        description: "Vous devez avoir au moins 5 000 F de commissions en attente.",
        variant: "destructive",
      });
      return;
    }
    try {
      await requestPayout.mutateAsync(pendingCommissions);
      toast({ title: "Demande envoyée", description: "Votre demande de versement a été soumise." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de soumettre la demande.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-heading text-3xl font-bold">Espace Commercial</h1>
              <p className="text-muted-foreground">Gérez vos partenaires et commissions</p>
            </div>
          </div>

          {/* Invitation Link Card */}
          {moderatorCode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  Lien d'invitation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Votre code moderateur</p>
                  <Badge variant="secondary" className="text-lg font-mono px-3 py-1">{moderatorCode}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Partagez ce lien pour recruter</p>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs font-mono truncate flex items-center">
                      {inviteLink}
                    </code>
                    <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copier le lien">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button onClick={handleShareWhatsApp} className="w-full gap-2" variant="outline">
                  <Share2 className="h-4 w-4" />
                  Partager via WhatsApp
                </Button>
              </CardContent>
            </Card>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Partenaires recrutés</p>
                    <p className="text-2xl font-bold">{partners.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Inscrits via partenaires</p>
                    <p className="text-2xl font-bold">{totalSignups}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Paiements filleuls</p>
                    <p className="text-2xl font-bold">{totalPayments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Commissions totales</p>
                    <p className="text-2xl font-bold">{totalCommissions.toLocaleString("fr-FR")} F</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payout request */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Commissions en attente : {pendingCommissions.toLocaleString("fr-FR")} F
              </CardTitle>
              <Button onClick={handleRequestPayout} disabled={pendingCommissions < 5000 || requestPayout.isPending}>
                {requestPayout.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Demander un versement
              </Button>
            </CardHeader>
          </Card>

          {/* Recruits table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Mes recrues ({partners.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {partnersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : partners.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                  Aucune recrue pour le moment. Partagez votre lien d'invitation !
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Code partenaire</TableHead>
                        <TableHead>Inscrits</TableHead>
                        <TableHead>Payants</TableHead>
                        <TableHead>Conversion</TableHead>
                        <TableHead>Recrute le</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partners.map((p) => (
                        <TableRow key={p.user_id}>
                          <TableCell className="font-medium">
                            {p.first_name || ""} {p.last_name || ""}
                          </TableCell>
                          <TableCell className="text-xs font-mono">{p.email || "—"}</TableCell>
                          <TableCell>
                            {p.is_partner ? (
                              <Badge className="bg-success">Partenaire</Badge>
                            ) : (
                              <Badge variant="outline">Inscrit</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{p.partner_code || "—"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <UserPlus className="h-3 w-3 text-muted-foreground" />
                              <span className="font-bold">{p.signupsCount}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {p.paymentsCount > 0 ? (
                                <UserCheck className="h-3 w-3 text-success" />
                              ) : (
                                <UserX className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className="font-bold">{p.paymentsCount}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.signupsCount > 0 && p.paymentsCount > 0 ? "default" : "outline"}>
                              {p.signupsCount > 0 ? Math.round((p.paymentsCount / p.signupsCount) * 100) : 0}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(p.created_at), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {!p.is_partner && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePromoteToPartner(p.user_id)}
                                disabled={promoteToPartner.isPending}
                              >
                                Nommer partenaire
                              </Button>
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

          {/* Payouts history */}
          {payouts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historique des versements</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs">
                          {format(new Date(p.requested_at), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="font-bold">
                          {p.amount.toLocaleString("fr-FR")} F
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              p.status === "paid"
                                ? "default"
                                : p.status === "approved"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {p.status === "paid"
                              ? "Payé"
                              : p.status === "approved"
                              ? "Approuvé"
                              : "En attente"}
                          </Badge>
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
    </div>
  );
};

export default Moderator;

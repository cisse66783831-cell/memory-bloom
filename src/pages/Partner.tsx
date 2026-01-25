import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { 
  Loader2, 
  Link as LinkIcon, 
  MousePointer, 
  UserPlus, 
  CreditCard, 
  DollarSign,
  Wallet,
  Clock,
  Copy,
  Check,
  Building2
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

// Partner Dashboard - Future-ready structure
// This page will be enabled when partner role is implemented

export default function Partner() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Placeholder partner data - will come from database when implemented
  const partnerData = {
    isPartner: false, // Will be checked from user_roles table
    referralLink: profile?.referral_code 
      ? `${window.location.origin}/auth?ref=${profile.referral_code}` 
      : "",
    stats: {
      totalClicks: 0,
      totalSignups: 0,
      totalPayingUsers: 0,
      revenueGenerated: 0,
      commissionRate: 10, // 10%
      commissionEarned: 0,
      commissionPaid: 0,
      commissionPending: 0,
    },
  };

  const handleCopyLink = async () => {
    if (!partnerData.referralLink) return;
    await navigator.clipboard.writeText(partnerData.referralLink);
    setCopied(true);
    toast({
      title: "Lien copié !",
      description: "Partagez ce lien pour gagner des commissions",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestPayout = () => {
    toast({
      title: "Demande envoyée",
      description: "Votre demande de versement sera traitée sous 48h",
    });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Show coming soon if not a partner
  if (!partnerData.isPartner) {
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
                    <p className="font-medium">Commission attractive</p>
                    <p className="text-sm text-muted-foreground">
                      10% sur chaque vente générée par votre lien
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
                      Versements mensuels automatiques
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

  const stats = [
    { label: "Clics totaux", value: partnerData.stats.totalClicks, icon: MousePointer },
    { label: "Inscriptions", value: partnerData.stats.totalSignups, icon: UserPlus },
    { label: "Clients payants", value: partnerData.stats.totalPayingUsers, icon: CreditCard },
    { label: "Revenus générés", value: `${partnerData.stats.revenueGenerated.toLocaleString("fr-FR")} XOF`, icon: DollarSign },
  ];

  const commissionStats = [
    { label: "Commission gagnée", value: partnerData.stats.commissionEarned, highlight: true },
    { label: "Commission versée", value: partnerData.stats.commissionPaid },
    { label: "En attente", value: partnerData.stats.commissionPending },
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
                Commission: {partnerData.stats.commissionRate}% sur chaque vente
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
                  {partnerData.referralLink || "Chargement..."}
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
            </CardContent>
          </Card>

          {/* Stats Grid */}
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
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Commission Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Vos commissions
              </CardTitle>
              <Button 
                onClick={handleRequestPayout}
                disabled={partnerData.stats.commissionPending === 0}
              >
                <Clock className="h-4 w-4 mr-2" />
                Demander un versement
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {commissionStats.map((stat) => (
                  <div 
                    key={stat.label} 
                    className={`p-4 rounded-lg ${stat.highlight ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}
                  >
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.highlight ? "text-primary" : ""}`}>
                      {stat.value.toLocaleString("fr-FR")} XOF
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

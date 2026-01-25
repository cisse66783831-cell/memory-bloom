import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { 
  Camera, 
  Gift, 
  Copy, 
  Check, 
  AlertCircle, 
  Loader2,
  Users,
  Sparkles,
  Mail
} from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useReferralStats, useResendVerificationEmail } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: referralStats } = useReferralStats();
  const resendEmail = useResendVerificationEmail();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleCopyReferralLink = async () => {
    if (!profile?.referral_code) return;
    
    const referralLink = `${window.location.origin}/auth?ref=${profile.referral_code}`;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Lien copié !",
      description: "Partagez ce lien avec vos amis",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    
    try {
      await resendEmail.mutateAsync(user.email);
      toast({
        title: "Email envoyé !",
        description: "Vérifiez votre boîte de réception",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const firstName = profile?.first_name || user.email?.split("@")[0] || "Ami";
  const referralLink = profile?.referral_code 
    ? `${window.location.origin}/auth?ref=${profile.referral_code}` 
    : "";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              Bonjour, {firstName} !
            </h1>
            <p className="text-muted-foreground mt-2">
              Bienvenue sur votre espace REVIVO
            </p>
          </div>

          {/* Email Verification Banner */}
          {!profile?.email_verified && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Vérifiez votre email
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Pour activer les récompenses de parrainage
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                disabled={resendEmail.isPending}
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                {resendEmail.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Renvoyer l'email
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Free Generations Balance */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Restaurations gratuites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary">
                  {profile?.free_generations_balance || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  disponible{(profile?.free_generations_balance || 0) !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            {/* Referrals Count */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Parrainages réussis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {referralStats?.successfulReferrals || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  ami{(referralStats?.successfulReferrals || 0) !== 1 ? "s" : ""} invité{(referralStats?.successfulReferrals || 0) !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            {/* Generations Earned */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Générations gagnées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {referralStats?.generationsEarned || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  via parrainage
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main CTA */}
          <Card className="mb-8 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center">
                  <Camera className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-semibold">
                    Prêt à restaurer une photo ?
                  </h2>
                  <p className="text-muted-foreground">
                    Redonnez vie à vos souvenirs en quelques clics
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <Link to="/">
                  <Camera className="h-5 w-5 mr-2" />
                  Restaurer une photo
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Referral Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Invitez vos amis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Partagez votre lien de parrainage et gagnez une restauration gratuite 
                pour chaque ami qui effectue son premier achat.
              </p>

              {/* Referral Code */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Badge variant="outline" className="text-base font-mono px-3 py-1">
                  {profile?.referral_code || "..."}
                </Badge>
                <span className="text-muted-foreground text-sm">
                  Votre code de parrainage
                </span>
              </div>

              {/* Referral Link */}
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                  {referralLink || "Chargement..."}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyReferralLink}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="pt-2 border-t">
                <h4 className="font-medium mb-2">Comment ça marche ?</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Partagez votre lien avec vos proches</li>
                  <li>Ils créent un compte REVIVO</li>
                  <li>Quand ils effectuent leur premier achat, vous gagnez 1 restauration gratuite</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

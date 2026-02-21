import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Camera, AlertCircle, Loader2, Mail, MessageCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useReferralStats, useResendVerificationEmail } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ActiveSubscription } from "@/components/dashboard/ActiveSubscription";
import { PhotosSection } from "@/components/dashboard/PhotosSection";
import { ReferralSection } from "@/components/dashboard/ReferralSection";
import { PaymentsHistory } from "@/components/dashboard/PaymentsHistory";
import { AccountInfo } from "@/components/dashboard/AccountInfo";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: referralStats } = useReferralStats();
  const resendEmail = useResendVerificationEmail();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
                Bonjour, {firstName} !
              </h1>
              <p className="text-muted-foreground mt-1">
                Bienvenue sur votre espace REVIVO
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Générations gratuites disponibles:
              </span>
              <span className="text-2xl font-bold text-primary">
                {profile?.free_generations_balance || 0}
              </span>
            </div>
          </div>

          {/* Email Verification Banner */}
          {!profile?.email_verified && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between gap-4 flex-wrap"
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

          {/* Main CTA */}
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
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
                <Link to="/?restore=1">
                  <Camera className="h-5 w-5 mr-2" />
                  Restaurer une nouvelle photo
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* WhatsApp Community */}
          <div className="flex justify-center">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a
                href="https://chat.whatsapp.com/CUK9SFfWaDU6MEsbzjbNCg?mode=gi_t"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Rejoindre la communauté WhatsApp
              </a>
            </Button>
          </div>

          {/* Active Subscription */}
          <ActiveSubscription />

          {/* Stats Cards */}
          <DashboardStats
            freeGenerations={profile?.free_generations_balance || 0}
            successfulReferrals={referralStats?.successfulReferrals || 0}
            generationsEarned={referralStats?.generationsEarned || 0}
            generationsUsed={0}
          />

          {/* Tabbed Content */}
          <Tabs defaultValue="photos" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 max-w-lg">
              <TabsTrigger value="photos">Mes photos</TabsTrigger>
              <TabsTrigger value="referral">Parrainage</TabsTrigger>
              <TabsTrigger value="payments">Paiements</TabsTrigger>
              <TabsTrigger value="account">Compte</TabsTrigger>
            </TabsList>

            <TabsContent value="photos">
              <PhotosSection />
            </TabsContent>

            <TabsContent value="referral">
              <ReferralSection
                referralCode={profile?.referral_code || null}
                totalInvited={referralStats?.totalReferrals || 0}
                successfulReferrals={referralStats?.successfulReferrals || 0}
                generationsEarned={referralStats?.generationsEarned || 0}
                generationsUsed={0}
              />
            </TabsContent>

            <TabsContent value="payments">
              <PaymentsHistory />
            </TabsContent>

            <TabsContent value="account">
              <AccountInfo profile={profile || null} email={user?.email} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Camera, Loader2, MessageCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useReferralStats } from "@/hooks/useProfile";

import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ActiveSubscription } from "@/components/dashboard/ActiveSubscription";
import { PhotosSection } from "@/components/dashboard/PhotosSection";
import { ReferralSection } from "@/components/dashboard/ReferralSection";
import { PaymentsHistory } from "@/components/dashboard/PaymentsHistory";
import { AccountInfo } from "@/components/dashboard/AccountInfo";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const profileQuery = useProfile();
  const profile = profileQuery.data;
  const profileLoading = profileQuery.isLoading;
  const { data: referralStats } = useReferralStats();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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
                onCodeUpdated={() => profileQuery.refetch()}
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

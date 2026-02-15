import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, LayoutDashboard, Users, Image, CreditCard, Gift, Tag, TrendingUp, Building2, Loader2 } from "lucide-react";
import { AdminKPICards } from "@/components/admin/AdminKPICards";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { AdminPhotosTable } from "@/components/admin/AdminPhotosTable";
import { AdminPaymentsTable } from "@/components/admin/AdminPaymentsTable";
import { AdminReferralsTable } from "@/components/admin/AdminReferralsTable";
import { AdminPromoCodes } from "@/components/admin/AdminPromoCodes";
import { AdminPartnersTable } from "@/components/admin/AdminPartnersTable";
import { AdminFinancialInsights } from "@/components/admin/AdminFinancialInsights";
import { format, subDays, startOfMonth, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Restoration {
  id: string;
  created_at: string;
  status: string;
  is_paid: boolean;
  user_id: string | null;
  session_id: string;
  preview_image_path: string | null;
  restored_image_path: string | null;
}

interface Payment {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  restoration_id: string;
  deposit_method?: string | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  email_verified: boolean;
  referral_code: string | null;
  referred_by_user_id: string | null;
  free_generations_balance: number;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [restorations, setRestorations] = useState<Restoration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, user, navigate]);

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setLoadingData(true);
      const [restorationsRes, paymentsRes, usersRes] = await Promise.all([
        supabase
          .from("photo_restorations")
          .select("id, created_at, status, is_paid, user_id, session_id, preview_image_path, restored_image_path")
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id, created_at, amount, currency, status, provider, restoration_id, deposit_method")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (restorationsRes.data) setRestorations(restorationsRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
      if (usersRes.data) setUsers(usersRes.data as UserProfile[]);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoadingData(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  // Memoized calculations
  const kpiData = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const monthStart = startOfMonth(now);
    const thirtyDaysAgo = subDays(now, 30);

    const completedPayments = payments.filter((p) => p.status === "completed");
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const revenueToday = completedPayments
      .filter((p) => new Date(p.created_at) >= today)
      .reduce((sum, p) => sum + p.amount, 0);
    const revenueThisMonth = completedPayments
      .filter((p) => new Date(p.created_at) >= monthStart)
      .reduce((sum, p) => sum + p.amount, 0);

    const activeUsers = users.filter(
      (u) => new Date(u.created_at) >= thirtyDaysAgo
    ).length;

    const totalReferralRewards = users.reduce(
      (sum, u) => sum + u.free_generations_balance,
      0
    );

    // Estimate: 50 XOF per AI processing
    const estimatedAICost = restorations.filter((r) => r.status === "completed").length * 50;
    const estimatedGrossProfit = totalRevenue - estimatedAICost;

    return {
      totalUsers: users.length,
      activeUsers,
      totalPhotos: restorations.length,
      totalRevenue,
      revenueToday,
      revenueThisMonth,
      totalReferralRewards,
      estimatedAICost,
      estimatedGrossProfit,
    };
  }, [users, payments, restorations]);

  const financialData = useMemo(() => {
    const completedPayments = payments.filter((p) => p.status === "completed");

    // Revenue by day (last 7 days)
    const revenueByDay = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = subDays(startOfDay(date), -1);
      const amount = completedPayments
        .filter((p) => {
          const pDate = new Date(p.created_at);
          return pDate >= dayStart && pDate < dayEnd;
        })
        .reduce((sum, p) => sum + p.amount, 0);
      revenueByDay.push({
        date: format(date, "dd MMM", { locale: fr }),
        amount,
      });
    }

    // Conversion rate
    const previewsReady = restorations.filter(
      (r) => r.preview_image_path || r.status === "completed"
    ).length;
    const paidRestorations = restorations.filter((r) => r.is_paid).length;
    const conversionRate = previewsReady > 0 ? (paidRestorations / previewsReady) * 100 : 0;

    // ARPU
    const arpu = users.length > 0 ? kpiData.totalRevenue / users.length : 0;

    // Gross margin
    const grossMargin =
      kpiData.totalRevenue > 0
        ? ((kpiData.totalRevenue - kpiData.estimatedAICost) / kpiData.totalRevenue) * 100
        : 0;

    return {
      revenueByDay,
      revenueByMonth: [],
      conversionRate,
      arpu,
      estimatedAICostPerMonth: kpiData.estimatedAICost,
      grossMargin,
    };
  }, [payments, restorations, users, kpiData]);

  const referralData = useMemo(() => {
    const referrals = users
      .filter((u) => u.referred_by_user_id)
      .map((referred) => {
        const referrer = users.find((u) => u.user_id === referred.referred_by_user_id);
        const userRestorations = restorations.filter(
          (r) => r.user_id === referred.user_id && r.is_paid
        );
        return {
          referrer: referrer || {
            id: "",
            first_name: "Inconnu",
            last_name: "",
            email: null,
          },
          referred: {
            id: referred.id,
            first_name: referred.first_name,
            last_name: referred.last_name,
            email: referred.email,
            created_at: referred.created_at,
          },
          hasPaid: userRestorations.length > 0,
          rewardGranted: userRestorations.length > 0 && (referrer?.email_verified ?? false),
        };
      });

    const stats = {
      totalReferrals: referrals.length,
      successfulReferrals: referrals.filter((r) => r.hasPaid).length,
      totalRewardsGiven: referrals.filter((r) => r.rewardGranted).length,
      estimatedCost: referrals.filter((r) => r.rewardGranted).length * 500, // 500 XOF value per free generation
    };

    return { referrals, stats };
  }, [users, restorations]);

  // Helper functions
  const getUserTotalPayments = useCallback(
    (userId: string) => {
      const userRestorations = restorations.filter(
        (r) => r.user_id === userId && r.is_paid
      );
      const restorationIds = userRestorations.map((r) => r.id);
      return payments
        .filter((p) => restorationIds.includes(p.restoration_id) && p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0);
    },
    [restorations, payments]
  );

  const getReferrerName = useCallback(
    (referredByUserId: string | null) => {
      if (!referredByUserId) return "—";
      const referrer = users.find((u) => u.user_id === referredByUserId);
      if (!referrer) return referredByUserId.slice(0, 8) + "...";
      const name = `${referrer.first_name || ""} ${referrer.last_name || ""}`.trim();
      return name || referrer.email || "—";
    },
    [users]
  );

  const getUserName = useCallback(
    (userId: string | null) => {
      if (!userId) return "Anonyme";
      const user = users.find((u) => u.user_id === userId);
      if (!user) return userId.slice(0, 8) + "...";
      const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
      return name || user.email || "—";
    },
    [users]
  );

  const getUserForRestoration = useCallback(
    (restorationId: string) => {
      const restoration = restorations.find((r) => r.id === restorationId);
      return getUserName(restoration?.user_id || null);
    },
    [restorations, getUserName]
  );

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

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
          {/* Header */}
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-heading text-3xl font-bold">Administration REVIVO</h1>
              <p className="text-muted-foreground">Tableau de bord complet</p>
            </div>
          </div>

          {/* KPI Cards */}
          <AdminKPICards data={kpiData} isLoading={loadingData} />

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="flex items-center gap-1.5">
                <LayoutDashboard className="h-4 w-4" />
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Utilisateurs
              </TabsTrigger>
              <TabsTrigger value="photos" className="flex items-center gap-1.5">
                <Image className="h-4 w-4" />
                Photos
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" />
                Paiements
              </TabsTrigger>
              <TabsTrigger value="referrals" className="flex items-center gap-1.5">
                <Gift className="h-4 w-4" />
                Parrainages
              </TabsTrigger>
              <TabsTrigger value="promos" className="flex items-center gap-1.5">
                <Tag className="h-4 w-4" />
                Codes promo
              </TabsTrigger>
              <TabsTrigger value="finances" className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                Finances
              </TabsTrigger>
              <TabsTrigger value="partners" className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Partenaires
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-6">
                <AdminFinancialInsights data={financialData} />
              </div>
            </TabsContent>

            <TabsContent value="users">
              <AdminUsersTable
                users={users}
                isLoading={loadingData}
                onRefresh={fetchData}
                getUserTotalPayments={getUserTotalPayments}
                getReferrerName={getReferrerName}
              />
            </TabsContent>

            <TabsContent value="photos">
              <AdminPhotosTable
                photos={restorations}
                isLoading={loadingData}
                getUserName={getUserName}
              />
            </TabsContent>

            <TabsContent value="payments">
              <AdminPaymentsTable
                payments={payments}
                isLoading={loadingData}
                getUserForRestoration={getUserForRestoration}
                onRefresh={fetchData}
              />
            </TabsContent>

            <TabsContent value="referrals">
              <AdminReferralsTable />
            </TabsContent>

            <TabsContent value="promos">
              <AdminPromoCodes />
            </TabsContent>

            <TabsContent value="finances">
              <AdminFinancialInsights data={financialData} />
            </TabsContent>

            <TabsContent value="partners">
              <AdminPartnersTable />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default Admin;

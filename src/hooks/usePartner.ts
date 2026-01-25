import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PartnerStats {
  totalSignups: number;
  totalPayingUsers: number;
  revenueGenerated: number;
  commissionEarned: number;
  commissionPaid: number;
  commissionPending: number;
}

export interface PartnerCommission {
  id: string;
  payment_id: string;
  commission_amount: number;
  status: "pending" | "paid";
  created_at: string;
}

export interface PartnerPayout {
  id: string;
  amount: number;
  status: "requested" | "approved" | "paid";
  requested_at: string;
  approved_at: string | null;
  paid_at: string | null;
}

export function usePartnerStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["partner-status", user?.id],
    queryFn: async () => {
      if (!user?.id) return { isPartner: false, partnerCode: null };

      const { data, error } = await supabase
        .from("profiles")
        .select("is_partner, partner_code, partner_commission_balance")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      return {
        isPartner: data?.is_partner || false,
        partnerCode: data?.partner_code || null,
        commissionBalance: data?.partner_commission_balance || 0,
      };
    },
    enabled: !!user?.id,
  });
}

export function usePartnerStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["partner-stats", user?.id],
    queryFn: async (): Promise<PartnerStats> => {
      if (!user?.id) {
        return {
          totalSignups: 0,
          totalPayingUsers: 0,
          revenueGenerated: 0,
          commissionEarned: 0,
          commissionPaid: 0,
          commissionPending: 0,
        };
      }

      // Count users referred by this partner
      const { count: totalSignups } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by_user_id", user.id);

      // Get commissions
      const { data: commissions } = await supabase
        .from("partner_commissions")
        .select("commission_amount, status")
        .eq("partner_user_id", user.id);

      const totalPayingUsers = commissions?.length || 0;
      const commissionEarned = commissions?.reduce((sum, c) => sum + c.commission_amount, 0) || 0;
      const commissionPaid = commissions?.filter(c => c.status === "paid").reduce((sum, c) => sum + c.commission_amount, 0) || 0;
      const commissionPending = commissions?.filter(c => c.status === "pending").reduce((sum, c) => sum + c.commission_amount, 0) || 0;

      // Estimate revenue (each commission = 1 payment of 1000 XOF)
      const revenueGenerated = totalPayingUsers * 1000;

      return {
        totalSignups: totalSignups || 0,
        totalPayingUsers,
        revenueGenerated,
        commissionEarned,
        commissionPaid,
        commissionPending,
      };
    },
    enabled: !!user?.id,
  });
}

export function usePartnerCommissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["partner-commissions", user?.id],
    queryFn: async (): Promise<PartnerCommission[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("partner_commissions")
        .select("*")
        .eq("partner_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as PartnerCommission[];
    },
    enabled: !!user?.id,
  });
}

export function usePartnerPayouts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["partner-payouts", user?.id],
    queryFn: async (): Promise<PartnerPayout[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("partner_payouts")
        .select("*")
        .eq("partner_user_id", user.id)
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return (data || []) as PartnerPayout[];
    },
    enabled: !!user?.id,
  });
}

export function useRequestPayout() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("partner_payouts")
        .insert({
          partner_user_id: user.id,
          amount,
          status: "requested",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-payouts", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["partner-stats", user?.id] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PartnerData {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_partner: boolean;
  partner_code: string | null;
  partner_commission_balance: number;
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
}

export interface PartnerPayoutRequest {
  id: string;
  partner_user_id: string;
  amount: number;
  status: "requested" | "approved" | "paid";
  requested_at: string;
  approved_at: string | null;
  paid_at: string | null;
  partner?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export function useAdminPartners() {
  return useQuery({
    queryKey: ["admin-partners"],
    queryFn: async (): Promise<PartnerData[]> => {
      // Get all partners
      const { data: partners, error } = await supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, is_partner, partner_code, partner_commission_balance")
        .eq("is_partner", true);

      if (error) throw error;

      // Get commissions for each partner
      const partnersWithStats = await Promise.all(
        (partners || []).map(async (partner) => {
          const { data: commissions } = await supabase
            .from("partner_commissions")
            .select("commission_amount, status")
            .eq("partner_user_id", partner.user_id);

          const totalCommissions = commissions?.reduce((sum, c) => sum + c.commission_amount, 0) || 0;
          const pendingCommissions = commissions?.filter(c => c.status === "pending").reduce((sum, c) => sum + c.commission_amount, 0) || 0;
          const paidCommissions = commissions?.filter(c => c.status === "paid").reduce((sum, c) => sum + c.commission_amount, 0) || 0;

          return {
            ...partner,
            totalCommissions,
            pendingCommissions,
            paidCommissions,
          };
        })
      );

      return partnersWithStats;
    },
  });
}

export function useAdminPartnerPayouts() {
  return useQuery({
    queryKey: ["admin-partner-payouts"],
    queryFn: async (): Promise<PartnerPayoutRequest[]> => {
      const { data, error } = await supabase
        .from("partner_payouts")
        .select(`
          *,
          partner:partner_user_id(first_name, last_name, email)
        `)
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return (data || []) as PartnerPayoutRequest[];
    },
  });
}

export function usePromoteToPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, moderatorId }: { userId: string; moderatorId?: string }) => {
      const { error } = await supabase.rpc("promote_to_partner", {
        target_user_id: userId,
        moderator_id: moderatorId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useRevokePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_partner: false,
        })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useApprovePartnerPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payoutId: string) => {
      const { error } = await supabase
        .from("partner_payouts")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partner-payouts"] });
    },
  });
}

export function useMarkPayoutPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payoutId, partnerUserId, amount }: { payoutId: string; partnerUserId: string; amount: number }) => {
      // Mark payout as paid
      const { error: payoutError } = await supabase
        .from("partner_payouts")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      if (payoutError) throw payoutError;

      // Deduct from partner balance
      const { data: partner } = await supabase
        .from("profiles")
        .select("partner_commission_balance")
        .eq("user_id", partnerUserId)
        .single();

      const newBalance = Math.max(0, (partner?.partner_commission_balance || 0) - amount);

      const { error: balanceError } = await supabase
        .from("profiles")
        .update({ partner_commission_balance: newBalance })
        .eq("user_id", partnerUserId);

      if (balanceError) throw balanceError;

      // Mark corresponding commissions as paid
      await supabase
        .from("partner_commissions")
        .update({ status: "paid" })
        .eq("partner_user_id", partnerUserId)
        .eq("status", "pending");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partner-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    },
  });
}

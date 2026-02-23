import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useModeratorPartners() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["moderator-partners", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get partners recruited by this moderator
      const { data: partners, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, partner_code, created_at")
        .eq("recruited_by_moderator_id", user!.id)
        .eq("is_partner", true);

      if (error) throw error;

      // For each partner, get referral signups count and payment count (NOT amounts)
      const partnersWithStats = await Promise.all(
        (partners || []).map(async (partner) => {
          // Count referrals made by this partner's referral code users
          const { count: signupsCount } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("referred_by_user_id", partner.user_id);

          // Count payments from referred users (not amounts)
          const { data: referredUsers } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("referred_by_user_id", partner.user_id);

          const referredUserIds = referredUsers?.map((u) => u.user_id) || [];

          let paymentsCount = 0;
          if (referredUserIds.length > 0) {
            // Get restorations from referred users
            const { data: restorations } = await supabase
              .from("photo_restorations")
              .select("id")
              .in("user_id", referredUserIds)
              .eq("is_paid", true);

            paymentsCount = restorations?.length || 0;
          }

          return {
            ...partner,
            signupsCount: signupsCount || 0,
            paymentsCount,
          };
        })
      );

      return partnersWithStats;
    },
  });
}

export function useModeratorCommissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["moderator-commissions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderator_commissions")
        .select("*")
        .eq("moderator_user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useModeratorPayouts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["moderator-payouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderator_payouts")
        .select("*")
        .eq("moderator_user_id", user!.id)
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useRequestModeratorPayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase.from("moderator_payouts").insert({
        moderator_user_id: user!.id,
        amount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderator-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["moderator-commissions"] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useModeratorPartners() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["moderator-partners", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get ALL users recruited by this moderator (not just partners)
      const { data: recruits, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, partner_code, is_partner, created_at")
        .eq("recruited_by_moderator_id", user!.id);

      if (error) throw error;

      // For each recruit, get referral signups count and payment count
      const recruitsWithStats = await Promise.all(
        (recruits || []).map(async (recruit) => {
          const { count: signupsCount } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("referred_by_user_id", recruit.user_id);

          const { data: referredUsers } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("referred_by_user_id", recruit.user_id);

          const referredUserIds = referredUsers?.map((u) => u.user_id) || [];

          let paymentsCount = 0;
          if (referredUserIds.length > 0) {
            const { data: restorations } = await supabase
              .from("photo_restorations")
              .select("id")
              .in("user_id", referredUserIds)
              .eq("is_paid", true);

            paymentsCount = restorations?.length || 0;
          }

          return {
            ...recruit,
            is_partner: recruit.is_partner || false,
            signupsCount: signupsCount || 0,
            paymentsCount,
          };
        })
      );

      return recruitsWithStats;
    },
  });
}

export function usePromoteToPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("promote_to_partner", {
        target_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderator-partners"] });
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

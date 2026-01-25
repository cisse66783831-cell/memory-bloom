import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  payment_id: string | null;
  reward_type: "free_generation" | "partner_commission";
  reward_amount: number;
  created_at: string;
}

export interface ReferralWithDetails extends Referral {
  referrer: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  referred: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export function useUserReferrals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-referrals", user?.id],
    queryFn: async (): Promise<Referral[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Referral[];
    },
    enabled: !!user?.id,
  });
}

export function useAdminReferrals() {
  return useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async (): Promise<ReferralWithDetails[]> => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profile details separately to avoid ambiguous relationship
      const referrals = data || [];
      const enriched = await Promise.all(
        referrals.map(async (ref) => {
          const { data: referrer } = await supabase
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("user_id", ref.referrer_user_id)
            .single();
          
          const { data: referred } = await supabase
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("user_id", ref.referred_user_id)
            .single();

          return {
            ...ref,
            referrer: referrer || { first_name: null, last_name: null, email: null },
            referred: referred || { first_name: null, last_name: null, email: null },
          };
        })
      );
      
      return enriched as ReferralWithDetails[];
    },
  });
}

export function useReferralStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referral-stats-detailed", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
          totalInvited: 0,
          successfulReferrals: 0,
          generationsEarned: 0,
          generationsUsed: 0,
        };
      }

      // Count total invited
      const { count: totalInvited } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by_user_id", user.id);

      // Count successful referrals (with payment)
      const { data: referrals } = await supabase
        .from("referrals")
        .select("reward_amount")
        .eq("referrer_user_id", user.id)
        .eq("reward_type", "free_generation");

      const successfulReferrals = referrals?.length || 0;
      const generationsEarned = referrals?.reduce((sum, r) => sum + r.reward_amount, 0) || 0;

      // Get current balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("free_generations_balance")
        .eq("user_id", user.id)
        .single();

      // Calculate used = earned - remaining
      const generationsUsed = Math.max(0, generationsEarned - (profile?.free_generations_balance || 0));

      return {
        totalInvited: totalInvited || 0,
        successfulReferrals,
        generationsEarned,
        generationsUsed,
      };
    },
    enabled: !!user?.id,
  });
}

export function useAdminReferralStats() {
  return useQuery({
    queryKey: ["admin-referral-stats"],
    queryFn: async () => {
      // Count all referrals
      const { count: totalReferrals } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .not("referred_by_user_id", "is", null);

      // Get all referral rewards
      const { data: rewards } = await supabase
        .from("referrals")
        .select("reward_type, reward_amount")
        .eq("reward_type", "free_generation");

      const totalFreeGenerations = rewards?.reduce((sum, r) => sum + r.reward_amount, 0) || 0;
      const successfulReferrals = rewards?.filter(r => r.reward_amount > 0).length || 0;

      // Estimate cost (each free generation = 1000 XOF value, ~50 XOF AI cost)
      const estimatedCost = totalFreeGenerations * 50;

      return {
        totalReferrals: totalReferrals || 0,
        successfulReferrals,
        totalRewardsGiven: totalFreeGenerations,
        estimatedCost,
      };
    },
  });
}

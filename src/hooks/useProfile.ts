import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  referral_code: string | null;
  referred_by_user_id: string | null;
  free_generations_balance: number;
  avatar_url: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  generationsEarned: number;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }

      return data as Profile;
    },
    enabled: !!user?.id,
  });
}

export function useReferralStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referral-stats", user?.id],
    queryFn: async (): Promise<ReferralStats> => {
      if (!user?.id) {
        return { totalReferrals: 0, successfulReferrals: 0, generationsEarned: 0 };
      }

      // Count users who were referred by this user
      const { count: totalReferrals, error: countError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by_user_id", user.id);

      if (countError) {
        console.error("Error counting referrals:", countError);
      }

      // Get current user's profile for free generations balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("free_generations_balance")
        .eq("user_id", user.id)
        .single();

      return {
        totalReferrals: totalReferrals || 0,
        successfulReferrals: totalReferrals || 0, // For now, same as total
        generationsEarned: profile?.free_generations_balance || 0,
      };
    },
    enabled: !!user?.id,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}

export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) throw error;
      return true;
    },
  });
}

export function useLookupReferralCode() {
  return useMutation({
    mutationFn: async (referralCode: string): Promise<{ userId: string } | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", referralCode.toUpperCase())
        .single();

      if (error || !data) {
        return null;
      }

      return { userId: data.user_id };
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PromoCode {
  id: string;
  code: string;
  discount_amount: number;
  usage_limit: number | null;
  usage_count: number;
  expires_at: string | null;
  is_active: boolean;
  new_users_only: boolean;
  linked_partner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromoCodeUse {
  id: string;
  promo_code_id: string;
  user_id: string;
  payment_id: string | null;
  created_at: string;
}

export function usePromoCodes() {
  return useQuery({
    queryKey: ["promo-codes"],
    queryFn: async (): Promise<PromoCode[]> => {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as PromoCode[];
    },
  });
}

export function usePromoCodeUses(promoCodeId?: string) {
  return useQuery({
    queryKey: ["promo-code-uses", promoCodeId],
    queryFn: async (): Promise<PromoCodeUse[]> => {
      let query = supabase.from("promo_code_uses").select("*");
      
      if (promoCodeId) {
        query = query.eq("promo_code_id", promoCodeId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as PromoCodeUse[];
    },
    enabled: promoCodeId !== undefined,
  });
}

export function useValidatePromoCode() {
  return useMutation({
    mutationFn: async (code: string): Promise<{ valid: boolean; discount: number; message?: string }> => {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", code.toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return { valid: false, discount: 0, message: "Code invalide" };
      }

      const promo = data as PromoCode;

      // Check if expired
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return { valid: false, discount: 0, message: "Code expiré" };
      }

      // Check usage limit
      if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
        return { valid: false, discount: 0, message: "Code épuisé" };
      }

      return { valid: true, discount: promo.discount_amount };
    },
  });
}

export function useCreatePromoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promoData: {
      code: string;
      discount_amount: number;
      usage_limit?: number;
      expires_at?: string;
      new_users_only?: boolean;
      linked_partner_user_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("promo_codes")
        .insert({
          ...promoData,
          code: promoData.code.toUpperCase(),
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
    },
  });
}

export function useUpdatePromoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PromoCode> }) => {
      const { data, error } = await supabase
        .from("promo_codes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
    },
  });
}

export function useDeletePromoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("promo_codes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
    },
  });
}

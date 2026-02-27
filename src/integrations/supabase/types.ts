export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_models_config: {
        Row: {
          admin_boost: boolean
          avg_rating: number
          conversion_rate: number
          cost_per_run: number
          created_at: string
          current_score: number
          id: string
          is_active: boolean
          name: string
          replicate_id: string
          status: string
          system_prompt: string | null
          total_runs: number
          updated_at: string
        }
        Insert: {
          admin_boost?: boolean
          avg_rating?: number
          conversion_rate?: number
          cost_per_run?: number
          created_at?: string
          current_score?: number
          id: string
          is_active?: boolean
          name: string
          replicate_id: string
          status?: string
          system_prompt?: string | null
          total_runs?: number
          updated_at?: string
        }
        Update: {
          admin_boost?: boolean
          avg_rating?: number
          conversion_rate?: number
          cost_per_run?: number
          created_at?: string
          current_score?: number
          id?: string
          is_active?: boolean
          name?: string
          replicate_id?: string
          status?: string
          system_prompt?: string | null
          total_runs?: number
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      deposit_instructions: {
        Row: {
          account_name: string | null
          created_at: string
          display_order: number
          id: string
          instructions: string | null
          is_active: boolean
          method_icon: string | null
          method_name: string
          phone_number: string | null
        }
        Insert: {
          account_name?: string | null
          created_at?: string
          display_order?: number
          id?: string
          instructions?: string | null
          is_active?: boolean
          method_icon?: string | null
          method_name: string
          phone_number?: string | null
        }
        Update: {
          account_name?: string | null
          created_at?: string
          display_order?: number
          id?: string
          instructions?: string | null
          is_active?: boolean
          method_icon?: string | null
          method_name?: string
          phone_number?: string | null
        }
        Relationships: []
      }
      moderator_commissions: {
        Row: {
          commission_amount: number
          created_at: string
          id: string
          moderator_user_id: string
          partner_user_id: string
          reason: string
          status: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          id?: string
          moderator_user_id: string
          partner_user_id: string
          reason: string
          status?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          id?: string
          moderator_user_id?: string
          partner_user_id?: string
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderator_commissions_moderator_user_id_fkey"
            columns: ["moderator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "moderator_commissions_partner_user_id_fkey"
            columns: ["partner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      moderator_payouts: {
        Row: {
          amount: number
          approved_at: string | null
          id: string
          moderator_user_id: string
          paid_at: string | null
          requested_at: string
          status: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          id?: string
          moderator_user_id: string
          paid_at?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          id?: string
          moderator_user_id?: string
          paid_at?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderator_payouts_moderator_user_id_fkey"
            columns: ["moderator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      optimization_logs: {
        Row: {
          created_at: string
          id: string
          message: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      partner_commissions: {
        Row: {
          commission_amount: number
          created_at: string
          id: string
          partner_user_id: string
          payment_id: string
          status: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          id?: string
          partner_user_id: string
          payment_id: string
          status?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          id?: string
          partner_user_id?: string
          payment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_partner_user_id_fkey"
            columns: ["partner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "partner_commissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payouts: {
        Row: {
          amount: number
          approved_at: string | null
          id: string
          paid_at: string | null
          partner_user_id: string
          requested_at: string
          status: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          id?: string
          paid_at?: string | null
          partner_user_id: string
          requested_at?: string
          status?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          id?: string
          paid_at?: string | null
          partner_user_id?: string
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_user_id_fkey"
            columns: ["partner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payments: {
        Row: {
          admin_validated_at: string | null
          admin_validated_by: string | null
          amount: number
          created_at: string
          currency: string
          deposit_method: string | null
          id: string
          provider: string | null
          provider_reference: string | null
          restoration_id: string
          sender_phone: string | null
          status: string
        }
        Insert: {
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          amount: number
          created_at?: string
          currency?: string
          deposit_method?: string | null
          id?: string
          provider?: string | null
          provider_reference?: string | null
          restoration_id: string
          sender_phone?: string | null
          status?: string
        }
        Update: {
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          amount?: number
          created_at?: string
          currency?: string
          deposit_method?: string | null
          id?: string
          provider?: string | null
          provider_reference?: string | null
          restoration_id?: string
          sender_phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_restoration_id_fkey"
            columns: ["restoration_id"]
            isOneToOne: false
            referencedRelation: "photo_restorations"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_restorations: {
        Row: {
          created_at: string
          id: string
          is_paid: boolean
          original_image_path: string
          payment_id: string | null
          pdf_path: string | null
          preview_image_path: string | null
          replicate_prediction_id: string | null
          restored_image_path: string | null
          session_id: string
          status: string
          trial_number: number
          updated_at: string
          used_model_id: string | null
          user_id: string | null
          user_rating: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_paid?: boolean
          original_image_path: string
          payment_id?: string | null
          pdf_path?: string | null
          preview_image_path?: string | null
          replicate_prediction_id?: string | null
          restored_image_path?: string | null
          session_id: string
          status?: string
          trial_number?: number
          updated_at?: string
          used_model_id?: string | null
          user_id?: string | null
          user_rating?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_paid?: boolean
          original_image_path?: string
          payment_id?: string | null
          pdf_path?: string | null
          preview_image_path?: string | null
          replicate_prediction_id?: string | null
          restored_image_path?: string | null
          session_id?: string
          status?: string
          trial_number?: number
          updated_at?: string
          used_model_id?: string | null
          user_id?: string | null
          user_rating?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          email_verified: boolean | null
          first_name: string | null
          free_generations_balance: number | null
          id: string
          is_partner: boolean | null
          last_name: string | null
          moderator_code: string | null
          partner_code: string | null
          partner_commission_balance: number | null
          phone_number: string | null
          phone_verified: boolean | null
          recruited_by_moderator_id: string | null
          referral_code: string | null
          referred_by_user_id: string | null
          signup_promo_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          free_generations_balance?: number | null
          id?: string
          is_partner?: boolean | null
          last_name?: string | null
          moderator_code?: string | null
          partner_code?: string | null
          partner_commission_balance?: number | null
          phone_number?: string | null
          phone_verified?: boolean | null
          recruited_by_moderator_id?: string | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          signup_promo_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          free_generations_balance?: number | null
          id?: string
          is_partner?: boolean | null
          last_name?: string | null
          moderator_code?: string | null
          partner_code?: string | null
          partner_commission_balance?: number | null
          phone_number?: string | null
          phone_verified?: boolean | null
          recruited_by_moderator_id?: string | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          signup_promo_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_recruited_by_moderator_id_fkey"
            columns: ["recruited_by_moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_user_id_fkey"
            columns: ["referred_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promo_code_uses: {
        Row: {
          created_at: string
          id: string
          payment_id: string | null
          promo_code_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id?: string | null
          promo_code_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string | null
          promo_code_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_uses_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_amount: number
          expires_at: string | null
          id: string
          is_active: boolean
          linked_partner_user_id: string | null
          new_users_only: boolean
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_amount?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          linked_partner_user_id?: string | null
          new_users_only?: boolean
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_amount?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          linked_partner_user_id?: string | null
          new_users_only?: boolean
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_linked_partner_user_id_fkey"
            columns: ["linked_partner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          payment_id: string | null
          referred_user_id: string
          referrer_user_id: string
          reward_amount: number
          reward_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id?: string | null
          referred_user_id: string
          referrer_user_id: string
          reward_amount?: number
          reward_type: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string | null
          referred_user_id?: string
          referrer_user_id?: string
          reward_amount?: number
          reward_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          name: string
          photo_count: number
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
          photo_count: number
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          photo_count?: number
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          payment_id: string | null
          photos_remaining: number
          plan_id: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          payment_id?: string | null
          photos_remaining: number
          plan_id: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          payment_id?: string | null
          photos_remaining?: number
          plan_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_moderator_code: { Args: never; Returns: string }
      generate_partner_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_monthly_referral_reward_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_moderator_code: { Args: { code: string }; Returns: string }
      lookup_partner_code: { Args: { code: string }; Returns: string }
      lookup_referral_code: { Args: { code: string }; Returns: string }
      promote_to_partner: {
        Args: { moderator_id?: string; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

-- Add partner fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_partner boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS partner_code text UNIQUE,
ADD COLUMN IF NOT EXISTS partner_commission_balance integer DEFAULT 0;

-- Create referrals tracking table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  referred_user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  payment_id uuid REFERENCES public.payments(id),
  reward_type text NOT NULL CHECK (reward_type IN ('free_generation', 'partner_commission')),
  reward_amount integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id, payment_id)
);

-- Create partner commissions table
CREATE TABLE public.partner_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  payment_id uuid NOT NULL REFERENCES public.payments(id),
  commission_amount integer NOT NULL DEFAULT 250,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(payment_id)
);

-- Create promo codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_amount integer NOT NULL DEFAULT 500,
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  new_users_only boolean NOT NULL DEFAULT false,
  linked_partner_user_id uuid REFERENCES public.profiles(user_id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create promo code uses table
CREATE TABLE public.promo_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  payment_id uuid REFERENCES public.payments(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(promo_code_id, user_id)
);

-- Create partner payouts table
CREATE TABLE public.partner_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'paid')),
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone,
  paid_at timestamp with time zone
);

-- Enable RLS on all new tables
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals" ON public.referrals
FOR SELECT USING (auth.uid() = referrer_user_id);

CREATE POLICY "Admins can view all referrals" ON public.referrals
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Backend can insert referrals" ON public.referrals
FOR INSERT WITH CHECK (true);

-- RLS Policies for partner_commissions
CREATE POLICY "Partners can view their own commissions" ON public.partner_commissions
FOR SELECT USING (auth.uid() = partner_user_id);

CREATE POLICY "Admins can view all commissions" ON public.partner_commissions
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Backend can insert commissions" ON public.partner_commissions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update commissions" ON public.partner_commissions
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for promo_codes
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for promo_code_uses
CREATE POLICY "Users can view their own promo uses" ON public.promo_code_uses
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all promo uses" ON public.promo_code_uses
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Backend can insert promo uses" ON public.promo_code_uses
FOR INSERT WITH CHECK (true);

-- RLS Policies for partner_payouts
CREATE POLICY "Partners can view their own payouts" ON public.partner_payouts
FOR SELECT USING (auth.uid() = partner_user_id);

CREATE POLICY "Partners can request payouts" ON public.partner_payouts
FOR INSERT WITH CHECK (auth.uid() = partner_user_id);

CREATE POLICY "Admins can manage payouts" ON public.partner_payouts
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate partner code
CREATE OR REPLACE FUNCTION generate_partner_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'PARTNER';
  i integer;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to count monthly referral rewards
CREATE OR REPLACE FUNCTION get_monthly_referral_reward_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.referrals
  WHERE referrer_user_id = p_user_id
    AND reward_type = 'free_generation'
    AND created_at >= date_trunc('month', now())
$$;

-- Trigger to update promo_codes updated_at
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
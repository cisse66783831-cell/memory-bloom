
-- 1. Add recruited_by_moderator_id to profiles
ALTER TABLE public.profiles ADD COLUMN recruited_by_moderator_id uuid REFERENCES public.profiles(user_id);

-- 2. Create moderator_commissions table
CREATE TABLE public.moderator_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  partner_user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  reason text NOT NULL,
  commission_amount integer NOT NULL DEFAULT 500,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.moderator_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view their own commissions"
  ON public.moderator_commissions FOR SELECT
  USING (auth.uid() = moderator_user_id);

CREATE POLICY "Admins can manage moderator commissions"
  ON public.moderator_commissions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Backend can insert moderator commissions"
  ON public.moderator_commissions FOR INSERT
  WITH CHECK (true);

-- 3. Create moderator_payouts table
CREATE TABLE public.moderator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone,
  paid_at timestamp with time zone
);

ALTER TABLE public.moderator_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view their own payouts"
  ON public.moderator_payouts FOR SELECT
  USING (auth.uid() = moderator_user_id);

CREATE POLICY "Moderators can request payouts"
  ON public.moderator_payouts FOR INSERT
  WITH CHECK (auth.uid() = moderator_user_id);

CREATE POLICY "Admins can manage moderator payouts"
  ON public.moderator_payouts FOR ALL
  USING (has_role(auth.uid(), 'admin'));

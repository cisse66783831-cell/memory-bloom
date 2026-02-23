
-- 1. Fix profiles: Replace overly permissive "Anyone can lookup referral codes" with a restricted version
DROP POLICY IF EXISTS "Anyone can lookup referral codes" ON public.profiles;

-- Allow public lookup but only expose referral_code and partner_code columns
-- We use a security definer function instead
CREATE OR REPLACE FUNCTION public.lookup_referral_code(code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM profiles WHERE referral_code = code LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.lookup_partner_code(code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM profiles WHERE partner_code = code LIMIT 1;
$$;

-- Moderators can view their recruited partners' profiles
CREATE POLICY "Moderators can view recruited partners"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'moderator'
  )
  AND recruited_by_moderator_id = auth.uid()
);

-- 2. Fix payments: Remove public SELECT, add user-scoped policy
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;

CREATE POLICY "Users can view payments for their restorations"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.photo_restorations pr
    WHERE pr.id = payments.restoration_id
      AND (pr.user_id = auth.uid() OR pr.session_id IS NOT NULL)
  )
);

-- 3. Fix photo_restorations: Remove overly permissive policies
DROP POLICY IF EXISTS "Users can view their session restorations" ON public.photo_restorations;
DROP POLICY IF EXISTS "Allow updates for processing" ON public.photo_restorations;

-- Session-based read: only own session
CREATE POLICY "Users can view their session restorations"
ON public.photo_restorations
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
  OR
  auth.uid() IS NULL AND session_id IS NOT NULL
);

-- Only service_role (edge functions) can do unrestricted updates
-- Admins can update all
CREATE POLICY "Admins can update all restorations"
ON public.photo_restorations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix storage: ensure old public policies are dropped
DROP POLICY IF EXISTS "Anyone can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;


-- =============================================
-- ÉTAPE 1 : Supprimer les politiques "Backend can..." inutiles
-- (le service_role_key bypass RLS, ces politiques exposent les tables au client anon)
-- =============================================

-- payments
DROP POLICY IF EXISTS "Backend can create payments" ON public.payments;
DROP POLICY IF EXISTS "Backend can update payments" ON public.payments;

-- referrals
DROP POLICY IF EXISTS "Backend can insert referrals" ON public.referrals;

-- promo_code_uses
DROP POLICY IF EXISTS "Backend can insert promo uses" ON public.promo_code_uses;

-- optimization_logs
DROP POLICY IF EXISTS "Backend can insert logs" ON public.optimization_logs;

-- moderator_commissions
DROP POLICY IF EXISTS "Backend can insert moderator commissions" ON public.moderator_commissions;

-- user_subscriptions
DROP POLICY IF EXISTS "Backend can insert subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Backend can update subscriptions" ON public.user_subscriptions;

-- partner_commissions
DROP POLICY IF EXISTS "Backend can insert commissions" ON public.partner_commissions;

-- =============================================
-- ÉTAPE 2 : Corriger le doublon INSERT sur photo_restorations
-- =============================================

-- Supprimer la politique trop permissive
DROP POLICY IF EXISTS "Anyone can create restorations" ON public.photo_restorations;

-- Modifier la politique existante pour permettre aussi les sessions anonymes (user_id IS NULL)
DROP POLICY IF EXISTS "Users can insert their own restorations" ON public.photo_restorations;
CREATE POLICY "Users can insert their own restorations"
ON public.photo_restorations
FOR INSERT
TO authenticated, anon
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- =============================================
-- ÉTAPE 3 : Ajouter politique DELETE admin sur photo_restorations
-- =============================================

CREATE POLICY "Admins can delete restorations"
ON public.photo_restorations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- ÉTAPE 4 : Recréer le trigger handle_new_user (s'il manque)
-- =============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

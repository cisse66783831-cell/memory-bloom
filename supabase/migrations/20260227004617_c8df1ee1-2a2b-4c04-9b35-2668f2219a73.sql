
-- 1. Add moderator_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS moderator_code text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_moderator_code_unique ON public.profiles (moderator_code) WHERE moderator_code IS NOT NULL;

-- 2. Create generate_moderator_code function
CREATE OR REPLACE FUNCTION public.generate_moderator_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'MOD';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$function$;

-- 3. Create lookup_moderator_code function (SECURITY DEFINER for public lookup)
CREATE OR REPLACE FUNCTION public.lookup_moderator_code(code text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT user_id FROM profiles WHERE moderator_code = code LIMIT 1;
$function$;

-- 4. Update handle_new_user trigger to capture moderator_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_referral_code text;
  meta jsonb;
  ref_user_id uuid;
  ref_code text;
  promo text;
  mod_code text;
  mod_user_id uuid;
BEGIN
  -- Generate a unique referral code
  LOOP
    new_referral_code := generate_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_referral_code);
  END LOOP;

  -- Read user metadata
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  -- Lookup referral code if provided
  ref_code := meta->>'referral_code';
  IF ref_code IS NOT NULL AND ref_code != '' THEN
    SELECT user_id INTO ref_user_id FROM profiles WHERE referral_code = UPPER(ref_code) LIMIT 1;
  END IF;

  -- Lookup moderator code if provided
  mod_code := meta->>'moderator_code';
  IF mod_code IS NOT NULL AND mod_code != '' THEN
    SELECT user_id INTO mod_user_id FROM profiles WHERE moderator_code = UPPER(mod_code) LIMIT 1;
  END IF;

  -- Get promo code
  promo := meta->>'promo_code';

  INSERT INTO public.profiles (
    user_id, 
    email, 
    referral_code, 
    email_verified,
    first_name,
    last_name,
    phone_number,
    referred_by_user_id,
    signup_promo_code,
    recruited_by_moderator_id
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    new_referral_code,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NULLIF(meta->>'first_name', ''),
    NULLIF(meta->>'last_name', ''),
    NULLIF(meta->>'phone_number', ''),
    ref_user_id,
    NULLIF(UPPER(promo), ''),
    mod_user_id
  );
  RETURN NEW;
END;
$function$;

-- 5. Generate moderator_code for existing moderators who don't have one
DO $$
DECLARE
  r RECORD;
  new_mod_code text;
BEGIN
  FOR r IN 
    SELECT ur.user_id 
    FROM user_roles ur 
    JOIN profiles p ON p.user_id = ur.user_id 
    WHERE ur.role = 'moderator' AND (p.moderator_code IS NULL OR p.moderator_code = '')
  LOOP
    LOOP
      new_mod_code := public.generate_moderator_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE moderator_code = new_mod_code);
    END LOOP;
    UPDATE profiles SET moderator_code = new_mod_code WHERE user_id = r.user_id;
  END LOOP;
END;
$$;

-- 6. Update RLS: moderators can see ALL users recruited via their link (not just partners)
DROP POLICY IF EXISTS "Moderators can view recruited partners" ON public.profiles;
CREATE POLICY "Moderators can view recruited users"
ON public.profiles
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'moderator'::app_role
  ))
  AND recruited_by_moderator_id = auth.uid()
);

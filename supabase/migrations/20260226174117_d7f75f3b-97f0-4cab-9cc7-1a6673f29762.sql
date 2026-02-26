
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

  INSERT INTO public.profiles (
    user_id, 
    email, 
    referral_code, 
    email_verified,
    first_name,
    last_name,
    phone_number,
    referred_by_user_id
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    new_referral_code,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NULLIF(meta->>'first_name', ''),
    NULLIF(meta->>'last_name', ''),
    NULLIF(meta->>'phone_number', ''),
    ref_user_id
  );
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.promote_to_partner(target_user_id uuid, moderator_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  new_partner_code text;
  is_admin boolean;
  is_mod boolean;
BEGIN
  -- Check caller roles
  is_admin := has_role(caller_id, 'admin');
  is_mod := has_role(caller_id, 'moderator');

  IF NOT is_admin AND NOT is_mod THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- If moderator, verify target was recruited by them
  IF is_mod AND NOT is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = target_user_id
      AND recruited_by_moderator_id = caller_id
    ) THEN
      RAISE EXCEPTION 'User not recruited by you';
    END IF;
    -- Force moderator_id to caller for moderators
    moderator_id := caller_id;
  END IF;

  -- Generate unique partner code
  LOOP
    new_partner_code := generate_partner_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE partner_code = new_partner_code);
  END LOOP;

  -- Promote user
  UPDATE profiles
  SET 
    is_partner = true, 
    partner_code = new_partner_code,
    recruited_by_moderator_id = COALESCE(moderator_id, recruited_by_moderator_id)
  WHERE user_id = target_user_id;
END;
$$;

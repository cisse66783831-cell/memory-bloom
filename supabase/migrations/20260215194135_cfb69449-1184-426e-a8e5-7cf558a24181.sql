INSERT INTO public.user_roles (user_id, role)
VALUES ('200bab34-0b0d-4d6f-bf3c-7689e2fa535c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
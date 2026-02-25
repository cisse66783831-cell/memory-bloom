-- Allow admins to manage user_roles (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default limit setting
INSERT INTO public.app_settings (key, value)
VALUES ('max_free_restorations', '2')
ON CONFLICT (key) DO NOTHING;
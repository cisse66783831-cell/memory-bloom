
-- Add deposit_method column to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS deposit_method text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS admin_validated_at timestamp with time zone;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS admin_validated_by uuid;

-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  photo_count integer NOT NULL,
  duration_days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  payment_id uuid REFERENCES public.payments(id),
  photos_remaining integer NOT NULL,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Backend can insert subscriptions"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update subscriptions"
  ON public.user_subscriptions FOR UPDATE
  USING (true);

-- Create deposit instructions table (configurable by admin)
CREATE TABLE public.deposit_instructions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  method_name text NOT NULL,
  method_icon text,
  phone_number text,
  account_name text,
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.deposit_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active deposit instructions"
  ON public.deposit_instructions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage deposit instructions"
  ON public.deposit_instructions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default deposit instructions
INSERT INTO public.deposit_instructions (method_name, method_icon, phone_number, account_name, instructions, display_order) VALUES
  ('Orange Money', 'orange', '', '', 'Envoyez le montant par Orange Money au numéro indiqué', 1),
  ('Wave', 'wave', '', '', 'Envoyez le montant par Wave au numéro indiqué', 2),
  ('MTN Money', 'mtn', '', '', 'Envoyez le montant par MTN Money au numéro indiqué', 3),
  ('Moov Money', 'moov', '', '', 'Envoyez le montant par Moov Money au numéro indiqué', 4);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price, photo_count, duration_days) VALUES
  ('Pack 5 Photos', 'Restaurez 5 photos à prix réduit', 4000, 5, 30),
  ('Pack 10 Photos', 'Restaurez 10 photos - meilleur rapport qualité/prix', 7000, 10, 30),
  ('Pack 20 Photos', 'Restaurez 20 photos pour toute la famille', 12000, 20, 60);


-- Table app_settings: parametres globaux
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings"
  ON public.app_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage settings"
  ON public.app_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default
INSERT INTO public.app_settings (key, value) VALUES ('ai_management_mode', 'manual');

-- Table ai_models_config: catalogue des modeles IA
CREATE TABLE public.ai_models_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  replicate_version text NOT NULL,
  stage text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  current_score numeric NOT NULL DEFAULT 0.0,
  admin_boost boolean NOT NULL DEFAULT false,
  total_runs integer NOT NULL DEFAULT 0,
  avg_rating numeric NOT NULL DEFAULT 0.0,
  conversion_rate numeric NOT NULL DEFAULT 0.0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_models_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read models"
  ON public.ai_models_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage models"
  ON public.ai_models_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_ai_models_config_updated_at
  BEFORE UPDATE ON public.ai_models_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: modele actuel
INSERT INTO public.ai_models_config (name, replicate_version, stage, is_active)
VALUES ('Aura SR v2', 'f5318740f60d79bf0c480216aaf9ca7614977553170eacd19ff8cbcda2409ac8', 'all', true);


-- 1. Drop existing ai_models_config (recreating with new schema)
DROP TABLE IF EXISTS public.ai_models_config CASCADE;

-- 2. Create ai_models_config with new schema
CREATE TABLE public.ai_models_config (
  id text PRIMARY KEY,
  name text NOT NULL,
  replicate_id text NOT NULL,
  cost_per_run double precision NOT NULL DEFAULT 0.0,
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  admin_boost boolean NOT NULL DEFAULT false,
  current_score double precision NOT NULL DEFAULT 0.0,
  avg_rating double precision NOT NULL DEFAULT 0.0,
  conversion_rate double precision NOT NULL DEFAULT 0.0,
  total_runs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_models_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage models" ON public.ai_models_config
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read models" ON public.ai_models_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. Create optimization_logs table
CREATE TABLE IF NOT EXISTS public.optimization_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  message text NOT NULL
);

ALTER TABLE public.optimization_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage optimization logs" ON public.optimization_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Backend can insert logs" ON public.optimization_logs
  FOR INSERT WITH CHECK (true);

-- 4. Add columns to photo_restorations (IF NOT EXISTS via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'photo_restorations' AND column_name = 'trial_number') THEN
    ALTER TABLE public.photo_restorations ADD COLUMN trial_number integer NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'photo_restorations' AND column_name = 'user_rating') THEN
    ALTER TABLE public.photo_restorations ADD COLUMN user_rating integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'photo_restorations' AND column_name = 'used_model_id') THEN
    ALTER TABLE public.photo_restorations ADD COLUMN used_model_id text;
  END IF;
END $$;

-- 5. Seed app_settings
INSERT INTO public.app_settings (key, value) VALUES 
  ('ai_management_mode', 'manual'),
  ('trial_1_model_id', 'microsoft'),
  ('trial_2_model_id', 'real-esrgan'),
  ('trial_3_model_id', 'gfpgan'),
  ('final_hd_model_id', 'codeformer')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 6. Seed ai_models_config
INSERT INTO public.ai_models_config (id, name, replicate_id, cost_per_run, is_active, status) VALUES 
  ('microsoft', 'Microsoft Restoration (Color)', 'c75db81db6cbd809d93cc3b7e7a088a351a3349c9fa02b6d393e35e0d51ba799', 0.002, true, 'active'),
  ('real-esrgan', 'Real-ESRGAN (Nettoyage)', '35042c8a33f6d962db6d72979841525a188f49f500a3093952504b2810fb8d36', 0.001, true, 'active'),
  ('flux-restore', 'FLUX Image Restore (Luxe)', '959wnenv85rmy0cwcphth4nsx4', 0.04, true, 'challenger'),
  ('gfpgan', 'GFPGAN (Visages)', '9283608cc6b7c33c3aa1d059061922201e61eaef547276307a18372951e4ec0d', 0.005, true, 'active'),
  ('codeformer', 'CodeFormer (HD)', '7de2ea2670661a196657f40414ad3193407ae93206cb7e954497e88382103f5a', 0.01, true, 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  replicate_id = EXCLUDED.replicate_id,
  cost_per_run = EXCLUDED.cost_per_run,
  is_active = EXCLUDED.is_active,
  status = EXCLUDED.status;

-- 7. Trigger for updated_at
CREATE OR REPLACE TRIGGER update_ai_models_config_updated_at
  BEFORE UPDATE ON public.ai_models_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

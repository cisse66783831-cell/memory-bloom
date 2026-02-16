
-- 1. Sécurité : Renommer la colonne version si elle existe
DO $$
BEGIN
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='ai_models_config' AND column_name='replicate_version') THEN
        ALTER TABLE public.ai_models_config RENAME COLUMN replicate_version TO replicate_id;
    END IF;
END $$;

-- 2. Structure : Ajouter la colonne pour les Prompts Système
ALTER TABLE public.ai_models_config ADD COLUMN IF NOT EXISTS system_prompt text;

-- 3. Nettoyage : Vider les tables pour éviter les doublons/conflits
TRUNCATE TABLE public.ai_models_config CASCADE;
DELETE FROM public.app_settings WHERE key IN ('combo_pipeline_steps', 'ai_management_mode', 'trial_1_model_id', 'trial_2_model_id', 'trial_3_model_id', 'final_hd_model_id');

-- 4. Données : Insérer TOUS les modèles avec leurs IDs Replicate et Prompts Optimisés
INSERT INTO public.ai_models_config (id, name, replicate_id, cost_per_run, is_active, status, avg_rating, system_prompt)
VALUES 
('nano-banana', 'Google Nano Banana (Edit)', '5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa', 0.039, true, 'active', 4.5, 
'Increase resolution to high-quality print standard (300 DPI). Remove edge imperfections, artifacts and noise. Sharpen significantly. Optimize lighting to mimic an iPhone 14 Pro Max: balanced HDR, natural vibrant colors, professional sharpness. Do not alter composition.'),

('flux-restore', 'Flux Restore (Fashion)', '959wnenv85rmy0cwcphth4nsx4', 0.040, true, 'challenger', 4.8, 
'Enhance for high-end fashion magazine aesthetic (Vogue style). 8K quality, shot on Nikon Z9, 85mm f/1.4. Glamorous studio lighting, rich elegant colors. Ultra-sharp face, realistic skin. Preserve identity. DO NOT CROP, keep full body visible.'),

('nano-banana-pro', 'Google Nano Banana PRO (4K)', '9bf83889e4163a8f1971671b478d06e2d578167056cf83eafbb95497295e1f7e', 0.055, true, 'challenger', 4.9, 
'Increase resolution to 4K. Professional studio photography finish. Ultra-detailed, sharp focus, color graded.'),

('microsoft', 'Microsoft Restoration (Color)', 'c75db81db6cbd809d93cc3b7e7a088a351a3349c9fa02b6d393e35e0d51ba799', 0.002, true, 'active', 4.6, NULL),
('real-esrgan', 'Real-ESRGAN (Nettoyage)', '35042c8a33f6d962db6d72979841525a188f49f500a3093952504b2810fb8d36', 0.001, true, 'active', 4.1, NULL),
('codeformer', 'CodeFormer HD (Visage)', '7de2ea2670661a196657f40414ad3193407ae93206cb7e954497e88382103f5a', 0.01, true, 'active', 4.8, NULL),
('gfpgan', 'GFPGAN (Visage)', '9283608cc6b7c33c3aa1d059061922201e61eaef547276307a18372951e4ec0d', 0.005, true, 'active', 4.3, NULL),

('combo-model', '⚡ MODE COMBO (Pipeline)', 'pipeline-internal', 0.000, true, 'active', 5.0, NULL);

-- 5. Configuration par défaut
INSERT INTO public.app_settings (key, value) VALUES 
('combo_pipeline_steps', '["real-esrgan", "microsoft", "codeformer"]'),
('ai_management_mode', 'manual'),
('trial_1_model_id', 'microsoft'),
('trial_2_model_id', 'nano-banana'),
('trial_3_model_id', 'gfpgan'),
('final_hd_model_id', 'combo-model');

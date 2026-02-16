
-- 1. Nettoyage préventif
TRUNCATE TABLE public.ai_models_config CASCADE;
TRUNCATE TABLE public.app_settings CASCADE;

-- 2. Insertion des modèles IA certifiés
INSERT INTO public.ai_models_config (id, name, replicate_id, cost_per_run, is_active, status, current_score, avg_rating)
VALUES 
('nano-banana', 'Google Nano Banana', '5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa', 0.039, true, 'active', 92.0, 4.5),
('gemini-flash', 'Gemini 2.5 Flash Image', '9bf83889e4163a8f1971671b478d06e2d578167056cf83eafbb95497295e1f7e', 0.039, true, 'challenger', 88.0, 4.2),
('microsoft', 'Microsoft Restoration (Color)', 'c75db81db6cbd809d93cc3b7e7a088a351a3349c9fa02b6d393e35e0d51ba799', 0.002, true, 'active', 95.0, 4.6),
('real-esrgan', 'Real-ESRGAN (Nettoyage)', '35042c8a33f6d962db6d72979841525a188f49f500a3093952504b2810fb8d36', 0.001, true, 'active', 89.0, 4.1),
('gfpgan', 'GFPGAN (Visages)', '9283608cc6b7c33c3aa1d059061922201e61eaef547276307a18372951e4ec0d', 0.005, true, 'active', 90.0, 4.3),
('codeformer', 'CodeFormer HD (Luxe)', '7de2ea2670661a196657f40414ad3193407ae93206cb7e954497e88382103f5a', 0.01, true, 'active', 94.0, 4.8);

-- 3. Configuration par défaut du système
INSERT INTO public.app_settings (key, value)
VALUES 
('ai_management_mode', 'manual'),
('trial_1_model_id', 'microsoft'),
('trial_2_model_id', 'nano-banana'),
('trial_3_model_id', 'gfpgan'),
('final_hd_model_id', 'codeformer');

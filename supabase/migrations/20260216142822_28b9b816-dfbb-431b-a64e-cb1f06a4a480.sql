
-- ÉTAPE 1: Nettoyage et insertion des modèles Flux Kontext
TRUNCATE TABLE public.ai_models_config;

INSERT INTO public.ai_models_config (id, name, replicate_id, cost_per_run, is_active, status, avg_rating) VALUES
('flux-kontext', 'Flux Kontext Restore (Pro)', 'flux-kontext-apps/restore-image', 0.040, true, 'challenger', 4.9),
('nano-banana', 'Google Nano Banana (Edit)', '5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa', 0.039, true, 'active', 4.5),
('microsoft', 'Microsoft Restoration', 'c75db81db6cbd809d93cc3b7e7a088a351a3349c9fa02b6d393e35e0d51ba799', 0.002, true, 'active', 4.2);

-- Configuration par défaut: 2 essais, flux-kontext pour essai 2
INSERT INTO public.app_settings (key, value) VALUES
('max_trials', '2'),
('enable_trial_3', 'false'),
('trial_1_model_id', 'microsoft'),
('trial_2_model_id', 'flux-kontext')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

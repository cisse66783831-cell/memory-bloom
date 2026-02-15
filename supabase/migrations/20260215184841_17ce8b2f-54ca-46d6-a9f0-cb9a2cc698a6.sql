
-- ÉTAPE 1: Add sender_phone to payments
ALTER TABLE public.payments ADD COLUMN sender_phone text;

-- Add replicate_prediction_id to photo_restorations
ALTER TABLE public.photo_restorations ADD COLUMN replicate_prediction_id text;


-- Fix: add missing status values to the check constraint on photo_restorations
-- First, drop the existing check constraint
ALTER TABLE public.photo_restorations 
DROP CONSTRAINT IF EXISTS photo_restorations_status_check;

-- Re-create it with all valid statuses including preview_ready and awaiting_image
ALTER TABLE public.photo_restorations 
ADD CONSTRAINT photo_restorations_status_check 
CHECK (status IN ('pending', 'processing', 'preview_ready', 'awaiting_image', 'completed', 'failed'));

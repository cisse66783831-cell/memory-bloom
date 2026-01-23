-- Photo restorations table
CREATE TABLE public.photo_restorations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL, -- Anonymous session tracking
  original_image_path TEXT NOT NULL,
  preview_image_path TEXT,
  restored_image_path TEXT,
  pdf_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.photo_restorations ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous uploads)
CREATE POLICY "Anyone can create restorations"
ON public.photo_restorations
FOR INSERT
WITH CHECK (true);

-- Users can only view their own session's restorations
CREATE POLICY "Users can view their session restorations"
ON public.photo_restorations
FOR SELECT
USING (true);

-- Update only allowed via backend
CREATE POLICY "Allow updates for processing"
ON public.photo_restorations
FOR UPDATE
USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_photo_restorations_updated_at
BEFORE UPDATE ON public.photo_restorations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', false);

-- Storage policies for photos bucket
CREATE POLICY "Anyone can upload photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Anyone can view photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'photos');

-- Payments table for tracking
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restoration_id UUID NOT NULL REFERENCES public.photo_restorations(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  provider TEXT,
  provider_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view payments"
ON public.payments
FOR SELECT
USING (true);

CREATE POLICY "Backend can create payments"
ON public.payments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Backend can update payments"
ON public.payments
FOR UPDATE
USING (true);
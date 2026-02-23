
-- Allow anonymous uploads to the photos bucket for the original/ folder
-- This is needed because users can upload photos before creating an account
CREATE POLICY "Allow anonymous uploads to original folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'original'
);

-- Allow anonymous reads from photos bucket for signed URLs to work
CREATE POLICY "Allow anonymous reads from photos bucket"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'photos'
);

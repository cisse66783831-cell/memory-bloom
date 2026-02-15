-- Storage security policies for the photos bucket

-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos'
);

-- Allow authenticated users to view their own photos (owner-based)
CREATE POLICY "Users can view own photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos'
  AND owner::text = auth.uid()::text
);

-- Allow service_role full access (for admin and cleanup)
CREATE POLICY "Service role full access photos"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'photos')
WITH CHECK (bucket_id = 'photos');

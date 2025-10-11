-- =====================================================
-- STORAGE BUCKET POLICIES FOR rental-property-media
-- Allow authenticated users to upload and view property images
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload rental property media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update rental property media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete rental property media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view rental property media" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload rental property media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rental-property-media');

-- Allow authenticated users to update files
CREATE POLICY "Users can update rental property media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'rental-property-media');

-- Allow authenticated users to delete files
CREATE POLICY "Users can delete rental property media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'rental-property-media');

-- Allow everyone to view rental property media (public read)
CREATE POLICY "Public can view rental property media"
ON storage.objects FOR SELECT
USING (bucket_id = 'rental-property-media');

SELECT 'Rental property storage RLS policies created successfully' AS status;

-- =====================================================
-- ADD RLS POLICIES FOR PROFILE-PICTURES BUCKET
-- =====================================================
-- This migration adds Row-Level Security policies to the
-- existing profile-pictures bucket
-- Run this in Supabase SQL Editor (not as authenticated user)
-- =====================================================

-- STEP 1: Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;

-- STEP 2: Create policy for uploading profile pictures
-- Users can only upload to their own folder: profiles/{user_id}/
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- STEP 3: Create policy for updating profile pictures
-- Users can only update files in their own folder
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- STEP 4: Create policy for deleting profile pictures
-- Users can only delete their own files
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- STEP 5: Create policy for viewing profile pictures
-- Anyone (including public/anonymous users) can view profile pictures
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%profile pictures%'
ORDER BY policyname;

SELECT '✅ Profile pictures RLS policies created successfully!' as status;

-- =====================================================
-- DISABLE EMAIL CONFIRMATION
-- Run this in Supabase SQL Editor to disable email confirmation
-- =====================================================

-- NOTE: This SQL only works if you have direct database access.
-- The recommended way is to disable email confirmation via Supabase Dashboard:
--
-- 1. Go to: Authentication → Providers → Email
-- 2. Under "Email Auth" settings
-- 3. Toggle OFF "Confirm email"
-- 4. Click "Save"
--
-- If you must do it via SQL (requires superuser access):

-- Update auth configuration to disable email confirmation
-- WARNING: This requires superuser privileges and may not work in hosted Supabase
-- UPDATE auth.config
-- SET enable_signup = true,
--     email_confirm = false
-- WHERE id = 1;

-- Alternative: Update existing users to mark them as confirmed
-- This is useful if you want to auto-confirm existing users
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. The best way to disable email confirmation is through the Supabase Dashboard
-- 2. Go to: Authentication → Providers → Email → Toggle OFF "Confirm email"
-- 3. The SQL above may not work on hosted Supabase due to RLS policies
-- 4. Use the dashboard method for production environments

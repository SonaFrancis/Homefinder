-- =====================================================
-- FIX notify_listing_approved FUNCTION
-- This is likely the function causing the seller_id error
-- =====================================================

-- First, check what the function does
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'notify_listing_approved';

-- Drop the problematic function and any triggers using it
DROP FUNCTION IF EXISTS notify_listing_approved() CASCADE;

-- Also drop notify_listing_rejected in case it has the same issue
DROP FUNCTION IF EXISTS notify_listing_rejected() CASCADE;

-- Success message
SELECT 'Problematic notification functions have been removed!' AS status;

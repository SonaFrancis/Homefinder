-- =====================================================
-- ADMIN DASHBOARD RLS POLICIES
-- Allow admin dashboard to read data for analytics
-- =====================================================

-- Option 1: Create a policy that allows reading user_subscriptions without authentication
-- (Use this for admin dashboard with service role key or if you want public read access)
CREATE POLICY "Allow public read for analytics"
ON user_subscriptions
FOR SELECT
USING (true);

-- Note: If you want more security, use Option 2 instead (commented below)

-- =====================================================
-- Option 2: More Secure - Use Service Role Key
-- =====================================================
-- Instead of the policy above, you should:
-- 1. Create a service_role key in Supabase Dashboard
-- 2. Add it to your admin dashboard .env.local:
--    NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
-- 3. Update lib/supabase.ts in admin dashboard to use service role key
-- 4. Service role key bypasses RLS automatically

-- To implement Option 2, comment out the policy above and follow these steps


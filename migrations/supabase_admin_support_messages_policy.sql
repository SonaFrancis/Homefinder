-- =====================================================
-- ALLOW ADMIN DASHBOARD TO VIEW AND UPDATE SUPPORT MESSAGES
-- Adds RLS policies for admin operations
-- =====================================================

-- Create policy: Allow public read (for admin dashboard)
CREATE POLICY "Allow public read for admin operations"
ON support_messages
FOR SELECT
USING (true);

-- Create policy: Allow public update (for admin dashboard)
CREATE POLICY "Allow public update for admin operations"
ON support_messages
FOR UPDATE
USING (true);

SELECT 'Admin policies created for support_messages - Admin dashboard can now view and manage support messages' AS status;

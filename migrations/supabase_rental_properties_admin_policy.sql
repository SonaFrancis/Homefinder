-- =====================================================
-- ADMIN DASHBOARD POLICY FOR RENTAL PROPERTIES
-- Allow admin dashboard to read rental properties
-- =====================================================

-- Allow public read access for rental_properties (for admin dashboard analytics)
CREATE POLICY "Allow public read for admin dashboard"
ON rental_properties
FOR SELECT
USING (true);

-- Verify the policy was created
SELECT 'Admin dashboard policy created for rental_properties' AS status;

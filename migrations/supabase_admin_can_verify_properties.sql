-- =====================================================
-- ALLOW ADMIN DASHBOARD TO VERIFY AND MANAGE PROPERTIES
-- Adds RLS policy to allow admin operations
-- =====================================================

-- Drop the restrictive landlord-only update policy if it exists
DROP POLICY IF EXISTS "Landlords can update own properties" ON rental_properties;

-- Create new policy: Landlords can update their own properties
CREATE POLICY "Landlords can update own properties"
ON rental_properties
FOR UPDATE
USING (auth.uid() = landlord_id);

-- Create policy: Allow public updates (for admin dashboard)
-- This allows the admin dashboard to verify, delete, and manage all properties
CREATE POLICY "Allow public update for admin operations"
ON rental_properties
FOR UPDATE
USING (true);

-- Create policy: Allow public delete (for admin dashboard)
CREATE POLICY "Allow public delete for admin operations"
ON rental_properties
FOR DELETE
USING (true);

SELECT 'Admin policies created for rental_properties - Admin dashboard can now verify and manage properties' AS status;

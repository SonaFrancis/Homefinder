-- Migration: Update 'student' role to 'Ternant'
-- Description: Changes the database enum and updates all existing 'student' records to 'Ternant'

-- Step 1: Add 'Ternant' to the enum type
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Ternant';

-- Step 2: Update all existing profiles with 'student' role to 'Ternant'
UPDATE profiles
SET role = 'Ternant'
WHERE role = 'student';

-- Step 3: Create a new enum without 'student'
CREATE TYPE user_role_new AS ENUM ('Ternant', 'landlord', 'seller', 'admin');

-- Step 4: Alter the profiles table to use the new enum
ALTER TABLE profiles
ALTER COLUMN role TYPE user_role_new
USING role::text::user_role_new;

-- Step 5: Drop the old enum and rename the new one
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- Step 6: Update the default value
ALTER TABLE profiles
ALTER COLUMN role SET DEFAULT 'Ternant';

-- Verify the changes
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY role;

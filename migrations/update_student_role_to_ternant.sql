-- Migration: Update 'student' role to 'Ternant'
-- Description: Changes the database enum and updates all existing 'student' records to 'Ternant'
--
-- IMPORTANT: Run this migration in TWO STEPS
-- Step 1: Run PART 1 first, then wait a few seconds
-- Step 2: Run PART 2 after the first part is committed

-- ============================================
-- PART 1: Add new enum value (RUN THIS FIRST)
-- ============================================

-- Add 'Ternant' to the enum type
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Ternant';

-- STOP HERE! Wait a few seconds for the transaction to commit.
-- Then run PART 2 below in a new query.

-- ============================================
-- PART 2: Update records (RUN THIS SECOND)
-- ============================================

-- Update all existing profiles with 'student' role to 'Ternant'
UPDATE profiles
SET role = 'Ternant'
WHERE role = 'student';

-- Update the default value
ALTER TABLE profiles
ALTER COLUMN role SET DEFAULT 'Ternant';

-- Verify the changes
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY role;

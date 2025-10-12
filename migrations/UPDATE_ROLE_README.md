# Update Student Role to Ternant - Migration Guide

## Overview
This migration updates the user role from "student" to "Ternant" in the database.

## What This Migration Does

1. Adds 'Ternant' to the allowed role values
2. Updates all existing user profiles with 'student' role to 'Ternant'
3. Removes 'student' from the allowed role values
4. Updates the default role to 'Ternant'

## How to Run This Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor**
3. Open the file `migrations/update_student_role_to_ternant.sql`
4. Copy all the SQL code
5. Paste it into the SQL Editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

Or run the specific migration file:

```bash
psql -h your-db-host -U postgres -d postgres -f migrations/update_student_role_to_ternant.sql
```

## Verification

After running the migration, you can verify it worked by:

1. Checking the SQL Editor with this query:
   ```sql
   SELECT role, COUNT(*) as count
   FROM profiles
   GROUP BY role
   ORDER BY role;
   ```

2. Log out and log back into the app
3. Navigate to the Profile screen
4. Your role should now display as "Ternant" instead of "student"

## Important Notes

- This migration is **safe to run multiple times** (idempotent)
- All existing users with "student" role will automatically become "Ternant"
- New signups will automatically use "Ternant" as the default role
- The migration does not affect landlord, seller, or admin roles

## Rollback (if needed)

If you need to rollback this change:

```sql
-- Add 'student' back to enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'student';

-- Update all 'Ternant' back to 'student'
UPDATE profiles
SET role = 'student'
WHERE role = 'Ternant';

-- Set default back to 'student'
ALTER TABLE profiles
ALTER COLUMN role SET DEFAULT 'student';
```

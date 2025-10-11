# Fix Duplicate Notifications

## Problem
Users are seeing duplicate notifications when someone posts an item or property:
- One notification has a clickable link that directs to the item/property page ✅
- The duplicate notification has no link and doesn't navigate anywhere ❌

## Root Cause
The database has BOTH:
1. **Old UPDATE triggers** - Created notifications when items were approved (old workflow)
2. **New INSERT triggers** - Create notifications when items are posted (current workflow)

This causes TWO notifications to be created for every post.

## Solution
Run the migration script `fix_duplicate_notifications_final.sql` which will:
1. Remove ALL old notification triggers (both UPDATE and INSERT)
2. Update notification functions to include reference links (reference_type, reference_id, category)
3. Create ONLY INSERT triggers that fire once per post

## How to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/fix_duplicate_notifications_final.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute the script

### Option 2: Using Supabase CLI
```bash
supabase db execute < migrations/fix_duplicate_notifications_final.sql
```

## Verification
After running the script, you should see:
- Only INSERT triggers exist (no UPDATE triggers)
- Each table has exactly ONE notification trigger
- All notifications include `reference_type`, `reference_id`, and `category` fields

To verify, run this query in SQL Editor:
```sql
SELECT
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'notify_%'
ORDER BY event_object_table;
```

You should see output like:
```
notify_cars_insert          | INSERT | cars
notify_cosmetics_insert     | INSERT | cosmetics
notify_electronics_insert   | INSERT | electronics
notify_fashion_insert       | INSERT | fashion
...etc
```

## Testing
After applying the fix:
1. Post a new rental property or marketplace item
2. Check the notifications panel
3. You should see **exactly ONE notification**
4. Click on the notification - it should navigate to the item/property page

## Result
✅ No more duplicate notifications
✅ Each notification is clickable and navigates to the correct page
✅ Clean, professional user experience

-- =====================================================
-- TEST QUOTA ENFORCEMENT
-- =====================================================
-- This script simulates quota exhaustion to test if
-- the media upload limits are being enforced properly
-- =====================================================

-- =====================================================
-- STEP 1: IDENTIFY YOUR TEST USER
-- =====================================================

-- First, find your current user and their subscription
SELECT
    'Your User Info' as info,
    p.id as user_id,
    p.full_name,
    p.email,
    p.role,
    us.id as subscription_id,
    sp.name as plan,
    sp.image_quota_per_month,
    sp.video_quota_per_month,
    us.images_used_this_month,
    us.videos_used_this_month,
    us.status as subscription_status,
    us.end_date
FROM profiles p
LEFT JOIN user_subscriptions us ON us.user_id = p.id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE p.role IN ('landlord', 'seller')
ORDER BY p.created_at DESC
LIMIT 5;

-- =====================================================
-- STEP 2: SET QUOTA TO MAX (REPLACE USER_ID)
-- =====================================================

-- ⚠️ REPLACE 'YOUR-USER-ID-HERE' WITH YOUR ACTUAL USER ID FROM STEP 1

-- For STANDARD plan (15 images, 5 videos)
UPDATE user_subscriptions
SET
    images_used_this_month = 15,  -- Max for standard
    videos_used_this_month = 5,   -- Max for standard
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE'
AND status = 'active'
RETURNING
    id,
    user_id,
    images_used_this_month,
    videos_used_this_month;

-- If you have PREMIUM plan, use this instead:
-- UPDATE user_subscriptions
-- SET
--     images_used_this_month = 30,  -- Max for premium
--     videos_used_this_month = 10,  -- Max for premium
--     updated_at = NOW()
-- WHERE user_id = 'YOUR-USER-ID-HERE'
-- AND status = 'active'
-- RETURNING
--     id,
--     user_id,
--     images_used_this_month,
--     videos_used_this_month;

-- =====================================================
-- STEP 3: VERIFY QUOTA IS MAXED OUT
-- =====================================================

-- Check the updated values
SELECT
    'Verification: Quota Status' as info,
    p.full_name,
    p.email,
    sp.name as plan,
    us.images_used_this_month || ' / ' || sp.image_quota_per_month as image_quota_status,
    us.videos_used_this_month || ' / ' || sp.video_quota_per_month as video_quota_status,
    CASE
        WHEN us.images_used_this_month >= sp.image_quota_per_month THEN '❌ IMAGE QUOTA FULL'
        ELSE '✅ Can upload ' || (sp.image_quota_per_month - us.images_used_this_month) || ' more images'
    END as image_status,
    CASE
        WHEN us.videos_used_this_month >= sp.video_quota_per_month THEN '❌ VIDEO QUOTA FULL'
        ELSE '✅ Can upload ' || (sp.video_quota_per_month - us.videos_used_this_month) || ' more videos'
    END as video_status
FROM user_subscriptions us
JOIN profiles p ON p.id = us.user_id
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.user_id = 'YOUR-USER-ID-HERE'
AND us.status = 'active';

-- =====================================================
-- STEP 4: ALSO UPDATE user_storage_usage TABLE
-- =====================================================

-- Update the new tracking table if it exists
UPDATE user_storage_usage
SET
    current_month_images = (
        SELECT image_quota_per_month
        FROM subscription_plans sp
        JOIN user_subscriptions us ON us.plan_id = sp.id
        WHERE us.user_id = user_storage_usage.user_id
        AND us.status = 'active'
        LIMIT 1
    ),
    current_month_videos = (
        SELECT video_quota_per_month
        FROM subscription_plans sp
        JOIN user_subscriptions us ON us.plan_id = sp.id
        WHERE us.user_id = user_storage_usage.user_id
        AND us.status = 'active'
        LIMIT 1
    ),
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE';

-- =====================================================
-- STEP 5: TEST SCENARIO SETUP COMPLETE
-- =====================================================

SELECT
    '✅ TEST SETUP COMPLETE!' as status,
    'Your quotas are now maxed out' as message,
    'Try uploading an image or video in the app' as next_step,
    'You should see an error: "Monthly quota exceeded"' as expected_result;

-- =====================================================
-- STEP 6: RESET QUOTA AFTER TESTING
-- =====================================================

-- Run this AFTER you finish testing to reset your quota:
/*
UPDATE user_subscriptions
SET
    images_used_this_month = 0,
    videos_used_this_month = 0,
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE'
AND status = 'active';

UPDATE user_storage_usage
SET
    current_month_images = 0,
    current_month_videos = 0,
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE';

SELECT '✅ Quota Reset Complete!' as status;
*/

-- =====================================================
-- BONUS: TEST DIFFERENT SCENARIOS
-- =====================================================

-- Scenario 1: Max out only images (videos still available)
/*
UPDATE user_subscriptions
SET
    images_used_this_month = 15,  -- Max for standard
    videos_used_this_month = 0,   -- None used
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE'
AND status = 'active';
*/

-- Scenario 2: Max out only videos (images still available)
/*
UPDATE user_subscriptions
SET
    images_used_this_month = 0,   -- None used
    videos_used_this_month = 5,   -- Max for standard
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE'
AND status = 'active';
*/

-- Scenario 3: Almost at limit (14/15 images, 4/5 videos)
/*
UPDATE user_subscriptions
SET
    images_used_this_month = 14,  -- 1 remaining
    videos_used_this_month = 4,   -- 1 remaining
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE'
AND status = 'active';
*/

-- =====================================================
-- MONITORING QUERIES
-- =====================================================

-- Check quota enforcement in real-time
-- Run this in a separate tab while testing:
/*
SELECT
    NOW() as check_time,
    us.images_used_this_month,
    sp.image_quota_per_month,
    us.videos_used_this_month,
    sp.video_quota_per_month,
    (sp.image_quota_per_month - us.images_used_this_month) as images_remaining,
    (sp.video_quota_per_month - us.videos_used_this_month) as videos_remaining
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.user_id = 'YOUR-USER-ID-HERE'
AND us.status = 'active';
*/

-- Check recent media uploads
/*
SELECT
    created_at,
    media_type,
    category,
    file_name,
    ROUND(file_size_bytes::NUMERIC / 1024, 2) as size_kb
FROM user_media_uploads
WHERE user_id = 'YOUR-USER-ID-HERE'
ORDER BY created_at DESC
LIMIT 10;
*/

-- =====================================================
-- EXPECTED BEHAVIOR WHEN TESTING
-- =====================================================

/*
WHAT SHOULD HAPPEN:

1. Before running this script:
   ✅ You can upload images and videos

2. After running STEP 2 (maxing out quota):
   ❌ Uploading image should fail with error
   ❌ Uploading video should fail with error

3. Error message should say:
   "Monthly image quota exceeded (15/15 used)" OR
   "Monthly video quota exceeded (5/5 used)"

4. After running STEP 6 (reset):
   ✅ You can upload again


IF QUOTA ENFORCEMENT IS NOT WORKING:

Possible causes:
1. Triggers not installed - Run comprehensive_media_tracking_system.sql
2. Quota check function not working - Check check_media_quota_function()
3. App not calling Supabase correctly
4. RLS policies blocking the update

Debug steps:
1. Check if triggers exist:
   SELECT trigger_name, event_object_table
   FROM information_schema.triggers
   WHERE trigger_name LIKE '%media%';

2. Check if quota function exists:
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name LIKE '%quota%';

3. Try uploading and check Supabase logs for errors
*/

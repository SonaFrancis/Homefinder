-- =====================================================
-- QUICK TEST: Max Out Current User's Quota
-- =====================================================
-- This automatically finds your most recent user and
-- sets their quota to maximum for testing
-- =====================================================

-- Step 1: Show current user info
DO $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_plan_name TEXT;
    v_image_quota INTEGER;
    v_video_quota INTEGER;
BEGIN
    -- Get the most recent landlord/seller user
    SELECT p.id, p.full_name INTO v_user_id, v_user_name
    FROM profiles p
    WHERE p.role IN ('landlord', 'seller')
    ORDER BY p.created_at DESC
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No landlord/seller user found!';
    END IF;

    -- Get their subscription plan limits
    SELECT sp.name, sp.image_quota_per_month, sp.video_quota_per_month
    INTO v_plan_name, v_image_quota, v_video_quota
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = v_user_id
    AND us.status = 'active'
    LIMIT 1;

    IF v_plan_name IS NULL THEN
        RAISE EXCEPTION 'No active subscription found for user %', v_user_name;
    END IF;

    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'FOUND USER: %', v_user_name;
    RAISE NOTICE 'USER ID: %', v_user_id;
    RAISE NOTICE 'PLAN: %', v_plan_name;
    RAISE NOTICE 'IMAGE QUOTA: %', v_image_quota;
    RAISE NOTICE 'VIDEO QUOTA: %', v_video_quota;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

    -- Max out their quota
    UPDATE user_subscriptions
    SET
        images_used_this_month = v_image_quota,
        videos_used_this_month = v_video_quota,
        updated_at = NOW()
    WHERE user_id = v_user_id
    AND status = 'active';

    -- Also update user_storage_usage if table exists
    UPDATE user_storage_usage
    SET
        current_month_images = v_image_quota,
        current_month_videos = v_video_quota,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    RAISE NOTICE '✅ QUOTA MAXED OUT!';
    RAISE NOTICE 'Images: % / %', v_image_quota, v_image_quota;
    RAISE NOTICE 'Videos: % / %', v_video_quota, v_video_quota;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '📱 NOW TRY TO UPLOAD AN IMAGE OR VIDEO IN THE APP';
    RAISE NOTICE '❌ YOU SHOULD SEE ERROR: "Monthly quota exceeded"';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 To reset quota after testing, run: quick_reset_quota.sql';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

END $$;

-- Verify the quota is maxed out
SELECT
    '🔍 VERIFICATION' as section,
    p.full_name as user_name,
    sp.name as plan,
    us.images_used_this_month || ' / ' || sp.image_quota_per_month as images,
    us.videos_used_this_month || ' / ' || sp.video_quota_per_month as videos,
    CASE
        WHEN us.images_used_this_month >= sp.image_quota_per_month THEN '❌ FULL'
        ELSE '✅ AVAILABLE'
    END as image_status,
    CASE
        WHEN us.videos_used_this_month >= sp.video_quota_per_month THEN '❌ FULL'
        ELSE '✅ AVAILABLE'
    END as video_status
FROM user_subscriptions us
JOIN profiles p ON p.id = us.user_id
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.status = 'active'
AND p.role IN ('landlord', 'seller')
ORDER BY p.created_at DESC
LIMIT 1;

-- =====================================================
-- QUICK RESET: Reset Current User's Quota
-- =====================================================
-- Run this AFTER testing to reset quota back to 0
-- =====================================================

DO $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_plan_name TEXT;
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

    -- Get their plan name
    SELECT sp.name INTO v_plan_name
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = v_user_id
    AND us.status = 'active'
    LIMIT 1;

    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'RESETTING QUOTA FOR: %', v_user_name;
    RAISE NOTICE 'USER ID: %', v_user_id;
    RAISE NOTICE 'PLAN: %', v_plan_name;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

    -- Reset quota in user_subscriptions
    UPDATE user_subscriptions
    SET
        images_used_this_month = 0,
        videos_used_this_month = 0,
        updated_at = NOW()
    WHERE user_id = v_user_id
    AND status = 'active';

    -- Reset quota in user_storage_usage
    UPDATE user_storage_usage
    SET
        current_month_images = 0,
        current_month_videos = 0,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    RAISE NOTICE '✅ QUOTA RESET COMPLETE!';
    RAISE NOTICE 'Images: 0 (ready to upload)';
    RAISE NOTICE 'Videos: 0 (ready to upload)';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '📱 YOU CAN NOW UPLOAD IMAGES/VIDEOS AGAIN';
    RAISE NOTICE '';

END $$;

-- Verify the reset
SELECT
    '🔍 VERIFICATION' as section,
    p.full_name as user_name,
    sp.name as plan,
    us.images_used_this_month || ' / ' || sp.image_quota_per_month as images,
    us.videos_used_this_month || ' / ' || sp.video_quota_per_month as videos,
    (sp.image_quota_per_month - us.images_used_this_month) as images_available,
    (sp.video_quota_per_month - us.videos_used_this_month) as videos_available,
    '✅ READY TO UPLOAD' as status
FROM user_subscriptions us
JOIN profiles p ON p.id = us.user_id
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.status = 'active'
AND p.role IN ('landlord', 'seller')
ORDER BY p.created_at DESC
LIMIT 1;

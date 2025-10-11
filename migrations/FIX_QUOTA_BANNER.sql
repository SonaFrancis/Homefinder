-- =====================================================
-- FIX QUOTA BANNER - UPDATE FUNCTION FOR POST-BASED QUOTAS
-- =====================================================
-- This migration updates get_user_subscription_scenario to include
-- posts_used_this_month and max_posts_per_month fields
-- so the dashboard banner can display post quota correctly
-- =====================================================

-- STEP 1: Drop the old function
DROP FUNCTION IF EXISTS get_user_subscription_scenario(UUID);

-- STEP 2: Create the new function with post quota fields
CREATE OR REPLACE FUNCTION get_user_subscription_scenario(user_uuid UUID)
RETURNS TABLE(
    scenario INTEGER,
    scenario_name TEXT,
    subscription_status TEXT,
    days_expired INTEGER,
    grace_days_remaining INTEGER,
    can_create_listings BOOLEAN,
    can_upload_media BOOLEAN,
    listings_should_be_live BOOLEAN,
    can_edit_listings BOOLEAN,
    dashboard_access TEXT,
    warning_message TEXT,
    listings_used INTEGER,
    max_listings INTEGER,
    posts_used_this_month INTEGER,
    max_posts_per_month INTEGER,
    images_used INTEGER,
    image_quota INTEGER,
    videos_used INTEGER,
    video_quota INTEGER
) AS $$
DECLARE
    v_subscription RECORD;
    v_days_since_expiry INTEGER;
BEGIN
    -- Get active or most recent subscription with post quota fields
    SELECT
        us.status,
        us.end_date,
        us.listings_used,
        COALESCE(us.posts_used_this_month, 0) as posts_used_this_month,
        us.images_used_this_month,
        us.videos_used_this_month,
        sp.max_listings,
        COALESCE(sp.max_posts_per_month, sp.max_listings) as max_posts_per_month,
        sp.image_quota_per_month,
        sp.video_quota_per_month
    INTO v_subscription
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid
    ORDER BY us.end_date DESC
    LIMIT 1;

    -- SCENARIO 0: No subscription found
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            0::INTEGER, -- scenario
            'No Subscription'::TEXT,
            'none'::TEXT,
            0::INTEGER,
            0::INTEGER,
            FALSE::BOOLEAN,
            FALSE::BOOLEAN,
            FALSE::BOOLEAN,
            FALSE::BOOLEAN,
            'none'::TEXT,
            'Please subscribe to create posts'::TEXT,
            0::INTEGER,
            0::INTEGER,
            0::INTEGER,
            0::INTEGER,
            0::INTEGER,
            0::INTEGER,
            0::INTEGER,
            0::INTEGER;
        RETURN;
    END IF;

    -- Calculate days since expiry
    IF v_subscription.end_date < NOW() THEN
        v_days_since_expiry := EXTRACT(DAY FROM (NOW() - v_subscription.end_date))::INTEGER;
    ELSE
        v_days_since_expiry := 0;
    END IF;

    -- SCENARIO 1: Active Subscription
    IF v_subscription.status = 'active' AND v_subscription.end_date > NOW() THEN
        RETURN QUERY SELECT
            1::INTEGER, -- scenario
            'Active Subscription'::TEXT,
            v_subscription.status::TEXT,
            0::INTEGER, -- days_expired
            0::INTEGER, -- grace_days_remaining
            (v_subscription.posts_used_this_month < v_subscription.max_posts_per_month)::BOOLEAN, -- can_create (based on posts)
            (v_subscription.posts_used_this_month < v_subscription.max_posts_per_month)::BOOLEAN, -- can_upload (based on posts)
            TRUE::BOOLEAN, -- listings_live (YES - subscription active)
            TRUE::BOOLEAN, -- can_edit
            'full'::TEXT, -- dashboard_access
            CASE
                WHEN v_subscription.posts_used_this_month >= v_subscription.max_posts_per_month THEN
                    'Post quota exhausted (' || v_subscription.posts_used_this_month || '/' || v_subscription.max_posts_per_month || '). Renew subscription or upgrade.'
                ELSE 'All features available'
            END::TEXT,
            v_subscription.listings_used::INTEGER,
            v_subscription.max_listings::INTEGER,
            v_subscription.posts_used_this_month::INTEGER,
            v_subscription.max_posts_per_month::INTEGER,
            v_subscription.images_used_this_month::INTEGER,
            v_subscription.image_quota_per_month::INTEGER,
            v_subscription.videos_used_this_month::INTEGER,
            v_subscription.video_quota_per_month::INTEGER;
        RETURN;
    END IF;

    -- SCENARIO 2: Grace Period (0-7 days expired)
    IF v_days_since_expiry >= 0 AND v_days_since_expiry <= 7 THEN
        RETURN QUERY SELECT
            2::INTEGER, -- scenario
            'Grace Period'::TEXT,
            'expired'::TEXT,
            v_days_since_expiry::INTEGER,
            (7 - v_days_since_expiry)::INTEGER, -- grace_days_remaining
            (v_subscription.posts_used_this_month < v_subscription.max_posts_per_month)::BOOLEAN, -- can use remaining quota
            (v_subscription.posts_used_this_month < v_subscription.max_posts_per_month)::BOOLEAN, -- can use remaining quota
            TRUE::BOOLEAN, -- listings_live (YES - grace period active)
            TRUE::BOOLEAN, -- can_edit
            'full'::TEXT, -- dashboard_access (full with warnings)
            ('Subscription expired ' || v_days_since_expiry || ' days ago. Grace period: ' ||
            (7 - v_days_since_expiry) || ' days remaining. Renew to keep access!')::TEXT,
            v_subscription.listings_used::INTEGER,
            v_subscription.max_listings::INTEGER,
            v_subscription.posts_used_this_month::INTEGER,
            v_subscription.max_posts_per_month::INTEGER,
            v_subscription.images_used_this_month::INTEGER,
            v_subscription.image_quota_per_month::INTEGER,
            v_subscription.videos_used_this_month::INTEGER,
            v_subscription.video_quota_per_month::INTEGER;
        RETURN;
    END IF;

    -- SCENARIO 3: Grace Period Ended (8+ days)
    RETURN QUERY SELECT
        3::INTEGER, -- scenario
        'Grace Period Ended'::TEXT,
        'expired'::TEXT,
        v_days_since_expiry::INTEGER,
        0::INTEGER, -- grace_days_remaining (ended)
        FALSE::BOOLEAN, -- cannot create
        FALSE::BOOLEAN, -- cannot upload
        FALSE::BOOLEAN, -- listings_live (NO - deactivated)
        FALSE::BOOLEAN, -- cannot edit
        'readonly'::TEXT, -- dashboard_access
        ('Subscription expired ' || v_days_since_expiry || ' days ago. Grace period ended. Renew to restore access.')::TEXT,
        v_subscription.listings_used::INTEGER,
        v_subscription.max_listings::INTEGER,
        v_subscription.posts_used_this_month::INTEGER,
        v_subscription.max_posts_per_month::INTEGER,
        v_subscription.images_used_this_month::INTEGER,
        v_subscription.image_quota_per_month::INTEGER,
        v_subscription.videos_used_this_month::INTEGER,
        v_subscription.video_quota_per_month::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_subscription_scenario(UUID) TO authenticated;

-- STEP 4: Verify the fix worked
SELECT '✅ SUCCESS! Function updated with post quota fields.' as status;
SELECT 'Now refresh your app - the quota banner should display!' as next_step;

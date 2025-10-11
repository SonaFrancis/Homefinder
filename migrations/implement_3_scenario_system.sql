-- =====================================================
-- COMPLETE 3-SCENARIO SUBSCRIPTION SYSTEM
-- =====================================================
-- Implements:
-- Scenario 1: Active subscription → Full access
-- Scenario 2: Expired (0-7 days) → Grace period with remaining quota
-- Scenario 3: Expired (8+ days) → Deactivate listings, read-only
-- =====================================================

-- =====================================================
-- PART 1: CORE STATUS CHECK FUNCTION
-- =====================================================

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
    images_used INTEGER,
    image_quota INTEGER,
    videos_used INTEGER,
    video_quota INTEGER
) AS $$
DECLARE
    v_subscription RECORD;
    v_days_since_expiry INTEGER;
BEGIN
    -- Get active or most recent subscription
    SELECT
        us.status,
        us.end_date,
        us.listings_used,
        us.images_used_this_month,
        us.videos_used_this_month,
        sp.max_listings,
        sp.image_quota_per_month,
        sp.video_quota_per_month
    INTO v_subscription
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid
    ORDER BY us.end_date DESC
    LIMIT 1;

    -- No subscription found
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            0, -- scenario
            'No Subscription'::TEXT,
            'none'::TEXT,
            0, 0,
            FALSE, FALSE, FALSE, FALSE,
            'none'::TEXT,
            'Please subscribe to create listings'::TEXT,
            0, 0, 0, 0, 0, 0;
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
            1, -- scenario
            'Active Subscription'::TEXT,
            v_subscription.status::TEXT,
            0, -- days_expired
            0, -- grace_days_remaining
            v_subscription.listings_used < v_subscription.max_listings, -- can_create
            v_subscription.images_used_this_month < v_subscription.image_quota_per_month, -- can_upload
            TRUE, -- listings_live (YES - subscription active)
            TRUE, -- can_edit
            'full'::TEXT, -- dashboard_access
            CASE
                WHEN v_subscription.listings_used >= v_subscription.max_listings THEN
                    'Monthly listing quota exhausted (' || v_subscription.listings_used || '/' || v_subscription.max_listings || '). Resets next month or upgrade.'
                WHEN v_subscription.images_used_this_month >= v_subscription.image_quota_per_month THEN
                    'Monthly image quota exhausted (' || v_subscription.images_used_this_month || '/' || v_subscription.image_quota_per_month || '). Resets next month or upgrade.'
                ELSE 'All features available'
            END::TEXT,
            v_subscription.listings_used,
            v_subscription.max_listings,
            v_subscription.images_used_this_month,
            v_subscription.image_quota_per_month,
            v_subscription.videos_used_this_month,
            v_subscription.video_quota_per_month;
        RETURN;
    END IF;

    -- SCENARIO 2: Grace Period (0-7 days expired)
    IF v_days_since_expiry >= 0 AND v_days_since_expiry <= 7 THEN
        RETURN QUERY SELECT
            2, -- scenario
            'Grace Period'::TEXT,
            'expired'::TEXT,
            v_days_since_expiry,
            7 - v_days_since_expiry, -- grace_days_remaining
            v_subscription.listings_used < v_subscription.max_listings, -- can use remaining quota
            v_subscription.images_used_this_month < v_subscription.image_quota_per_month, -- can use remaining quota
            TRUE, -- listings_live (YES - grace period active)
            TRUE, -- can_edit
            'full'::TEXT, -- dashboard_access (full with warnings)
            'Subscription expired ' || v_days_since_expiry || ' days ago. Grace period: ' ||
            (7 - v_days_since_expiry) || ' days remaining. Renew to keep access!'::TEXT,
            v_subscription.listings_used,
            v_subscription.max_listings,
            v_subscription.images_used_this_month,
            v_subscription.image_quota_per_month,
            v_subscription.videos_used_this_month,
            v_subscription.video_quota_per_month;
        RETURN;
    END IF;

    -- SCENARIO 3: Grace Period Ended (8+ days)
    RETURN QUERY SELECT
        3, -- scenario
        'Grace Period Ended'::TEXT,
        'expired'::TEXT,
        v_days_since_expiry,
        0, -- grace_days_remaining (ended)
        FALSE, -- cannot create
        FALSE, -- cannot upload
        FALSE, -- listings_live (NO - deactivated)
        FALSE, -- cannot edit
        'readonly'::TEXT, -- dashboard_access
        'Subscription expired ' || v_days_since_expiry || ' days ago. Grace period ended. Renew to restore access.'::TEXT,
        v_subscription.listings_used,
        v_subscription.max_listings,
        v_subscription.images_used_this_month,
        v_subscription.image_quota_per_month,
        v_subscription.videos_used_this_month,
        v_subscription.video_quota_per_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 2: LISTING DEACTIVATION (Grace Period End)
-- =====================================================

CREATE OR REPLACE FUNCTION deactivate_listings_after_grace_period()
RETURNS TABLE(users_affected INTEGER, listings_deactivated INTEGER) AS $$
DECLARE
    v_users_count INTEGER := 0;
    v_listings_count INTEGER := 0;
BEGIN
    -- Find users whose grace period ended (expired 8+ days ago)
    WITH expired_users AS (
        SELECT DISTINCT us.user_id
        FROM user_subscriptions us
        WHERE us.status IN ('active', 'expired')
        AND us.end_date < NOW() - INTERVAL '7 days'
        AND us.end_date >= NOW() - INTERVAL '8 days' -- Only process newly expired
    )
    -- Deactivate rental properties
    UPDATE rental_properties rp
    SET is_available = FALSE,
        updated_at = NOW()
    FROM expired_users eu
    WHERE rp.landlord_id = eu.user_id
    AND rp.is_available = TRUE;

    GET DIAGNOSTICS v_listings_count = ROW_COUNT;

    -- Deactivate marketplace items
    WITH expired_users AS (
        SELECT DISTINCT us.user_id
        FROM user_subscriptions us
        WHERE us.status IN ('active', 'expired')
        AND us.end_date < NOW() - INTERVAL '7 days'
        AND us.end_date >= NOW() - INTERVAL '8 days'
    )
    UPDATE electronics e SET is_available = FALSE, updated_at = NOW()
    FROM expired_users eu WHERE e.seller_id = eu.user_id AND e.is_available = TRUE;

    UPDATE fashion f SET is_available = FALSE, updated_at = NOW()
    FROM (SELECT user_id FROM user_subscriptions WHERE status IN ('active', 'expired') AND end_date < NOW() - INTERVAL '7 days' AND end_date >= NOW() - INTERVAL '8 days') eu
    WHERE f.seller_id = eu.user_id AND f.is_available = TRUE;

    UPDATE cosmetics c SET is_available = FALSE, updated_at = NOW()
    FROM (SELECT user_id FROM user_subscriptions WHERE status IN ('active', 'expired') AND end_date < NOW() - INTERVAL '7 days' AND end_date >= NOW() - INTERVAL '8 days') eu
    WHERE c.seller_id = eu.user_id AND c.is_available = TRUE;

    UPDATE house_items h SET is_available = FALSE, updated_at = NOW()
    FROM (SELECT user_id FROM user_subscriptions WHERE status IN ('active', 'expired') AND end_date < NOW() - INTERVAL '7 days' AND end_date >= NOW() - INTERVAL '8 days') eu
    WHERE h.seller_id = eu.user_id AND h.is_available = TRUE;

    UPDATE cars ca SET is_available = FALSE, updated_at = NOW()
    FROM (SELECT user_id FROM user_subscriptions WHERE status IN ('active', 'expired') AND end_date < NOW() - INTERVAL '7 days' AND end_date >= NOW() - INTERVAL '8 days') eu
    WHERE ca.seller_id = eu.user_id AND ca.is_available = TRUE;

    UPDATE properties_for_sale ps SET is_available = FALSE, updated_at = NOW()
    FROM (SELECT user_id FROM user_subscriptions WHERE status IN ('active', 'expired') AND end_date < NOW() - INTERVAL '7 days' AND end_date >= NOW() - INTERVAL '8 days') eu
    WHERE ps.seller_id = eu.user_id AND ps.is_available = TRUE;

    UPDATE businesses b SET is_available = FALSE, updated_at = NOW()
    FROM (SELECT user_id FROM user_subscriptions WHERE status IN ('active', 'expired') AND end_date < NOW() - INTERVAL '7 days' AND end_date >= NOW() - INTERVAL '8 days') eu
    WHERE b.seller_id = eu.user_id AND b.is_available = TRUE;

    -- Update subscription status to 'expired'
    WITH expired_users AS (
        UPDATE user_subscriptions
        SET status = 'expired',
            updated_at = NOW()
        WHERE status = 'active'
        AND end_date < NOW() - INTERVAL '7 days'
        AND end_date >= NOW() - INTERVAL '8 days'
        RETURNING user_id
    )
    SELECT COUNT(*) INTO v_users_count FROM expired_users;

    -- Send notifications
    INSERT INTO notifications (user_id, type, title, message, is_read)
    SELECT
        us.user_id,
        'system',
        '❌ Listings Deactivated',
        'Your subscription expired more than 7 days ago. All your listings have been deactivated. Renew now to restore them instantly!',
        FALSE
    FROM user_subscriptions us
    WHERE us.status = 'expired'
    AND us.end_date < NOW() - INTERVAL '7 days'
    AND us.end_date >= NOW() - INTERVAL '8 days';

    RETURN QUERY SELECT v_users_count, v_listings_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 3: REACTIVATE LISTINGS ON RENEWAL
-- =====================================================

CREATE OR REPLACE FUNCTION reactivate_listings_on_renewal()
RETURNS TRIGGER AS $$
DECLARE
    v_reactivated_count INTEGER := 0;
BEGIN
    -- Only when status changes to 'active' from 'expired'
    IF NEW.status = 'active' AND (OLD.status = 'expired' OR OLD.status = 'cancelled') THEN

        -- Reactivate rental properties
        UPDATE rental_properties
        SET is_available = TRUE,
            updated_at = NOW()
        WHERE landlord_id = NEW.user_id
        AND listing_status = 'approved'
        AND is_available = FALSE;

        GET DIAGNOSTICS v_reactivated_count = ROW_COUNT;

        -- Reactivate marketplace items
        UPDATE electronics SET is_available = TRUE, updated_at = NOW()
        WHERE seller_id = NEW.user_id AND listing_status = 'approved' AND is_available = FALSE;

        UPDATE fashion SET is_available = TRUE, updated_at = NOW()
        WHERE seller_id = NEW.user_id AND listing_status = 'approved' AND is_available = FALSE;

        UPDATE cosmetics SET is_available = TRUE, updated_at = NOW()
        WHERE seller_id = NEW.user_id AND listing_status = 'approved' AND is_available = FALSE;

        UPDATE house_items SET is_available = TRUE, updated_at = NOW()
        WHERE seller_id = NEW.user_id AND listing_status = 'approved' AND is_available = FALSE;

        UPDATE cars SET is_available = TRUE, updated_at = NOW()
        WHERE seller_id = NEW.user_id AND listing_status = 'approved' AND is_available = FALSE;

        UPDATE properties_for_sale SET is_available = TRUE, updated_at = NOW()
        WHERE seller_id = NEW.user_id AND listing_status = 'approved' AND is_available = FALSE;

        UPDATE businesses SET is_available = TRUE, updated_at = NOW()
        WHERE seller_id = NEW.user_id AND listing_status = 'approved' AND is_available = FALSE;

        -- Send welcome back notification
        INSERT INTO notifications (user_id, type, title, message, is_read)
        VALUES (
            NEW.user_id,
            'system',
            '🎉 Welcome Back!',
            'Your subscription has been renewed! All your listings (' || v_reactivated_count || '+) are now active again and visible in the marketplace.',
            FALSE
        );

        RAISE NOTICE 'Reactivated % listings for user %', v_reactivated_count, NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_reactivate_on_renewal ON user_subscriptions;
CREATE TRIGGER trigger_reactivate_on_renewal
AFTER UPDATE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION reactivate_listings_on_renewal();

-- =====================================================
-- PART 4: GRACE PERIOD WARNINGS
-- =====================================================

CREATE OR REPLACE FUNCTION send_grace_period_warnings()
RETURNS TABLE(notifications_sent INTEGER) AS $$
DECLARE
    v_sent_count INTEGER := 0;
BEGIN
    -- Day 3 warning (4 days left)
    WITH notified AS (
        INSERT INTO notifications (user_id, type, title, message, is_read)
        SELECT
            us.user_id,
            'system',
            '⚠️ Grace Period: 4 Days Remaining',
            'Your subscription expired 3 days ago. You have 4 days left before your listings are deactivated. Renew now!',
            FALSE
        FROM user_subscriptions us
        WHERE us.status IN ('active', 'expired')
        AND us.end_date BETWEEN NOW() - INTERVAL '4 days' AND NOW() - INTERVAL '3 days'
        AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = us.user_id
            AND n.title LIKE '%4 Days Remaining%'
            AND n.created_at > NOW() - INTERVAL '2 days'
        )
        RETURNING user_id
    )
    SELECT COUNT(*) INTO v_sent_count FROM notified;

    -- Day 6 warning (1 day left - URGENT)
    WITH notified AS (
        INSERT INTO notifications (user_id, type, title, message, is_read)
        SELECT
            us.user_id,
            'system',
            '🚨 URGENT: Last Day of Grace Period!',
            'Your subscription expired 6 days ago. Your listings will be deactivated TOMORROW! Renew now to keep them active.',
            FALSE
        FROM user_subscriptions us
        WHERE us.status IN ('active', 'expired')
        AND us.end_date BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '6 days'
        AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = us.user_id
            AND n.title LIKE '%Last Day%'
            AND n.created_at > NOW() - INTERVAL '2 days'
        )
        RETURNING user_id
    )
    SELECT v_sent_count + COUNT(*) INTO v_sent_count FROM notified;

    RETURN QUERY SELECT v_sent_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 5: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_user_subscription_scenario TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_listings_after_grace_period TO service_role;
GRANT EXECUTE ON FUNCTION send_grace_period_warnings TO service_role;

-- =====================================================
-- PART 6: CRON JOB SETUP INSTRUCTIONS
-- =====================================================

/*
Setup these cron jobs in Supabase Dashboard → Database → Cron:

1. Daily at midnight - Deactivate listings after grace
   SELECT * FROM deactivate_listings_after_grace_period();

2. Daily at 9 AM - Send grace period warnings
   SELECT * FROM send_grace_period_warnings();

3. Monthly on 1st - Reset quotas
   SELECT * FROM reset_user_monthly_media_quotas();
*/

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '✅ 3-SCENARIO SYSTEM INSTALLED!' as status;

-- Test the status function
SELECT
    'Test: Get Scenario for All Users' as test,
    p.full_name,
    s.*
FROM profiles p
CROSS JOIN LATERAL get_user_subscription_scenario(p.id) s
WHERE p.role IN ('landlord', 'seller')
ORDER BY p.created_at DESC
LIMIT 5;

SELECT
    '📋 Next Steps:' as info,
    '1. Setup 2 cron jobs (see above)' as step_1,
    '2. Test with test_all_scenarios.sql' as step_2,
    '3. Update mobile app to use get_user_subscription_scenario()' as step_3;

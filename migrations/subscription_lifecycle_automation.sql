-- =====================================================
-- SUBSCRIPTION LIFECYCLE AUTOMATION
-- =====================================================
-- This migration adds:
-- 1. Auto-deactivate listings when subscription expires
-- 2. Auto-reactivate listings when subscription is renewed
-- 3. Enhanced expiry notifications
-- 4. Grace period handling
-- =====================================================

-- =====================================================
-- PART 1: DEACTIVATE LISTINGS ON EXPIRY
-- =====================================================

CREATE OR REPLACE FUNCTION deactivate_listings_on_subscription_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run when status changes from active to expired
    IF NEW.status = 'expired' AND OLD.status = 'active' THEN

        -- Deactivate rental properties
        UPDATE rental_properties
        SET
            is_available = FALSE,
            updated_at = NOW()
        WHERE landlord_id = NEW.user_id
        AND is_available = TRUE;

        -- Deactivate electronics
        UPDATE electronics
        SET
            is_available = FALSE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = TRUE;

        -- Deactivate fashion items
        UPDATE fashion
        SET
            is_available = FALSE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = TRUE;

        -- Deactivate cosmetics
        UPDATE cosmetics
        SET
            is_available = FALSE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = TRUE;

        -- Deactivate house items
        UPDATE house_items
        SET
            is_available = FALSE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = TRUE;

        -- Deactivate cars
        UPDATE cars
        SET
            is_available = FALSE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = TRUE;

        -- Deactivate properties for sale
        UPDATE properties_for_sale
        SET
            is_available = FALSE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = TRUE;

        -- Deactivate businesses
        UPDATE businesses
        SET
            is_available = FALSE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = TRUE;

        -- Send notification
        INSERT INTO notifications (user_id, type, title, message, is_read)
        VALUES (
            NEW.user_id,
            'system',
            '⚠️ Subscription Expired',
            'Your subscription has expired and all your listings have been deactivated. Renew now to restore visibility.',
            FALSE
        );

        RAISE NOTICE 'Deactivated all listings for user % due to subscription expiry', NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_subscription_expired ON user_subscriptions;
CREATE TRIGGER on_subscription_expired
AFTER UPDATE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION deactivate_listings_on_subscription_expiry();

-- =====================================================
-- PART 2: REACTIVATE LISTINGS ON RENEWAL
-- =====================================================

CREATE OR REPLACE FUNCTION reactivate_listings_on_subscription_renewal()
RETURNS TRIGGER AS $$
DECLARE
    total_reactivated INTEGER := 0;
    rental_count INTEGER := 0;
    marketplace_count INTEGER := 0;
BEGIN
    -- Only run when status changes to active from expired/cancelled
    IF NEW.status = 'active' AND (OLD.status = 'expired' OR OLD.status = 'cancelled') THEN

        -- Reactivate rental properties (only approved ones)
        UPDATE rental_properties
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE landlord_id = NEW.user_id
        AND listing_status = 'approved'
        AND is_available = FALSE;

        GET DIAGNOSTICS rental_count = ROW_COUNT;

        -- Reactivate electronics
        UPDATE electronics
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND listing_status = 'approved'
        AND is_available = FALSE;

        -- Reactivate fashion items
        UPDATE fashion
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND listing_status = 'approved'
        AND is_available = FALSE;

        -- Reactivate cosmetics
        UPDATE cosmetics
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND listing_status = 'approved'
        AND is_available = FALSE;

        -- Reactivate house items
        UPDATE house_items
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND listing_status = 'approved'
        AND is_available = FALSE;

        -- Reactivate cars
        UPDATE cars
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND listing_status = 'approved'
        AND is_available = FALSE;

        -- Reactivate properties for sale
        UPDATE properties_for_sale
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND listing_status = 'approved'
        AND is_available = FALSE;

        -- Reactivate businesses
        UPDATE businesses
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND listing_status = 'approved'
        AND is_available = FALSE;

        -- Get total marketplace count
        SELECT
            COUNT(*) INTO marketplace_count
        FROM (
            SELECT id FROM electronics WHERE seller_id = NEW.user_id AND is_available = TRUE
            UNION ALL
            SELECT id FROM fashion WHERE seller_id = NEW.user_id AND is_available = TRUE
            UNION ALL
            SELECT id FROM cosmetics WHERE seller_id = NEW.user_id AND is_available = TRUE
            UNION ALL
            SELECT id FROM house_items WHERE seller_id = NEW.user_id AND is_available = TRUE
            UNION ALL
            SELECT id FROM cars WHERE seller_id = NEW.user_id AND is_available = TRUE
            UNION ALL
            SELECT id FROM properties_for_sale WHERE seller_id = NEW.user_id AND is_available = TRUE
            UNION ALL
            SELECT id FROM businesses WHERE seller_id = NEW.user_id AND is_available = TRUE
        ) AS all_items;

        total_reactivated := rental_count + marketplace_count;

        -- Send welcome back notification
        INSERT INTO notifications (user_id, type, title, message, is_read)
        VALUES (
            NEW.user_id,
            'system',
            '🎉 Welcome Back!',
            'Your subscription has been renewed! ' || total_reactivated || ' listings are now active again (' ||
            rental_count || ' properties, ' || marketplace_count || ' marketplace items).',
            FALSE
        );

        RAISE NOTICE 'Reactivated % listings for user % after subscription renewal', total_reactivated, NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_subscription_renewed ON user_subscriptions;
CREATE TRIGGER on_subscription_renewed
AFTER UPDATE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION reactivate_listings_on_subscription_renewal();

-- =====================================================
-- PART 3: ENHANCED EXPIRY CHECKING WITH GRACE PERIOD
-- =====================================================

-- Updated function with 7-day grace period
CREATE OR REPLACE FUNCTION check_expired_subscriptions_with_grace()
RETURNS TABLE(
    expired_count INTEGER,
    grace_period_count INTEGER,
    total_deactivated INTEGER
) AS $$
DECLARE
    v_expired_count INTEGER := 0;
    v_grace_count INTEGER := 0;
    v_deactivated_count INTEGER := 0;
BEGIN
    -- Mark subscriptions as expired (7 days after end_date)
    WITH expired_subs AS (
        UPDATE user_subscriptions
        SET status = 'expired',
            updated_at = NOW()
        WHERE status = 'active'
        AND end_date < NOW() - INTERVAL '7 days'
        RETURNING user_id
    )
    SELECT COUNT(*) INTO v_expired_count FROM expired_subs;

    -- Count subscriptions in grace period (0-7 days after expiry)
    SELECT COUNT(*) INTO v_grace_count
    FROM user_subscriptions
    WHERE status = 'active'
    AND end_date < NOW()
    AND end_date >= NOW() - INTERVAL '7 days';

    -- Send grace period warnings
    INSERT INTO notifications (user_id, type, title, message, is_read)
    SELECT
        user_id,
        'system',
        '⚠️ Subscription Expired - Grace Period',
        'Your subscription expired on ' || TO_CHAR(end_date, 'DD Mon YYYY') || '. You have ' ||
        EXTRACT(DAY FROM (end_date + INTERVAL '7 days' - NOW()))::INTEGER ||
        ' days remaining before your listings are deactivated. Renew now!',
        FALSE
    FROM user_subscriptions
    WHERE status = 'active'
    AND end_date < NOW()
    AND end_date >= NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = user_subscriptions.user_id
        AND n.title LIKE '%Grace Period%'
        AND n.created_at > NOW() - INTERVAL '24 hours'
    );

    RETURN QUERY SELECT v_expired_count, v_grace_count, v_deactivated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 4: IMPROVED EXPIRING SOON NOTIFICATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION send_expiring_soon_notifications()
RETURNS TABLE(notifications_sent INTEGER) AS $$
DECLARE
    v_sent_count INTEGER := 0;
BEGIN
    -- Notify users with subscriptions expiring in 3 days
    WITH notified_users AS (
        INSERT INTO notifications (user_id, type, title, message, is_read)
        SELECT
            us.user_id,
            'system',
            '⏰ Subscription Expiring Soon',
            'Your ' || sp.display_name || ' subscription expires in 3 days on ' ||
            TO_CHAR(us.end_date, 'DD Mon YYYY') || '. Renew now to avoid service interruption!',
            FALSE
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active'
        AND us.end_date BETWEEN NOW() + INTERVAL '2 days' AND NOW() + INTERVAL '4 days'
        AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = us.user_id
            AND n.title LIKE '%Expiring Soon%'
            AND n.created_at > NOW() - INTERVAL '7 days'
        )
        RETURNING user_id
    )
    SELECT COUNT(*) INTO v_sent_count FROM notified_users;

    -- Notify users with subscriptions expiring in 1 day (urgent)
    WITH urgent_notified AS (
        INSERT INTO notifications (user_id, type, title, message, is_read)
        SELECT
            us.user_id,
            'system',
            '🚨 Subscription Expires Tomorrow!',
            'URGENT: Your ' || sp.display_name || ' subscription expires tomorrow! Renew now to keep your ' ||
            us.listings_used || ' listings active.',
            FALSE
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active'
        AND us.end_date BETWEEN NOW() AND NOW() + INTERVAL '2 days'
        AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = us.user_id
            AND n.title LIKE '%Expires Tomorrow%'
            AND n.created_at > NOW() - INTERVAL '2 days'
        )
        RETURNING user_id
    )
    SELECT v_sent_count + COUNT(*) INTO v_sent_count FROM urgent_notified;

    RETURN QUERY SELECT v_sent_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 5: CRON JOB SETUP INSTRUCTIONS
-- =====================================================

-- These functions should be called via Supabase Cron Jobs:
--
-- 1. Daily at 00:00 UTC - Check expired subscriptions
--    SELECT * FROM check_expired_subscriptions_with_grace();
--
-- 2. Daily at 09:00 UTC - Send expiring notifications
--    SELECT * FROM send_expiring_soon_notifications();
--
-- 3. Monthly on 1st at 00:00 UTC - Reset quotas
--    SELECT * FROM reset_user_monthly_media_quotas();

-- =====================================================
-- PART 6: MANUAL TESTING FUNCTIONS
-- =====================================================

-- Test subscription expiry for a specific user
CREATE OR REPLACE FUNCTION test_expire_subscription(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    v_result TEXT;
BEGIN
    UPDATE user_subscriptions
    SET status = 'expired',
        updated_at = NOW()
    WHERE user_id = user_uuid
    AND status = 'active';

    IF FOUND THEN
        v_result := 'Subscription expired for user ' || user_uuid || '. Check listings status.';
    ELSE
        v_result := 'No active subscription found for user ' || user_uuid;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test subscription renewal for a specific user
CREATE OR REPLACE FUNCTION test_renew_subscription(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    v_result TEXT;
BEGIN
    UPDATE user_subscriptions
    SET status = 'active',
        end_date = NOW() + INTERVAL '30 days',
        updated_at = NOW()
    WHERE user_id = user_uuid
    AND status IN ('expired', 'cancelled');

    IF FOUND THEN
        v_result := 'Subscription renewed for user ' || user_uuid || '. Check listings status.';
    ELSE
        v_result := 'No expired/cancelled subscription found for user ' || user_uuid;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 7: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION check_expired_subscriptions_with_grace TO service_role;
GRANT EXECUTE ON FUNCTION send_expiring_soon_notifications TO service_role;
GRANT EXECUTE ON FUNCTION test_expire_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION test_renew_subscription TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that triggers are created
SELECT
    'Subscription Lifecycle Triggers' as info,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN ('on_subscription_expired', 'on_subscription_renewed')
ORDER BY trigger_name;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT '✅ Subscription Lifecycle Automation Complete!' as status,
       'Auto-deactivate on expiry ✓' as feature_1,
       'Auto-reactivate on renewal ✓' as feature_2,
       '7-day grace period ✓' as feature_3,
       'Enhanced notifications ✓' as feature_4,
       'Testing functions included ✓' as feature_5;

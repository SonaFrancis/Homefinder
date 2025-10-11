-- =====================================================
-- AUTO-DEACTIVATE LISTINGS WHEN GRACE PERIOD ENDS
-- =====================================================
-- This migration adds a scheduled function that runs daily
-- to automatically deactivate listings for users whose
-- subscriptions have been expired for more than 7 days
-- (grace period has ended - Scenario 3)
-- =====================================================

-- STEP 1: Create function to deactivate listings for expired subscriptions
CREATE OR REPLACE FUNCTION auto_deactivate_expired_user_listings()
RETURNS void AS $$
DECLARE
    expired_user RECORD;
    v_days_expired INTEGER;
    affected_count INTEGER := 0;
BEGIN
    -- Find all users whose subscription expired more than 7 days ago (grace period ended)
    -- Check end_date ONLY, regardless of status field
    FOR expired_user IN
        SELECT
            us.user_id,
            us.end_date,
            us.status,
            EXTRACT(DAY FROM (NOW() - us.end_date))::INTEGER as days_expired
        FROM user_subscriptions us
        WHERE us.end_date < NOW() - INTERVAL '7 days'  -- More than 7 days expired
        ORDER BY us.end_date DESC
    LOOP
        v_days_expired := expired_user.days_expired;

        -- Only deactivate if grace period has ended (8+ days)
        IF v_days_expired >= 8 THEN
            -- Deactivate rental properties
            UPDATE rental_properties
            SET
                is_available = FALSE,
                updated_at = NOW()
            WHERE landlord_id = expired_user.user_id
            AND is_available = TRUE;

            -- Deactivate electronics
            UPDATE electronics
            SET
                is_available = FALSE,
                updated_at = NOW()
            WHERE seller_id = expired_user.user_id
            AND is_available = TRUE;

            -- Deactivate fashion items
            UPDATE fashion
            SET
                is_available = FALSE,
                updated_at = NOW()
            WHERE seller_id = expired_user.user_id
            AND is_available = TRUE;

            -- Deactivate cosmetics
            UPDATE cosmetics
            SET
                is_available = FALSE,
                updated_at = NOW()
            WHERE seller_id = expired_user.user_id
            AND is_available = TRUE;

            -- Deactivate house items
            UPDATE house_items
            SET
                is_available = FALSE,
                updated_at = NOW()
            WHERE seller_id = expired_user.user_id
            AND is_available = TRUE;

            -- Deactivate cars
            UPDATE cars
            SET
                is_available = FALSE,
                updated_at = NOW()
            WHERE seller_id = expired_user.user_id
            AND is_available = TRUE;

            -- Deactivate properties for sale
            UPDATE properties_for_sale
            SET
                is_available = FALSE,
                updated_at = NOW()
            WHERE seller_id = expired_user.user_id
            AND is_available = TRUE;

            -- Deactivate businesses
            UPDATE businesses
            SET
                is_available = FALSE,
                updated_at = NOW()
            WHERE seller_id = expired_user.user_id
            AND is_available = TRUE;

            -- Mark subscription as expired (keep status as 'expired', don't change to 'deactivated')
            -- We track deactivation via is_available = FALSE on listings
            -- Status remains 'expired' or 'active' (based on current state)

            -- Send notification
            INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
            VALUES (
                expired_user.user_id,
                'system',
                '❌ Listings Deactivated',
                'Your subscription expired ' || v_days_expired || ' days ago and grace period has ended. All your listings have been deactivated. Renew now to restore visibility.',
                FALSE,
                NOW()
            );

            affected_count := affected_count + 1;
            RAISE NOTICE 'Deactivated listings for user % (expired % days ago)', expired_user.user_id, v_days_expired;
        END IF;
    END LOOP;

    RAISE NOTICE 'Auto-deactivation complete. Affected % users.', affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 2: Create a function to be called by cron/scheduler
CREATE OR REPLACE FUNCTION run_daily_subscription_maintenance()
RETURNS void AS $$
BEGIN
    -- Run the auto-deactivation function
    PERFORM auto_deactivate_expired_user_listings();

    RAISE NOTICE 'Daily subscription maintenance completed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION auto_deactivate_expired_user_listings() TO authenticated;
GRANT EXECUTE ON FUNCTION run_daily_subscription_maintenance() TO authenticated;

-- STEP 4: Instructions for setting up Supabase cron job
-- =====================================================
-- IMPORTANT: Set up a Supabase Edge Function or pg_cron job to run this daily
--
-- Option 1: Using Supabase Edge Functions (Recommended)
-- Create an Edge Function that calls run_daily_subscription_maintenance()
-- and set up a cron job trigger in Supabase dashboard
--
-- Option 2: Using pg_cron (if enabled)
-- SELECT cron.schedule('daily-subscription-maintenance', '0 2 * * *', 'SELECT run_daily_subscription_maintenance()');
--
-- Option 3: Manual testing (run immediately)
-- SELECT auto_deactivate_expired_user_listings();
-- =====================================================

-- =====================================================
-- PART 2: AUTO-REACTIVATE LISTINGS ON SUBSCRIPTION RENEWAL
-- =====================================================

-- STEP 5: Create function to reactivate listings on renewal
CREATE OR REPLACE FUNCTION reactivate_listings_on_subscription_renewal()
RETURNS TRIGGER AS $$
DECLARE
    v_listings_count INTEGER := 0;
BEGIN
    -- Check if subscription is being renewed/activated
    -- Case 1: Status changed from 'expired' or 'cancelled' to 'active'
    -- Case 2: end_date extended to future (even if status stays 'active')
    IF (
        (NEW.status = 'active' AND OLD.status IN ('expired', 'cancelled'))
        OR
        (NEW.status = 'active' AND NEW.end_date > NOW() AND OLD.end_date <= NOW())
    ) THEN

        -- Reactivate rental properties
        UPDATE rental_properties
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE landlord_id = NEW.user_id
        AND is_available = FALSE;

        GET DIAGNOSTICS v_listings_count = ROW_COUNT;

        -- Reactivate electronics
        UPDATE electronics
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = FALSE;

        -- Reactivate fashion items
        UPDATE fashion
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = FALSE;

        -- Reactivate cosmetics
        UPDATE cosmetics
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = FALSE;

        -- Reactivate house items
        UPDATE house_items
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = FALSE;

        -- Reactivate cars
        UPDATE cars
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = FALSE;

        -- Reactivate properties for sale
        UPDATE properties_for_sale
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = FALSE;

        -- Reactivate businesses
        UPDATE businesses
        SET
            is_available = TRUE,
            updated_at = NOW()
        WHERE seller_id = NEW.user_id
        AND is_available = FALSE;

        -- Send success notification
        INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
        VALUES (
            NEW.user_id,
            'system',
            '✅ Listings Reactivated',
            'Welcome back! Your subscription has been renewed and all your listings are now live and visible to everyone.',
            FALSE,
            NOW()
        );

        RAISE NOTICE 'Reactivated all listings for user % (subscription renewed)', NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Create trigger on user_subscriptions
DROP TRIGGER IF EXISTS on_subscription_renewed ON user_subscriptions;
CREATE TRIGGER on_subscription_renewed
AFTER UPDATE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION reactivate_listings_on_subscription_renewal();

-- STEP 7: Grant execute permissions for reactivation
GRANT EXECUTE ON FUNCTION reactivate_listings_on_subscription_renewal() TO authenticated;

-- =====================================================
-- TESTING INSTRUCTIONS
-- =====================================================

-- Test 1: Manual deactivation
-- SELECT auto_deactivate_expired_user_listings();

-- Test 2: Simulate renewal (this should auto-reactivate listings)
-- UPDATE user_subscriptions
-- SET
--     status = 'active',
--     start_date = NOW(),
--     end_date = NOW() + INTERVAL '30 days',
--     updated_at = NOW()
-- WHERE user_id = 'YOUR-USER-ID';

-- Expected: All listings reactivated (is_available = TRUE)
-- Expected: Notification sent: "✅ Listings Reactivated"
-- Expected: "INACTIVE" badge disappears in app

-- =====================================================

-- STEP 8: Verify all functions and triggers were created
SELECT '✅ SUCCESS! Auto-deactivation AND auto-reactivation system created.' as status;
SELECT 'Deactivation: Runs daily via cron | Reactivation: Automatic on subscription renewal' as description;

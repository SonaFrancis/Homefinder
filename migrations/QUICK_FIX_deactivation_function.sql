-- =====================================================
-- QUICK FIX: Update deactivation function to work with existing enum
-- =====================================================
-- This fixes the "invalid input value for enum" error
-- by not trying to set status to 'deactivated'
-- =====================================================

-- Drop and recreate the deactivation function
DROP FUNCTION IF EXISTS auto_deactivate_expired_user_listings();

CREATE OR REPLACE FUNCTION auto_deactivate_expired_user_listings()
RETURNS void AS $$
DECLARE
    expired_user RECORD;
    v_days_expired INTEGER;
    affected_count INTEGER := 0;
BEGIN
    -- Find all users whose subscription expired more than 7 days ago (grace period ended)
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

            -- Send notification (don't change subscription status)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_deactivate_expired_user_listings() TO authenticated;

-- Test it now!
SELECT '✅ Function fixed! Now run: SELECT auto_deactivate_expired_user_listings();' as status;

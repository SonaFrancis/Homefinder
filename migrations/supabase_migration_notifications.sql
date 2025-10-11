-- =====================================================
-- NOTIFICATION SYSTEM MIGRATION
-- Run this AFTER the main schema has been created
-- =====================================================

-- =====================================================
-- NEW LISTING NOTIFICATION FUNCTIONS (For all users)
-- =====================================================

-- Function to notify all users (except poster) when rental property is approved
CREATE OR REPLACE FUNCTION notify_new_rental_property()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify when listing status changes to 'approved'
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        INSERT INTO notifications (user_id, type, title, message)
        SELECT
            id,
            'system',
            '🏠 New Property Available!',
            'New rental property "' || NEW.title || '" is now available in ' || NEW.city
        FROM profiles
        WHERE id != NEW.landlord_id; -- Exclude the landlord
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify all users when electronics item is approved
CREATE OR REPLACE FUNCTION notify_new_electronics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        INSERT INTO notifications (user_id, type, title, message)
        SELECT id, 'system', '🛍️ New Item Listed!',
               'New Electronics "' || NEW.title || '" is now available in ' || NEW.city
        FROM profiles WHERE id != NEW.seller_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify all users when cars item is approved
CREATE OR REPLACE FUNCTION notify_new_cars()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        INSERT INTO notifications (user_id, type, title, message)
        SELECT id, 'system', '🛍️ New Item Listed!',
               'New Car "' || NEW.title || '" is now available in ' || NEW.city
        FROM profiles WHERE id != NEW.seller_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify all users when fashion item is approved
CREATE OR REPLACE FUNCTION notify_new_fashion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        INSERT INTO notifications (user_id, type, title, message)
        SELECT id, 'system', '🛍️ New Item Listed!',
               'New Fashion "' || NEW.title || '" is now available in ' || NEW.city
        FROM profiles WHERE id != NEW.seller_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify all users when cosmetics item is approved
CREATE OR REPLACE FUNCTION notify_new_cosmetics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        INSERT INTO notifications (user_id, type, title, message)
        SELECT id, 'system', '🛍️ New Item Listed!',
               'New Cosmetics "' || NEW.title || '" is now available in ' || NEW.city
        FROM profiles WHERE id != NEW.seller_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify all users when house items is approved
CREATE OR REPLACE FUNCTION notify_new_house_items()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        INSERT INTO notifications (user_id, type, title, message)
        SELECT id, 'system', '🛍️ New Item Listed!',
               'New House Item "' || NEW.title || '" is now available in ' || NEW.city
        FROM profiles WHERE id != NEW.seller_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify all users when businesses is approved
CREATE OR REPLACE FUNCTION notify_new_businesses()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        INSERT INTO notifications (user_id, type, title, message)
        SELECT id, 'system', '🛍️ New Item Listed!',
               'New Business "' || NEW.title || '" is now available in ' || NEW.city
        FROM profiles WHERE id != NEW.seller_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify all users when properties for sale is approved
CREATE OR REPLACE FUNCTION notify_new_properties_for_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        INSERT INTO notifications (user_id, type, title, message)
        SELECT id, 'system', '🛍️ New Item Listed!',
               'New Property For Sale "' || NEW.title || '" is now available in ' || NEW.city
        FROM profiles WHERE id != NEW.seller_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE TRIGGERS FOR NEW LISTING NOTIFICATIONS
-- =====================================================

-- Drop existing triggers if they exist (to avoid errors)
DROP TRIGGER IF EXISTS notify_rental_property_approved ON rental_properties;
DROP TRIGGER IF EXISTS notify_electronics_approved ON electronics;
DROP TRIGGER IF EXISTS notify_cars_approved ON cars;
DROP TRIGGER IF EXISTS notify_fashion_approved ON fashion;
DROP TRIGGER IF EXISTS notify_cosmetics_approved ON cosmetics;
DROP TRIGGER IF EXISTS notify_house_items_approved ON house_items;
DROP TRIGGER IF EXISTS notify_businesses_approved ON businesses;
DROP TRIGGER IF EXISTS notify_properties_for_sale_approved ON properties_for_sale;

-- Trigger for rental properties
CREATE TRIGGER notify_rental_property_approved
    AFTER UPDATE ON rental_properties
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_rental_property();

-- Triggers for marketplace categories
CREATE TRIGGER notify_electronics_approved
    AFTER UPDATE ON electronics
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_electronics();

CREATE TRIGGER notify_cars_approved
    AFTER UPDATE ON cars
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_cars();

CREATE TRIGGER notify_fashion_approved
    AFTER UPDATE ON fashion
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_fashion();

CREATE TRIGGER notify_cosmetics_approved
    AFTER UPDATE ON cosmetics
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_cosmetics();

CREATE TRIGGER notify_house_items_approved
    AFTER UPDATE ON house_items
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_house_items();

CREATE TRIGGER notify_businesses_approved
    AFTER UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_businesses();

CREATE TRIGGER notify_properties_for_sale_approved
    AFTER UPDATE ON properties_for_sale
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_properties_for_sale();

-- =====================================================
-- AUTO-CLEANUP OLD NOTIFICATIONS (24 HOURS)
-- =====================================================

-- Function to delete notifications older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- OPTIONAL: Setup Cron Job for Auto-Cleanup
-- =====================================================
-- Note: This requires pg_cron extension to be enabled
-- You can also run cleanup manually or from your app

-- Enable pg_cron extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run every hour
-- SELECT cron.schedule(
--     'cleanup-old-notifications',
--     '0 * * * *', -- Every hour
--     'SELECT cleanup_old_notifications();'
-- );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these queries to verify the migration was successful:

-- 1. Check if functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('notify_new_rental_property', 'notify_new_marketplace_item', 'cleanup_old_notifications');

-- 2. Check if triggers exist
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'notify_%_approved';

-- =====================================================
-- DONE!
-- =====================================================
-- The notification system is now active.
--
-- How it works:
-- 1. When admin approves a listing (sets listing_status = 'approved')
-- 2. Trigger fires and creates notifications for all users except the poster
-- 3. App receives real-time notification via Supabase Realtime
-- 4. Sound plays and badge updates
-- 5. Notifications auto-delete after 24 hours
-- =====================================================

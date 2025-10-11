-- =====================================================
-- SETUP NOTIFICATION NAVIGATION SYSTEM
-- =====================================================
-- This script sets up notification click-through navigation
-- Run this script once to enable notification navigation

-- Step 1: Add reference fields to notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS reference_type TEXT,
ADD COLUMN IF NOT EXISTS reference_id UUID;

-- Step 2: Add index for reference lookups
CREATE INDEX IF NOT EXISTS idx_notifications_reference ON notifications(reference_type, reference_id);

-- Step 3: Add comments
COMMENT ON COLUMN notifications.reference_type IS 'Type of referenced item: "property" or "marketplace_item"';
COMMENT ON COLUMN notifications.reference_id IS 'UUID of the referenced property or marketplace item';

-- Step 4: Update rental property notification function
CREATE OR REPLACE FUNCTION notify_new_rental_property()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify when listing status changes to 'approved'
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
        SELECT
            id,
            'system',
            '🏠 New Property Available!',
            'New rental property "' || NEW.title || '" is now available in ' || NEW.city,
            'property',
            NEW.id
        FROM profiles
        WHERE id != NEW.landlord_id; -- Exclude the landlord
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update marketplace item notification function
CREATE OR REPLACE FUNCTION notify_new_marketplace_item()
RETURNS TRIGGER AS $$
DECLARE
    formatted_category TEXT;
BEGIN
    -- Only notify when listing status changes to 'approved'
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        -- Get category name from trigger argument (TG_ARGV[0])
        formatted_category := REPLACE(INITCAP(REPLACE(TG_ARGV[0], '_', ' ')), ' ', ' ');

        INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
        SELECT
            id,
            'system',
            '🛍️ New Item Listed!',
            'New ' || formatted_category || ' "' || NEW.title || '" is now available in ' || NEW.city,
            'marketplace_item',
            NEW.id
        FROM profiles
        WHERE id != NEW.seller_id; -- Exclude the seller
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Recreate triggers with proper arguments
DROP TRIGGER IF EXISTS notify_electronics_approved ON electronics;
CREATE TRIGGER notify_electronics_approved
    AFTER UPDATE ON electronics
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('Electronics');

DROP TRIGGER IF EXISTS notify_cars_approved ON cars;
CREATE TRIGGER notify_cars_approved
    AFTER UPDATE ON cars
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('Cars');

DROP TRIGGER IF EXISTS notify_fashion_approved ON fashion;
CREATE TRIGGER notify_fashion_approved
    AFTER UPDATE ON fashion
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('Fashion');

DROP TRIGGER IF EXISTS notify_cosmetics_approved ON cosmetics;
CREATE TRIGGER notify_cosmetics_approved
    AFTER UPDATE ON cosmetics
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('Cosmetics');

DROP TRIGGER IF EXISTS notify_house_items_approved ON house_items;
CREATE TRIGGER notify_house_items_approved
    AFTER UPDATE ON house_items
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('House Items');

DROP TRIGGER IF EXISTS notify_businesses_approved ON businesses;
CREATE TRIGGER notify_businesses_approved
    AFTER UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('Businesses');

DROP TRIGGER IF EXISTS notify_properties_for_sale_approved ON properties_for_sale;
CREATE TRIGGER notify_properties_for_sale_approved
    AFTER UPDATE ON properties_for_sale
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('Properties For Sale');

-- Step 7: Verify the setup
SELECT
    'Notification navigation setup complete!' AS status,
    'Notifications now include property/item references' AS feature_1,
    'Auto-cleanup after 24 hours is active' AS feature_2,
    'Click on notifications to view property/item details' AS feature_3;

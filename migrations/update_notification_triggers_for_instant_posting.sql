-- =====================================================
-- UPDATE NOTIFICATION TRIGGERS FOR INSTANT POSTING
-- =====================================================
-- Since approval is removed, notifications fire on INSERT

-- Step 0: Add category column to notifications table for marketplace items
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN notifications.category IS 'Category of marketplace item (electronics, cars, fashion, etc.)';

-- Step 1: Update rental property notification function
CREATE OR REPLACE FUNCTION notify_new_rental_property()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify all users when a new property is posted
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update marketplace item notification function
CREATE OR REPLACE FUNCTION notify_new_marketplace_item()
RETURNS TRIGGER AS $$
DECLARE
    formatted_category TEXT;
    category_key TEXT;
BEGIN
    -- Get category key from trigger argument (TG_ARGV[0]) - this is the table-friendly name
    category_key := TG_ARGV[0];

    -- Get formatted category name for display
    formatted_category := REPLACE(INITCAP(REPLACE(category_key, '_', ' ')), ' ', ' ');

    -- Notify all users when a new item is posted
    INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id, category)
    SELECT
        id,
        'system',
        '🛍️ New Item Listed!',
        'New ' || formatted_category || ' "' || NEW.title || '" is now available in ' || NEW.city,
        'marketplace_item',
        NEW.id,
        category_key
    FROM profiles
    WHERE id != NEW.seller_id; -- Exclude the seller

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Drop old UPDATE triggers and create new INSERT triggers for rental properties
DROP TRIGGER IF EXISTS notify_rental_property_approved ON rental_properties;
DROP TRIGGER IF EXISTS notify_rental_property_insert ON rental_properties;

CREATE TRIGGER notify_rental_property_insert
    AFTER INSERT ON rental_properties
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_rental_property();

-- Step 4: Drop old UPDATE triggers and create new INSERT triggers for marketplace items
DROP TRIGGER IF EXISTS notify_electronics_approved ON electronics;
DROP TRIGGER IF EXISTS notify_electronics_insert ON electronics;
CREATE TRIGGER notify_electronics_insert
    AFTER INSERT ON electronics
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('electronics');

DROP TRIGGER IF EXISTS notify_cars_approved ON cars;
DROP TRIGGER IF EXISTS notify_cars_insert ON cars;
CREATE TRIGGER notify_cars_insert
    AFTER INSERT ON cars
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('cars');

DROP TRIGGER IF EXISTS notify_fashion_approved ON fashion;
DROP TRIGGER IF EXISTS notify_fashion_insert ON fashion;
CREATE TRIGGER notify_fashion_insert
    AFTER INSERT ON fashion
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('fashion');

DROP TRIGGER IF EXISTS notify_cosmetics_approved ON cosmetics;
DROP TRIGGER IF EXISTS notify_cosmetics_insert ON cosmetics;
CREATE TRIGGER notify_cosmetics_insert
    AFTER INSERT ON cosmetics
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('cosmetics');

DROP TRIGGER IF EXISTS notify_house_items_approved ON house_items;
DROP TRIGGER IF EXISTS notify_house_items_insert ON house_items;
CREATE TRIGGER notify_house_items_insert
    AFTER INSERT ON house_items
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('house_items');

DROP TRIGGER IF EXISTS notify_businesses_approved ON businesses;
DROP TRIGGER IF EXISTS notify_businesses_insert ON businesses;
CREATE TRIGGER notify_businesses_insert
    AFTER INSERT ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('businesses');

DROP TRIGGER IF EXISTS notify_properties_for_sale_approved ON properties_for_sale;
DROP TRIGGER IF EXISTS notify_properties_for_sale_insert ON properties_for_sale;
CREATE TRIGGER notify_properties_for_sale_insert
    AFTER INSERT ON properties_for_sale
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_marketplace_item('properties_for_sale');

-- Step 5: Verify the setup
SELECT
    'Notification triggers updated for instant posting!' AS status,
    'Notifications fire on INSERT instead of approval' AS change,
    'reference_type and reference_id are now included' AS feature;

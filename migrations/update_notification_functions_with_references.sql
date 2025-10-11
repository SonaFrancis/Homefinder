-- =====================================================
-- UPDATE NOTIFICATION FUNCTIONS TO INCLUDE REFERENCES
-- =====================================================
-- This updates notification functions to include property/item references

-- First, run the migration to add reference fields if not done yet
-- ALTER TABLE notifications
-- ADD COLUMN IF NOT EXISTS reference_type TEXT,
-- ADD COLUMN IF NOT EXISTS reference_id UUID;

-- Update rental property notification function
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

-- Update marketplace item notification function
CREATE OR REPLACE FUNCTION notify_new_marketplace_item(category_name TEXT)
RETURNS TRIGGER AS $$
DECLARE
    formatted_category TEXT;
BEGIN
    -- Only notify when listing status changes to 'approved'
    IF NEW.listing_status = 'approved' AND (OLD.listing_status IS NULL OR OLD.listing_status != 'approved') THEN
        -- Format category name
        formatted_category := REPLACE(INITCAP(REPLACE(category_name, '_', ' ')), ' ', ' ');

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

-- Success message
SELECT 'Notification functions updated with reference fields!' AS status;

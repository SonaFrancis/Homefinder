-- =====================================================
-- FIX RENTAL PROPERTIES NOTIFICATION TRIGGER
-- This fixes the "seller_id" error when posting rental properties
-- =====================================================

-- Step 1: Drop the old function with CASCADE (this also drops the trigger)
DROP FUNCTION IF EXISTS notify_new_rental_property() CASCADE;

-- Step 2: Recreate the function with correct column name (landlord_id)
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
        WHERE id != NEW.landlord_id; -- Use landlord_id (NOT seller_id)
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate the trigger
CREATE TRIGGER on_rental_property_approved
    AFTER INSERT OR UPDATE ON rental_properties
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_rental_property();

-- Success message
SELECT 'Rental properties notification trigger fixed successfully!' AS status;

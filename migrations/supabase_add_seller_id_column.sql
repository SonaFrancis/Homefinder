-- =====================================================
-- ADD seller_id COLUMN TO rental_properties
-- This will make the table work with triggers expecting seller_id
-- =====================================================

-- Add seller_id column that references the same user as landlord_id
ALTER TABLE rental_properties
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Create a trigger to automatically set seller_id = landlord_id
CREATE OR REPLACE FUNCTION sync_rental_property_ids()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set seller_id to match landlord_id
    NEW.seller_id = NEW.landlord_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert or update
DROP TRIGGER IF EXISTS sync_seller_landlord_ids ON rental_properties;
CREATE TRIGGER sync_seller_landlord_ids
    BEFORE INSERT OR UPDATE ON rental_properties
    FOR EACH ROW
    EXECUTE FUNCTION sync_rental_property_ids();

-- Update existing records to have seller_id = landlord_id
UPDATE rental_properties
SET seller_id = landlord_id
WHERE seller_id IS NULL;

-- Success message
SELECT 'seller_id column added and synced with landlord_id!' AS status;

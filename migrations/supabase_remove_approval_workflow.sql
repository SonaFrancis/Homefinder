-- =====================================================
-- REMOVE APPROVAL WORKFLOW - USE VERIFICATION ONLY
-- All posts are immediately visible, admin just verifies them
-- =====================================================

-- Update listing_status default to 'approved' so all new posts are immediately visible
ALTER TABLE rental_properties
ALTER COLUMN listing_status SET DEFAULT 'approved';

-- Update all existing properties to 'approved' status
UPDATE rental_properties
SET listing_status = 'approved'
WHERE listing_status IN ('pending', 'rejected');

-- Optional: You can also drop the listing_status column entirely if you want
-- and just rely on is_verified for trust indicator
-- Uncomment below if you want to remove listing_status completely:
-- ALTER TABLE rental_properties DROP COLUMN IF EXISTS listing_status;
-- ALTER TABLE rental_properties DROP COLUMN IF EXISTS approved_at;
-- ALTER TABLE rental_properties DROP COLUMN IF EXISTS approved_by;
-- ALTER TABLE rental_properties DROP COLUMN IF EXISTS rejection_reason;

-- For marketplace items, do the same for each category table
-- Update electronics
ALTER TABLE electronics
ALTER COLUMN listing_status SET DEFAULT 'approved';

UPDATE electronics
SET listing_status = 'approved'
WHERE listing_status IN ('pending', 'rejected');

-- Update fashion
ALTER TABLE fashion
ALTER COLUMN listing_status SET DEFAULT 'approved';

UPDATE fashion
SET listing_status = 'approved'
WHERE listing_status IN ('pending', 'rejected');

-- Update cosmetics
ALTER TABLE cosmetics
ALTER COLUMN listing_status SET DEFAULT 'approved';

UPDATE cosmetics
SET listing_status = 'approved'
WHERE listing_status IN ('pending', 'rejected');

-- Update house_items
ALTER TABLE house_items
ALTER COLUMN listing_status SET DEFAULT 'approved';

UPDATE house_items
SET listing_status = 'approved'
WHERE listing_status IN ('pending', 'rejected');

-- Update cars
ALTER TABLE cars
ALTER COLUMN listing_status SET DEFAULT 'approved';

UPDATE cars
SET listing_status = 'approved'
WHERE listing_status IN ('pending', 'rejected');

-- Update properties_for_sale
ALTER TABLE properties_for_sale
ALTER COLUMN listing_status SET DEFAULT 'approved';

UPDATE properties_for_sale
SET listing_status = 'approved'
WHERE listing_status IN ('pending', 'rejected');

-- Update businesses
ALTER TABLE businesses
ALTER COLUMN listing_status SET DEFAULT 'approved';

UPDATE businesses
SET listing_status = 'approved'
WHERE listing_status IN ('pending', 'rejected');

SELECT 'All tables updated - posts are now immediately visible, verification is optional trust badge' AS status;

-- =====================================================
-- ADD VERIFICATION COLUMNS TO RENTAL PROPERTIES
-- Adds is_verified and verified_at columns
-- =====================================================

-- Add is_verified column
ALTER TABLE rental_properties
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Add verified_at column
ALTER TABLE rental_properties
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries on verified properties
CREATE INDEX IF NOT EXISTS idx_rental_properties_is_verified
ON rental_properties(is_verified);

-- Verify columns were added
SELECT 'Verification columns added to rental_properties table' AS status;

-- Show the updated table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'rental_properties'
  AND column_name IN ('is_verified', 'verified_at');

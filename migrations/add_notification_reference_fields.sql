-- =====================================================
-- ADD REFERENCE FIELDS TO NOTIFICATIONS TABLE
-- =====================================================
-- This allows notifications to link to properties or marketplace items

-- Add reference fields
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS reference_type TEXT,
ADD COLUMN IF NOT EXISTS reference_id UUID;

-- Add index for reference lookups
CREATE INDEX IF NOT EXISTS idx_notifications_reference ON notifications(reference_type, reference_id);

-- Add comments
COMMENT ON COLUMN notifications.reference_type IS 'Type of referenced item: "property" or "marketplace_item"';
COMMENT ON COLUMN notifications.reference_id IS 'UUID of the referenced property or marketplace item';

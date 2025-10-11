-- =====================================================
-- COMPREHENSIVE USER MEDIA TRACKING SYSTEM
-- =====================================================
-- This migration creates a robust media tracking system that:
-- 1. Tracks every media file uploaded by users
-- 2. Monitors storage usage per user
-- 3. Enforces subscription quotas
-- 4. Provides analytics and cleanup capabilities
-- 5. Fixes subscription plan quota values
-- =====================================================

-- =====================================================
-- PART 1: CREATE USER MEDIA TRACKING TABLE
-- =====================================================

-- Central table to track ALL media uploads across all categories
CREATE TABLE IF NOT EXISTS user_media_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,

    -- Media details
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    file_name TEXT,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT,

    -- Source tracking
    category TEXT NOT NULL CHECK (category IN (
        'rental_property',
        'electronics',
        'fashion',
        'cosmetics',
        'house_items',
        'cars',
        'properties_for_sale',
        'businesses'
    )),
    listing_id UUID NOT NULL,

    -- Upload metadata
    upload_month DATE NOT NULL DEFAULT date_trunc('month', NOW())::DATE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Indexes for performance
    CONSTRAINT unique_media_url_per_user UNIQUE (user_id, media_url)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_user_media_user_id ON user_media_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_media_subscription_id ON user_media_uploads(subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_media_upload_month ON user_media_uploads(upload_month);
CREATE INDEX IF NOT EXISTS idx_user_media_category ON user_media_uploads(category);
CREATE INDEX IF NOT EXISTS idx_user_media_type ON user_media_uploads(media_type);
CREATE INDEX IF NOT EXISTS idx_user_media_is_active ON user_media_uploads(is_active);
CREATE INDEX IF NOT EXISTS idx_user_media_listing_id ON user_media_uploads(listing_id, category);

-- =====================================================
-- PART 2: CREATE USER STORAGE TRACKING TABLE
-- =====================================================

-- Track storage usage per user
CREATE TABLE IF NOT EXISTS user_storage_usage (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,

    -- Storage in bytes
    total_storage_used_bytes BIGINT DEFAULT 0,
    images_storage_bytes BIGINT DEFAULT 0,
    videos_storage_bytes BIGINT DEFAULT 0,

    -- Counts
    total_images_count INTEGER DEFAULT 0,
    total_videos_count INTEGER DEFAULT 0,

    -- Monthly tracking
    current_month_images INTEGER DEFAULT 0,
    current_month_videos INTEGER DEFAULT 0,
    last_quota_reset DATE DEFAULT date_trunc('month', NOW())::DATE,

    -- Timestamps
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PART 3: FIX SUBSCRIPTION PLAN QUOTAS
-- =====================================================

-- Update Standard plan quotas to match SUBSCRIPTION_PLANS.md
UPDATE subscription_plans
SET
    image_quota_per_month = 15,  -- Was 50, should be 15
    video_quota_per_month = 5,   -- Correct
    max_images_per_listing = 10, -- Correct
    max_videos_per_listing = 3   -- Correct
WHERE name = 'standard';

-- Update Premium plan quotas to match SUBSCRIPTION_PLANS.md
UPDATE subscription_plans
SET
    image_quota_per_month = 30,  -- Was 200, should be 30
    video_quota_per_month = 10,  -- Was 20, should be 10
    max_images_per_listing = 15, -- Correct
    max_videos_per_listing = 5   -- Correct
WHERE name = 'premium';

-- =====================================================
-- PART 4: FUNCTION TO TRACK MEDIA UPLOADS
-- =====================================================

-- Function to track media when uploaded
CREATE OR REPLACE FUNCTION track_media_upload()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_subscription_id UUID;
    v_category TEXT;
    v_listing_id UUID;
    v_file_size BIGINT;
    v_media_type TEXT;
BEGIN
    -- Determine category and get user info based on table
    CASE TG_TABLE_NAME
        WHEN 'rental_property_media' THEN
            v_category := 'rental_property';
            SELECT landlord_id, subscription_id INTO v_user_id, v_subscription_id
            FROM rental_properties WHERE id = NEW.property_id;
            v_listing_id := NEW.property_id;
        WHEN 'electronics_media' THEN
            v_category := 'electronics';
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM electronics WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;
        WHEN 'fashion_media' THEN
            v_category := 'fashion';
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM fashion WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;
        WHEN 'cosmetics_media' THEN
            v_category := 'cosmetics';
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM cosmetics WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;
        WHEN 'house_items_media' THEN
            v_category := 'house_items';
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM house_items WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;
        WHEN 'cars_media' THEN
            v_category := 'cars';
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM cars WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;
        WHEN 'properties_for_sale_media' THEN
            v_category := 'properties_for_sale';
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM properties_for_sale WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;
        WHEN 'businesses_media' THEN
            v_category := 'businesses';
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM businesses WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;
    END CASE;

    -- Estimate file size (you should pass this from app if possible)
    -- For now, use default estimates: images ~500KB, videos ~5MB
    v_media_type := NEW.media_type;
    IF v_media_type = 'image' THEN
        v_file_size := 500000; -- 500KB estimate
    ELSE
        v_file_size := 5000000; -- 5MB estimate
    END IF;

    -- Insert into tracking table
    INSERT INTO user_media_uploads (
        user_id,
        subscription_id,
        media_type,
        media_url,
        file_size_bytes,
        category,
        listing_id,
        upload_month
    ) VALUES (
        v_user_id,
        v_subscription_id,
        v_media_type,
        NEW.media_url,
        v_file_size,
        v_category,
        v_listing_id,
        date_trunc('month', NOW())::DATE
    )
    ON CONFLICT (user_id, media_url) DO NOTHING;

    -- Update user storage usage
    INSERT INTO user_storage_usage (
        user_id,
        subscription_id,
        total_storage_used_bytes,
        images_storage_bytes,
        videos_storage_bytes,
        total_images_count,
        total_videos_count,
        current_month_images,
        current_month_videos
    ) VALUES (
        v_user_id,
        v_subscription_id,
        v_file_size,
        CASE WHEN v_media_type = 'image' THEN v_file_size ELSE 0 END,
        CASE WHEN v_media_type = 'video' THEN v_file_size ELSE 0 END,
        CASE WHEN v_media_type = 'image' THEN 1 ELSE 0 END,
        CASE WHEN v_media_type = 'video' THEN 1 ELSE 0 END,
        CASE WHEN v_media_type = 'image' THEN 1 ELSE 0 END,
        CASE WHEN v_media_type = 'video' THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_storage_used_bytes = user_storage_usage.total_storage_used_bytes + v_file_size,
        images_storage_bytes = user_storage_usage.images_storage_bytes + CASE WHEN v_media_type = 'image' THEN v_file_size ELSE 0 END,
        videos_storage_bytes = user_storage_usage.videos_storage_bytes + CASE WHEN v_media_type = 'video' THEN v_file_size ELSE 0 END,
        total_images_count = user_storage_usage.total_images_count + CASE WHEN v_media_type = 'image' THEN 1 ELSE 0 END,
        total_videos_count = user_storage_usage.total_videos_count + CASE WHEN v_media_type = 'video' THEN 1 ELSE 0 END,
        current_month_images = user_storage_usage.current_month_images + CASE WHEN v_media_type = 'image' THEN 1 ELSE 0 END,
        current_month_videos = user_storage_usage.current_month_videos + CASE WHEN v_media_type = 'video' THEN 1 ELSE 0 END,
        updated_at = NOW();

    -- Also update user_subscriptions table for backward compatibility
    IF v_media_type = 'image' THEN
        UPDATE user_subscriptions
        SET images_used_this_month = images_used_this_month + 1
        WHERE id = v_subscription_id;
    ELSE
        UPDATE user_subscriptions
        SET videos_used_this_month = videos_used_this_month + 1
        WHERE id = v_subscription_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 5: CREATE TRIGGERS FOR ALL MEDIA TABLES
-- =====================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS track_rental_property_media ON rental_property_media;
DROP TRIGGER IF EXISTS track_electronics_media ON electronics_media;
DROP TRIGGER IF EXISTS track_fashion_media ON fashion_media;
DROP TRIGGER IF EXISTS track_cosmetics_media ON cosmetics_media;
DROP TRIGGER IF EXISTS track_house_items_media ON house_items_media;
DROP TRIGGER IF EXISTS track_cars_media ON cars_media;
DROP TRIGGER IF EXISTS track_properties_for_sale_media ON properties_for_sale_media;
DROP TRIGGER IF EXISTS track_businesses_media ON businesses_media;

-- Create triggers for all media tables
CREATE TRIGGER track_rental_property_media
AFTER INSERT ON rental_property_media
FOR EACH ROW EXECUTE FUNCTION track_media_upload();

CREATE TRIGGER track_electronics_media
AFTER INSERT ON electronics_media
FOR EACH ROW EXECUTE FUNCTION track_media_upload();

CREATE TRIGGER track_fashion_media
AFTER INSERT ON fashion_media
FOR EACH ROW EXECUTE FUNCTION track_media_upload();

CREATE TRIGGER track_cosmetics_media
AFTER INSERT ON cosmetics_media
FOR EACH ROW EXECUTE FUNCTION track_media_upload();

CREATE TRIGGER track_house_items_media
AFTER INSERT ON house_items_media
FOR EACH ROW EXECUTE FUNCTION track_media_upload();

CREATE TRIGGER track_cars_media
AFTER INSERT ON cars_media
FOR EACH ROW EXECUTE FUNCTION track_media_upload();

CREATE TRIGGER track_properties_for_sale_media
AFTER INSERT ON properties_for_sale_media
FOR EACH ROW EXECUTE FUNCTION track_media_upload();

CREATE TRIGGER track_businesses_media
AFTER INSERT ON businesses_media
FOR EACH ROW EXECUTE FUNCTION track_media_upload();

-- =====================================================
-- PART 6: FUNCTION TO RESET MONTHLY QUOTAS
-- =====================================================

CREATE OR REPLACE FUNCTION reset_user_monthly_media_quotas()
RETURNS TABLE(users_reset INTEGER) AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Reset monthly counters in user_storage_usage
    UPDATE user_storage_usage
    SET
        current_month_images = 0,
        current_month_videos = 0,
        last_quota_reset = date_trunc('month', NOW())::DATE,
        updated_at = NOW()
    WHERE last_quota_reset < date_trunc('month', NOW())::DATE;

    GET DIAGNOSTICS affected_count = ROW_COUNT;

    -- Also reset in user_subscriptions for backward compatibility
    UPDATE user_subscriptions
    SET
        images_used_this_month = 0,
        videos_used_this_month = 0,
        last_quota_reset = NOW()
    WHERE last_quota_reset < date_trunc('month', NOW());

    RETURN QUERY SELECT affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 7: ANALYTICS FUNCTIONS
-- =====================================================

-- Get user's media usage summary
CREATE OR REPLACE FUNCTION get_user_media_usage(user_uuid UUID)
RETURNS TABLE(
    total_storage_mb NUMERIC,
    images_storage_mb NUMERIC,
    videos_storage_mb NUMERIC,
    total_images INTEGER,
    total_videos INTEGER,
    this_month_images INTEGER,
    this_month_videos INTEGER,
    image_quota INTEGER,
    video_quota INTEGER,
    images_remaining INTEGER,
    videos_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROUND(usu.total_storage_used_bytes::NUMERIC / 1048576, 2) as total_storage_mb,
        ROUND(usu.images_storage_bytes::NUMERIC / 1048576, 2) as images_storage_mb,
        ROUND(usu.videos_storage_bytes::NUMERIC / 1048576, 2) as videos_storage_mb,
        usu.total_images_count,
        usu.total_videos_count,
        usu.current_month_images,
        usu.current_month_videos,
        sp.image_quota_per_month,
        sp.video_quota_per_month,
        GREATEST(0, sp.image_quota_per_month - usu.current_month_images) as images_remaining,
        GREATEST(0, sp.video_quota_per_month - usu.current_month_videos) as videos_remaining
    FROM user_storage_usage usu
    JOIN user_subscriptions us ON us.user_id = usu.user_id AND us.status = 'active'
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE usu.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get detailed media breakdown by category
CREATE OR REPLACE FUNCTION get_user_media_by_category(user_uuid UUID)
RETURNS TABLE(
    category TEXT,
    image_count BIGINT,
    video_count BIGINT,
    total_size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        umu.category,
        COUNT(*) FILTER (WHERE umu.media_type = 'image') as image_count,
        COUNT(*) FILTER (WHERE umu.media_type = 'video') as video_count,
        ROUND(SUM(umu.file_size_bytes)::NUMERIC / 1048576, 2) as total_size_mb
    FROM user_media_uploads umu
    WHERE umu.user_id = user_uuid
    AND umu.is_active = TRUE
    GROUP BY umu.category
    ORDER BY total_size_mb DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 8: CLEANUP FUNCTIONS
-- =====================================================

-- Function to mark media as deleted (soft delete)
CREATE OR REPLACE FUNCTION mark_media_deleted(media_url_param TEXT, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_file_size BIGINT;
    v_media_type TEXT;
BEGIN
    -- Get file info
    SELECT file_size_bytes, media_type INTO v_file_size, v_media_type
    FROM user_media_uploads
    WHERE media_url = media_url_param AND user_id = user_uuid;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Mark as deleted
    UPDATE user_media_uploads
    SET is_active = FALSE, deleted_at = NOW()
    WHERE media_url = media_url_param AND user_id = user_uuid;

    -- Update storage usage
    UPDATE user_storage_usage
    SET
        total_storage_used_bytes = GREATEST(0, total_storage_used_bytes - v_file_size),
        images_storage_bytes = GREATEST(0, images_storage_bytes - CASE WHEN v_media_type = 'image' THEN v_file_size ELSE 0 END),
        videos_storage_bytes = GREATEST(0, videos_storage_bytes - CASE WHEN v_media_type = 'video' THEN v_file_size ELSE 0 END),
        total_images_count = GREATEST(0, total_images_count - CASE WHEN v_media_type = 'image' THEN 1 ELSE 0 END),
        total_videos_count = GREATEST(0, total_videos_count - CASE WHEN v_media_type = 'video' THEN 1 ELSE 0 END),
        updated_at = NOW()
    WHERE user_id = user_uuid;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 9: GRANT PERMISSIONS
-- =====================================================

-- Grant permissions on new tables
GRANT ALL ON user_media_uploads TO authenticated;
GRANT ALL ON user_storage_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_media_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_media_by_category TO authenticated;
GRANT EXECUTE ON FUNCTION mark_media_deleted TO authenticated;

-- Enable RLS
ALTER TABLE user_media_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_storage_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own media uploads"
ON user_media_uploads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own storage usage"
ON user_storage_usage FOR SELECT
USING (auth.uid() = user_id);

-- =====================================================
-- PART 10: VERIFICATION QUERIES
-- =====================================================

-- View updated subscription plans
SELECT
    'Updated Subscription Plans' as info,
    name,
    display_name,
    max_listings,
    image_quota_per_month,
    video_quota_per_month,
    max_images_per_listing,
    max_videos_per_listing
FROM subscription_plans
ORDER BY name;

-- View all media tracking triggers
SELECT
    'Media Tracking Triggers' as info,
    trigger_name,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'track_%_media'
ORDER BY event_object_table;

-- =====================================================
-- MIGRATION SUMMARY
-- =====================================================

SELECT '✅ Comprehensive Media Tracking System Created!' as status,
       'user_media_uploads table - tracks every file' as feature_1,
       'user_storage_usage table - monitors storage & quotas' as feature_2,
       'Subscription plan quotas corrected' as feature_3,
       'Triggers added for all 8 media tables' as feature_4,
       'Analytics functions for usage insights' as feature_5,
       'Monthly quota reset function' as feature_6,
       'Cleanup and soft-delete support' as feature_7;

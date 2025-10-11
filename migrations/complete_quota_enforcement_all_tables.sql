-- =====================================================
-- COMPLETE QUOTA ENFORCEMENT FOR ALL TABLES
-- =====================================================
-- This enforces:
-- 1. Listing quota (max listings per month)
-- 2. Media quota (max images/videos per month)
-- 3. Per-listing media limits
-- =====================================================

-- =====================================================
-- PART 1: CLEAN UP OLD TRIGGERS/FUNCTIONS
-- =====================================================

-- Drop old listing triggers
DROP TRIGGER IF EXISTS check_rental_property_quota ON rental_properties CASCADE;
DROP TRIGGER IF EXISTS increment_rental_property_counter ON rental_properties CASCADE;
DROP TRIGGER IF EXISTS check_electronics_quota ON electronics CASCADE;
DROP TRIGGER IF EXISTS increment_electronics_counter ON electronics CASCADE;
DROP TRIGGER IF EXISTS check_fashion_quota ON fashion CASCADE;
DROP TRIGGER IF EXISTS increment_fashion_counter ON fashion CASCADE;
DROP TRIGGER IF EXISTS check_cosmetics_quota ON cosmetics CASCADE;
DROP TRIGGER IF EXISTS increment_cosmetics_counter ON cosmetics CASCADE;
DROP TRIGGER IF EXISTS check_house_items_quota ON house_items CASCADE;
DROP TRIGGER IF EXISTS increment_house_items_counter ON house_items CASCADE;
DROP TRIGGER IF EXISTS check_cars_quota ON cars CASCADE;
DROP TRIGGER IF EXISTS increment_cars_counter ON cars CASCADE;
DROP TRIGGER IF EXISTS check_properties_for_sale_quota ON properties_for_sale CASCADE;
DROP TRIGGER IF EXISTS increment_properties_for_sale_counter ON properties_for_sale CASCADE;
DROP TRIGGER IF EXISTS check_businesses_quota ON businesses CASCADE;
DROP TRIGGER IF EXISTS increment_businesses_counter ON businesses CASCADE;

-- Drop old media triggers
DROP TRIGGER IF EXISTS check_rental_property_media_quota ON rental_property_media CASCADE;
DROP TRIGGER IF EXISTS increment_rental_property_media_counter ON rental_property_media CASCADE;
DROP TRIGGER IF EXISTS check_electronics_media_quota ON electronics_media CASCADE;
DROP TRIGGER IF EXISTS increment_electronics_media_counter ON electronics_media CASCADE;
DROP TRIGGER IF EXISTS check_fashion_media_quota ON fashion_media CASCADE;
DROP TRIGGER IF EXISTS increment_fashion_media_counter ON fashion_media CASCADE;
DROP TRIGGER IF EXISTS check_cosmetics_media_quota ON cosmetics_media CASCADE;
DROP TRIGGER IF EXISTS increment_cosmetics_media_counter ON cosmetics_media CASCADE;
DROP TRIGGER IF EXISTS check_house_items_media_quota ON house_items_media CASCADE;
DROP TRIGGER IF EXISTS increment_house_items_media_counter ON house_items_media CASCADE;
DROP TRIGGER IF EXISTS check_cars_media_quota ON cars_media CASCADE;
DROP TRIGGER IF EXISTS increment_cars_media_counter ON cars_media CASCADE;
DROP TRIGGER IF EXISTS check_properties_for_sale_media_quota ON properties_for_sale_media CASCADE;
DROP TRIGGER IF EXISTS increment_properties_for_sale_media_counter ON properties_for_sale_media CASCADE;
DROP TRIGGER IF EXISTS check_businesses_media_quota ON businesses_media CASCADE;
DROP TRIGGER IF EXISTS increment_businesses_media_counter ON businesses_media CASCADE;

-- Drop old functions
DROP FUNCTION IF EXISTS check_subscription_quota_before_insert() CASCADE;
DROP FUNCTION IF EXISTS check_listing_quota_before_insert() CASCADE;
DROP FUNCTION IF EXISTS increment_listing_counter_after_insert() CASCADE;
DROP FUNCTION IF EXISTS check_media_quota_before_insert() CASCADE;
DROP FUNCTION IF EXISTS increment_media_counter_after_insert() CASCADE;

-- =====================================================
-- PART 2: LISTING QUOTA CHECK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION check_listing_quota_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_max_listings INTEGER;
    v_listings_used INTEGER;
    v_subscription_status TEXT;
    v_end_date TIMESTAMPTZ;
BEGIN
    -- Get user_id based on table
    IF TG_TABLE_NAME = 'rental_properties' THEN
        v_user_id := NEW.landlord_id;
    ELSE
        v_user_id := NEW.seller_id;
    END IF;

    -- Get subscription info
    SELECT
        sp.max_listings,
        us.listings_used,
        us.status,
        us.end_date
    INTO
        v_max_listings,
        v_listings_used,
        v_subscription_status,
        v_end_date
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = v_user_id
    AND us.status = 'active'
    AND us.end_date > NOW()
    ORDER BY us.end_date DESC
    LIMIT 1;

    -- Check if subscription exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active subscription required to create listings. Please subscribe or renew your subscription.';
    END IF;

    -- Check if quota exceeded
    IF v_listings_used >= v_max_listings THEN
        RAISE EXCEPTION 'Monthly listing quota exceeded (% / % used). Delete old listings, wait for next month, or upgrade your plan.',
            v_listings_used, v_max_listings;
    END IF;

    -- Set subscription_id on the new listing
    SELECT id INTO NEW.subscription_id
    FROM user_subscriptions
    WHERE user_id = v_user_id
    AND status = 'active'
    AND end_date > NOW()
    ORDER BY end_date DESC
    LIMIT 1;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 3: INCREMENT LISTING COUNTER
-- =====================================================

CREATE OR REPLACE FUNCTION increment_listing_counter_after_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get user_id
    IF TG_TABLE_NAME = 'rental_properties' THEN
        v_user_id := NEW.landlord_id;
    ELSE
        v_user_id := NEW.seller_id;
    END IF;

    -- Increment listing counter
    UPDATE user_subscriptions
    SET listings_used = listings_used + 1,
        updated_at = NOW()
    WHERE user_id = v_user_id
    AND status = 'active'
    AND end_date > NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 4: MEDIA QUOTA CHECK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION check_media_quota_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_subscription_id UUID;
    v_media_type TEXT;
    v_image_quota INTEGER;
    v_video_quota INTEGER;
    v_images_used INTEGER;
    v_videos_used INTEGER;
    v_max_images_per_listing INTEGER;
    v_max_videos_per_listing INTEGER;
    v_listing_id UUID;
    v_listing_images_count INTEGER;
    v_listing_videos_count INTEGER;
BEGIN
    v_media_type := NEW.media_type;

    -- Get user info based on table
    CASE TG_TABLE_NAME
        WHEN 'rental_property_media' THEN
            SELECT landlord_id, subscription_id INTO v_user_id, v_subscription_id
            FROM rental_properties WHERE id = NEW.property_id;
            v_listing_id := NEW.property_id;

        WHEN 'electronics_media' THEN
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM electronics WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;

        WHEN 'fashion_media' THEN
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM fashion WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;

        WHEN 'cosmetics_media' THEN
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM cosmetics WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;

        WHEN 'house_items_media' THEN
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM house_items WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;

        WHEN 'cars_media' THEN
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM cars WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;

        WHEN 'properties_for_sale_media' THEN
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM properties_for_sale WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;

        WHEN 'businesses_media' THEN
            SELECT seller_id, subscription_id INTO v_user_id, v_subscription_id
            FROM businesses WHERE id = NEW.item_id;
            v_listing_id := NEW.item_id;
    END CASE;

    -- Get quotas
    SELECT
        sp.image_quota_per_month,
        sp.video_quota_per_month,
        sp.max_images_per_listing,
        sp.max_videos_per_listing,
        us.images_used_this_month,
        us.videos_used_this_month
    INTO
        v_image_quota,
        v_video_quota,
        v_max_images_per_listing,
        v_max_videos_per_listing,
        v_images_used,
        v_videos_used
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.id = v_subscription_id
    AND us.status = 'active'
    AND us.end_date > NOW();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active subscription required to upload media.';
    END IF;

    -- Count existing media for this listing
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE %s = $1 AND media_type = $2',
        TG_TABLE_NAME,
        CASE WHEN TG_TABLE_NAME = 'rental_property_media' THEN 'property_id' ELSE 'item_id' END
    ) INTO v_listing_images_count USING v_listing_id, 'image';

    EXECUTE format('SELECT COUNT(*) FROM %I WHERE %s = $1 AND media_type = $2',
        TG_TABLE_NAME,
        CASE WHEN TG_TABLE_NAME = 'rental_property_media' THEN 'property_id' ELSE 'item_id' END
    ) INTO v_listing_videos_count USING v_listing_id, 'video';

    -- Check quotas
    IF v_media_type = 'image' THEN
        IF v_images_used >= v_image_quota THEN
            RAISE EXCEPTION 'Monthly image quota exceeded (% / % used). Quota resets on 1st of next month.',
                v_images_used, v_image_quota;
        END IF;

        IF v_listing_images_count >= v_max_images_per_listing THEN
            RAISE EXCEPTION 'Maximum % images per listing reached. Delete an image first.',
                v_max_images_per_listing;
        END IF;

    ELSIF v_media_type = 'video' THEN
        IF v_videos_used >= v_video_quota THEN
            RAISE EXCEPTION 'Monthly video quota exceeded (% / % used). Quota resets on 1st of next month.',
                v_videos_used, v_video_quota;
        END IF;

        IF v_listing_videos_count >= v_max_videos_per_listing THEN
            RAISE EXCEPTION 'Maximum % videos per listing reached. Delete a video first.',
                v_max_videos_per_listing;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 5: INCREMENT MEDIA COUNTER
-- =====================================================

CREATE OR REPLACE FUNCTION increment_media_counter_after_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_subscription_id UUID;
BEGIN
    -- Get subscription_id based on table
    IF TG_TABLE_NAME = 'rental_property_media' THEN
        SELECT subscription_id INTO v_subscription_id
        FROM rental_properties WHERE id = NEW.property_id;
    ELSE
        EXECUTE format('SELECT subscription_id FROM %I WHERE id = $1',
            REPLACE(TG_TABLE_NAME, '_media', '')
        ) INTO v_subscription_id USING NEW.item_id;
    END IF;

    -- Increment counter
    IF NEW.media_type = 'image' THEN
        UPDATE user_subscriptions
        SET images_used_this_month = images_used_this_month + 1,
            updated_at = NOW()
        WHERE id = v_subscription_id;
    ELSIF NEW.media_type = 'video' THEN
        UPDATE user_subscriptions
        SET videos_used_this_month = videos_used_this_month + 1,
            updated_at = NOW()
        WHERE id = v_subscription_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 6: CREATE TRIGGERS FOR LISTING TABLES
-- =====================================================

-- Rental Properties
CREATE TRIGGER check_rental_property_quota
BEFORE INSERT ON rental_properties
FOR EACH ROW EXECUTE FUNCTION check_listing_quota_before_insert();

CREATE TRIGGER increment_rental_property_counter
AFTER INSERT ON rental_properties
FOR EACH ROW EXECUTE FUNCTION increment_listing_counter_after_insert();

-- Electronics
CREATE TRIGGER check_electronics_quota
BEFORE INSERT ON electronics
FOR EACH ROW EXECUTE FUNCTION check_listing_quota_before_insert();

CREATE TRIGGER increment_electronics_counter
AFTER INSERT ON electronics
FOR EACH ROW EXECUTE FUNCTION increment_listing_counter_after_insert();

-- Fashion
CREATE TRIGGER check_fashion_quota
BEFORE INSERT ON fashion
FOR EACH ROW EXECUTE FUNCTION check_listing_quota_before_insert();

CREATE TRIGGER increment_fashion_counter
AFTER INSERT ON fashion
FOR EACH ROW EXECUTE FUNCTION increment_listing_counter_after_insert();

-- Cosmetics
CREATE TRIGGER check_cosmetics_quota
BEFORE INSERT ON cosmetics
FOR EACH ROW EXECUTE FUNCTION check_listing_quota_before_insert();

CREATE TRIGGER increment_cosmetics_counter
AFTER INSERT ON cosmetics
FOR EACH ROW EXECUTE FUNCTION increment_listing_counter_after_insert();

-- House Items
CREATE TRIGGER check_house_items_quota
BEFORE INSERT ON house_items
FOR EACH ROW EXECUTE FUNCTION check_listing_quota_before_insert();

CREATE TRIGGER increment_house_items_counter
AFTER INSERT ON house_items
FOR EACH ROW EXECUTE FUNCTION increment_listing_counter_after_insert();

-- Cars
CREATE TRIGGER check_cars_quota
BEFORE INSERT ON cars
FOR EACH ROW EXECUTE FUNCTION check_listing_quota_before_insert();

CREATE TRIGGER increment_cars_counter
AFTER INSERT ON cars
FOR EACH ROW EXECUTE FUNCTION increment_listing_counter_after_insert();

-- Properties for Sale
CREATE TRIGGER check_properties_for_sale_quota
BEFORE INSERT ON properties_for_sale
FOR EACH ROW EXECUTE FUNCTION check_listing_quota_before_insert();

CREATE TRIGGER increment_properties_for_sale_counter
AFTER INSERT ON properties_for_sale
FOR EACH ROW EXECUTE FUNCTION increment_listing_counter_after_insert();

-- Businesses
CREATE TRIGGER check_businesses_quota
BEFORE INSERT ON businesses
FOR EACH ROW EXECUTE FUNCTION check_listing_quota_before_insert();

CREATE TRIGGER increment_businesses_counter
AFTER INSERT ON businesses
FOR EACH ROW EXECUTE FUNCTION increment_listing_counter_after_insert();

-- =====================================================
-- PART 7: CREATE TRIGGERS FOR MEDIA TABLES
-- =====================================================

-- Rental Property Media
CREATE TRIGGER check_rental_property_media_quota
BEFORE INSERT ON rental_property_media
FOR EACH ROW EXECUTE FUNCTION check_media_quota_before_insert();

CREATE TRIGGER increment_rental_property_media_counter
AFTER INSERT ON rental_property_media
FOR EACH ROW EXECUTE FUNCTION increment_media_counter_after_insert();

-- Electronics Media
CREATE TRIGGER check_electronics_media_quota
BEFORE INSERT ON electronics_media
FOR EACH ROW EXECUTE FUNCTION check_media_quota_before_insert();

CREATE TRIGGER increment_electronics_media_counter
AFTER INSERT ON electronics_media
FOR EACH ROW EXECUTE FUNCTION increment_media_counter_after_insert();

-- Fashion Media
CREATE TRIGGER check_fashion_media_quota
BEFORE INSERT ON fashion_media
FOR EACH ROW EXECUTE FUNCTION check_media_quota_before_insert();

CREATE TRIGGER increment_fashion_media_counter
AFTER INSERT ON fashion_media
FOR EACH ROW EXECUTE FUNCTION increment_media_counter_after_insert();

-- Cosmetics Media
CREATE TRIGGER check_cosmetics_media_quota
BEFORE INSERT ON cosmetics_media
FOR EACH ROW EXECUTE FUNCTION check_media_quota_before_insert();

CREATE TRIGGER increment_cosmetics_media_counter
AFTER INSERT ON cosmetics_media
FOR EACH ROW EXECUTE FUNCTION increment_media_counter_after_insert();

-- House Items Media
CREATE TRIGGER check_house_items_media_quota
BEFORE INSERT ON house_items_media
FOR EACH ROW EXECUTE FUNCTION check_media_quota_before_insert();

CREATE TRIGGER increment_house_items_media_counter
AFTER INSERT ON house_items_media
FOR EACH ROW EXECUTE FUNCTION increment_media_counter_after_insert();

-- Cars Media
CREATE TRIGGER check_cars_media_quota
BEFORE INSERT ON cars_media
FOR EACH ROW EXECUTE FUNCTION check_media_quota_before_insert();

CREATE TRIGGER increment_cars_media_counter
AFTER INSERT ON cars_media
FOR EACH ROW EXECUTE FUNCTION increment_media_counter_after_insert();

-- Properties for Sale Media
CREATE TRIGGER check_properties_for_sale_media_quota
BEFORE INSERT ON properties_for_sale_media
FOR EACH ROW EXECUTE FUNCTION check_media_quota_before_insert();

CREATE TRIGGER increment_properties_for_sale_media_counter
AFTER INSERT ON properties_for_sale_media
FOR EACH ROW EXECUTE FUNCTION increment_media_counter_after_insert();

-- Businesses Media
CREATE TRIGGER check_businesses_media_quota
BEFORE INSERT ON businesses_media
FOR EACH ROW EXECUTE FUNCTION check_media_quota_before_insert();

CREATE TRIGGER increment_businesses_media_counter
AFTER INSERT ON businesses_media
FOR EACH ROW EXECUTE FUNCTION increment_media_counter_after_insert();

-- =====================================================
-- PART 8: VERIFICATION
-- =====================================================

SELECT '🎉 COMPLETE QUOTA ENFORCEMENT INSTALLED!' as status;

-- Count triggers
SELECT
    '📊 TRIGGER COUNT' as info,
    COUNT(*) as total_triggers,
    COUNT(*) FILTER (WHERE trigger_name LIKE '%listing%' OR trigger_name LIKE '%property%' OR trigger_name LIKE '%electronics%' OR trigger_name LIKE '%fashion%' OR trigger_name LIKE '%cosmetics%' OR trigger_name LIKE '%house%' OR trigger_name LIKE '%cars%' OR trigger_name LIKE '%properties_for_sale%' OR trigger_name LIKE '%businesses%') as listing_triggers,
    COUNT(*) FILTER (WHERE trigger_name LIKE '%media%') as media_triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (trigger_name LIKE '%quota%' OR trigger_name LIKE '%counter%');

-- Show all triggers
SELECT
    trigger_name,
    event_object_table as table_name,
    action_timing || ' ' || event_manipulation as when_fired
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (trigger_name LIKE '%quota%' OR trigger_name LIKE '%counter%')
ORDER BY event_object_table, action_timing;

SELECT
    '✅ Now run quick_test_quota.sql' as next_step_1,
    '✅ Then try creating a listing - should be BLOCKED!' as next_step_2,
    '✅ Try uploading media - should be BLOCKED!' as next_step_3;

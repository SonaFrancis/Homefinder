-- =====================================================
-- ENABLE SUBSCRIPTION ENFORCEMENT (PAID MODE)
-- =====================================================
-- This migration re-enables database-level subscription checks
-- to enforce subscription requirements.
--
-- IMPORTANT: Run this when ENABLE_SUBSCRIPTIONS = true
-- This restores the subscription system to full functionality.
-- =====================================================

-- =====================================================
-- STEP 1: CREATE LISTING QUOTA CHECK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION check_listing_quota_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_max_listings INTEGER;
    v_listings_used INTEGER;
    v_subscription_status TEXT;
    v_end_date TIMESTAMPTZ;
    v_posts_used INTEGER;
    v_max_posts INTEGER;
BEGIN
    -- Get user_id based on table
    IF TG_TABLE_NAME = 'rental_properties' THEN
        v_user_id := NEW.landlord_id;
    ELSE
        v_user_id := NEW.seller_id;
    END IF;

    -- Get subscription info (checking both listings and posts quotas)
    SELECT
        sp.max_listings,
        COALESCE(sp.max_posts_per_month, sp.max_listings) as max_posts,
        us.listings_used,
        COALESCE(us.posts_used_this_month, us.listings_used) as posts_used,
        us.status,
        us.end_date
    INTO
        v_max_listings,
        v_max_posts,
        v_listings_used,
        v_posts_used,
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

    -- Check quota (use whichever quota system is in place)
    IF v_posts_used >= v_max_posts THEN
        RAISE EXCEPTION 'Post quota exceeded. You have used % of % posts this month.', v_posts_used, v_max_posts;
    END IF;

    IF v_listings_used >= v_max_listings THEN
        RAISE EXCEPTION 'Listing quota exceeded. You have used % of % listings.', v_listings_used, v_max_listings;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: CREATE TRIGGERS FOR ALL TABLES
-- =====================================================

-- Rental Properties
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_rental_property_quota ON rental_properties;
  CREATE TRIGGER check_rental_property_quota
      BEFORE INSERT ON rental_properties
      FOR EACH ROW
      EXECUTE FUNCTION check_listing_quota_before_insert();
  RAISE NOTICE 'Created trigger on rental_properties';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped rental_properties (table does not exist)';
END $$;

-- Electronics
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_electronics_quota ON electronics;
  CREATE TRIGGER check_electronics_quota
      BEFORE INSERT ON electronics
      FOR EACH ROW
      EXECUTE FUNCTION check_listing_quota_before_insert();
  RAISE NOTICE 'Created trigger on electronics';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped electronics (table does not exist)';
END $$;

-- Fashion
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_fashion_quota ON fashion;
  CREATE TRIGGER check_fashion_quota
      BEFORE INSERT ON fashion
      FOR EACH ROW
      EXECUTE FUNCTION check_listing_quota_before_insert();
  RAISE NOTICE 'Created trigger on fashion';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped fashion (table does not exist)';
END $$;

-- Cosmetics
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_cosmetics_quota ON cosmetics;
  CREATE TRIGGER check_cosmetics_quota
      BEFORE INSERT ON cosmetics
      FOR EACH ROW
      EXECUTE FUNCTION check_listing_quota_before_insert();
  RAISE NOTICE 'Created trigger on cosmetics';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped cosmetics (table does not exist)';
END $$;

-- House Items
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_house_items_quota ON house_items;
  CREATE TRIGGER check_house_items_quota
      BEFORE INSERT ON house_items
      FOR EACH ROW
      EXECUTE FUNCTION check_listing_quota_before_insert();
  RAISE NOTICE 'Created trigger on house_items';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped house_items (table does not exist)';
END $$;

-- Cars
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_cars_quota ON cars;
  CREATE TRIGGER check_cars_quota
      BEFORE INSERT ON cars
      FOR EACH ROW
      EXECUTE FUNCTION check_listing_quota_before_insert();
  RAISE NOTICE 'Created trigger on cars';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped cars (table does not exist)';
END $$;

-- Properties for Sale
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_properties_for_sale_quota ON properties_for_sale;
  CREATE TRIGGER check_properties_for_sale_quota
      BEFORE INSERT ON properties_for_sale
      FOR EACH ROW
      EXECUTE FUNCTION check_listing_quota_before_insert();
  RAISE NOTICE 'Created trigger on properties_for_sale';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped properties_for_sale (table does not exist)';
END $$;

-- Businesses
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_businesses_quota ON businesses;
  CREATE TRIGGER check_businesses_quota
      BEFORE INSERT ON businesses
      FOR EACH ROW
      EXECUTE FUNCTION check_listing_quota_before_insert();
  RAISE NOTICE 'Created trigger on businesses';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped businesses (table does not exist)';
END $$;

-- =====================================================
-- STEP 3: SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Subscription enforcement ENABLED';
  RAISE NOTICE '✅ Paid mode active';
  RAISE NOTICE '✅ Users must have active subscription to create listings';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables protected:';
  RAISE NOTICE '  - rental_properties';
  RAISE NOTICE '  - electronics';
  RAISE NOTICE '  - fashion';
  RAISE NOTICE '  - cosmetics';
  RAISE NOTICE '  - house_items';
  RAISE NOTICE '  - cars';
  RAISE NOTICE '  - properties_for_sale';
  RAISE NOTICE '  - businesses';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'To disable subscriptions again, run: disable_subscription_enforcement.sql';
END $$;

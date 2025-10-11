-- =====================================================
-- DISABLE SUBSCRIPTION ENFORCEMENT (FREE ACCESS MODE)
-- =====================================================
-- This migration disables database-level subscription checks
-- to allow free access to all features.
--
-- IMPORTANT: Run this when ENABLE_SUBSCRIPTIONS = false
-- To re-enable subscriptions, run: enable_subscription_enforcement.sql
-- =====================================================

-- Drop all possible subscription/quota check triggers
-- Using DO blocks to safely handle non-existent tables

-- Rental Properties triggers
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_subscription_before_property_insert ON rental_properties;
  DROP TRIGGER IF EXISTS check_quota_before_property_insert ON rental_properties;
  DROP TRIGGER IF EXISTS check_rental_property_quota ON rental_properties;
  DROP TRIGGER IF EXISTS increment_rental_property_counter ON rental_properties;
  RAISE NOTICE 'Dropped rental_properties triggers';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped rental_properties (table does not exist)';
END $$;

-- Electronics triggers
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_electronics_quota ON electronics;
  DROP TRIGGER IF EXISTS increment_electronics_counter ON electronics;
  RAISE NOTICE 'Dropped electronics triggers';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped electronics (table does not exist)';
END $$;

-- Fashion triggers
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_fashion_quota ON fashion;
  DROP TRIGGER IF EXISTS increment_fashion_counter ON fashion;
  RAISE NOTICE 'Dropped fashion triggers';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped fashion (table does not exist)';
END $$;

-- Cosmetics triggers
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_cosmetics_quota ON cosmetics;
  DROP TRIGGER IF EXISTS increment_cosmetics_counter ON cosmetics;
  RAISE NOTICE 'Dropped cosmetics triggers';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped cosmetics (table does not exist)';
END $$;

-- House Items triggers
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_house_items_quota ON house_items;
  DROP TRIGGER IF EXISTS increment_house_items_counter ON house_items;
  RAISE NOTICE 'Dropped house_items triggers';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped house_items (table does not exist)';
END $$;

-- Cars triggers
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_cars_quota ON cars;
  DROP TRIGGER IF EXISTS increment_cars_counter ON cars;
  RAISE NOTICE 'Dropped cars triggers';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped cars (table does not exist)';
END $$;

-- Properties for Sale triggers
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_properties_for_sale_quota ON properties_for_sale;
  DROP TRIGGER IF EXISTS increment_properties_for_sale_counter ON properties_for_sale;
  RAISE NOTICE 'Dropped properties_for_sale triggers';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped properties_for_sale (table does not exist)';
END $$;

-- Businesses triggers
DO $$
BEGIN
  DROP TRIGGER IF EXISTS check_businesses_quota ON businesses;
  DROP TRIGGER IF EXISTS increment_businesses_counter ON businesses;
  RAISE NOTICE 'Dropped businesses triggers';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Skipped businesses (table does not exist)';
END $$;

-- Drop the functions that enforce subscription checks (CASCADE to auto-drop dependent triggers)
DROP FUNCTION IF EXISTS check_user_subscription_before_listing() CASCADE;
DROP FUNCTION IF EXISTS check_post_quota_before_insert() CASCADE;
DROP FUNCTION IF EXISTS check_listing_quota_before_insert() CASCADE;
DROP FUNCTION IF EXISTS increment_listing_counter_after_insert() CASCADE;
DROP FUNCTION IF EXISTS check_subscription_quota_before_insert() CASCADE;

-- Double-check: Remove any remaining triggers on all tables
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all triggers with 'subscription' or 'quota' in their name
  FOR r IN
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND (trigger_name ILIKE '%subscription%' OR trigger_name ILIKE '%quota%')
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON ' || r.event_object_table || ' CASCADE';
    RAISE NOTICE 'Dropped trigger: % on table: %', r.trigger_name, r.event_object_table;
  END LOOP;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Subscription enforcement DISABLED';
  RAISE NOTICE '✅ Free access mode active';
  RAISE NOTICE '✅ Users can create listings without subscription';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables affected:';
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
  RAISE NOTICE 'To re-enable subscriptions, run: enable_subscription_enforcement.sql';
END $$;

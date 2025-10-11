-- =====================================================
-- TEST SUBSCRIPTION EXPIRATION SCENARIOS
-- =====================================================
-- Tests: Grace period, expired, and various days expired
-- Run these one at a time and check the banner in the app
-- =====================================================

-- =====================================================
-- SETUP: Get your user ID first
-- =====================================================
-- Run this first to get your user_id
SELECT id, email, full_name
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE';
-- Copy the ID from the result

-- =====================================================
-- TEST 1: ACTIVE SUBSCRIPTION (Should show no warning)
-- =====================================================
-- This creates an active subscription that expires in 20 days
DO $$
DECLARE
    v_user_id UUID := '79804371-fb23-4347-98ca-353055fda1b7'; -- Replace with your user ID
    v_plan_id UUID;
    v_subscription_id UUID;
BEGIN
    -- Get Standard plan ID (change to 'premium' if you want to test with premium plan)
    SELECT id INTO v_plan_id FROM subscription_plans WHERE name = 'standard' LIMIT 1;

    -- Delete existing subscriptions for this user
    DELETE FROM user_subscriptions WHERE user_id = v_user_id;

    -- Create active subscription (expires in 20 days)
    INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        start_date,
        end_date,
        listings_used,
        images_used_this_month,
        videos_used_this_month
    ) VALUES (
        v_user_id,
        v_plan_id,
        'active'::subscription_status,
        NOW() - INTERVAL '10 days',  -- Started 10 days ago
        NOW() + INTERVAL '20 days',  -- Expires in 20 days
        2,  -- Used 2 listings
        5,  -- Used 5 images
        0   -- No videos used
    );

    RAISE NOTICE 'Created ACTIVE subscription expiring in 20 days';
END $$;

-- Check the scenario
SELECT * FROM get_user_subscription_scenario('79804371-fb23-4347-98ca-353055fda1b7');
-- Expected: scenario = 1, subscription_status = 'active'


-- =====================================================
-- TEST 2: GRACE PERIOD - DAY 1 (Just expired yesterday)
-- =====================================================
DO $$
DECLARE
    v_user_id UUID := '79804371-fb23-4347-98ca-353055fda1b7';
    v_plan_id UUID;
BEGIN
    SELECT id INTO v_plan_id FROM subscription_plans WHERE name = 'standard' LIMIT 1;

    DELETE FROM user_subscriptions WHERE user_id = v_user_id;

    INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        start_date,
        end_date,
        listings_used,
        images_used_this_month,
        videos_used_this_month
    ) VALUES (
        v_user_id,
        v_plan_id,
        'expired'::subscription_status,
        NOW() - INTERVAL '31 days',  -- Started 31 days ago
        NOW() - INTERVAL '1 day',     -- EXPIRED 1 DAY AGO
        3,
        8,
        1
    );

    RAISE NOTICE 'Created subscription EXPIRED 1 DAY AGO (Grace period: 6 days left)';
END $$;

SELECT * FROM get_user_subscription_scenario('79804371-fb23-4347-98ca-353055fda1b7');
-- Expected: scenario = 2, days_expired = 1, grace_days_remaining = 6


-- =====================================================
-- TEST 3: GRACE PERIOD - DAY 5 (Urgent warning)
-- =====================================================
DO $$
DECLARE
    v_user_id UUID := '79804371-fb23-4347-98ca-353055fda1b7';
    v_plan_id UUID;
BEGIN
    SELECT id INTO v_plan_id FROM subscription_plans WHERE name = 'standard' LIMIT 1;

    DELETE FROM user_subscriptions WHERE user_id = v_user_id;

    INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        start_date,
        end_date,
        listings_used,
        images_used_this_month,
        videos_used_this_month
    ) VALUES (
        v_user_id,
        v_plan_id,
        'expired'::subscription_status,
        NOW() - INTERVAL '35 days',
        NOW() - INTERVAL '5 days',   -- EXPIRED 5 DAYS AGO
        5,
        10,
        1
    );

    RAISE NOTICE 'Created subscription EXPIRED 5 DAYS AGO (Grace period: 2 days left - URGENT)';
END $$;

SELECT * FROM get_user_subscription_scenario('79804371-fb23-4347-98ca-353055fda1b7');
-- Expected: scenario = 2, days_expired = 5, grace_days_remaining = 2


-- =====================================================
-- TEST 4: GRACE PERIOD - LAST DAY (Day 7)
-- =====================================================
DO $$
DECLARE
    v_user_id UUID := '79804371-fb23-4347-98ca-353055fda1b7';
    v_plan_id UUID;
BEGIN
    SELECT id INTO v_plan_id FROM subscription_plans WHERE name = 'standard' LIMIT 1;

    DELETE FROM user_subscriptions WHERE user_id = v_user_id;

    INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        start_date,
        end_date,
        listings_used,
        images_used_this_month,
        videos_used_this_month
    ) VALUES (
        v_user_id,
        v_plan_id,
        'expired'::subscription_status,
        NOW() - INTERVAL '37 days',
        NOW() - INTERVAL '7 days',   -- EXPIRED 7 DAYS AGO (Last day of grace)
        4,
        12,
        2
    );

    RAISE NOTICE 'Created subscription EXPIRED 7 DAYS AGO (Grace period: LAST DAY!)';
END $$;

SELECT * FROM get_user_subscription_scenario('79804371-fb23-4347-98ca-353055fda1b7');
-- Expected: scenario = 2, days_expired = 7, grace_days_remaining = 0


-- =====================================================
-- TEST 5: FULLY EXPIRED - DAY 8 (Listings deactivated)
-- =====================================================
DO $$
DECLARE
    v_user_id UUID := '79804371-fb23-4347-98ca-353055fda1b7';
    v_plan_id UUID;
BEGIN
    SELECT id INTO v_plan_id FROM subscription_plans WHERE name = 'standard' LIMIT 1;

    DELETE FROM user_subscriptions WHERE user_id = v_user_id;

    INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        start_date,
        end_date,
        listings_used,
        images_used_this_month,
        videos_used_this_month
    ) VALUES (
        v_user_id,
        v_plan_id,
        'expired'::subscription_status,
        NOW() - INTERVAL '38 days',
        NOW() - INTERVAL '8 days',   -- EXPIRED 8 DAYS AGO
        6,
        15,
        2
    );

    RAISE NOTICE 'Created subscription EXPIRED 8 DAYS AGO (LISTINGS DEACTIVATED)';
END $$;

SELECT * FROM get_user_subscription_scenario('79804371-fb23-4347-98ca-353055fda1b7');
-- Expected: scenario = 3, days_expired = 8, listings_should_be_live = FALSE


-- =====================================================
-- TEST 6: FULLY EXPIRED - DAY 15 (Long expired)
-- =====================================================
DO $$
DECLARE
    v_user_id UUID := '79804371-fb23-4347-98ca-353055fda1b7';
    v_plan_id UUID;
BEGIN
    SELECT id INTO v_plan_id FROM subscription_plans WHERE name = 'standard' LIMIT 1;

    DELETE FROM user_subscriptions WHERE user_id = v_user_id;

    INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        start_date,
        end_date,
        listings_used,
        images_used_this_month,
        videos_used_this_month
    ) VALUES (
        v_user_id,
        v_plan_id,
        'expired'::subscription_status,
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '15 days',  -- EXPIRED 15 DAYS AGO
        8,
        20,
        3
    );

    RAISE NOTICE 'Created subscription EXPIRED 15 DAYS AGO';
END $$;

SELECT * FROM get_user_subscription_scenario('79804371-fb23-4347-98ca-353055fda1b7');
-- Expected: scenario = 3, days_expired = 15, listings_should_be_live = FALSE


-- =====================================================
-- TEST 7: NO SUBSCRIPTION (Never subscribed)
-- =====================================================
DO $$
DECLARE
    v_user_id UUID := '79804371-fb23-4347-98ca-353055fda1b7';
BEGIN
    -- Delete all subscriptions
    DELETE FROM user_subscriptions WHERE user_id = v_user_id;

    RAISE NOTICE 'Deleted all subscriptions - simulating user who never subscribed';
END $$;

SELECT * FROM get_user_subscription_scenario('79804371-fb23-4347-98ca-353055fda1b7');
-- Expected: scenario = 0, scenario_name = 'No Subscription'


-- =====================================================
-- QUICK TEST ALL SCENARIOS
-- =====================================================
-- This shows what each scenario looks like in a table
DO $$
DECLARE
    v_user_id UUID := '79804371-fb23-4347-98ca-353055fda1b7';
    v_plan_id UUID;
    test_cases TEXT[] := ARRAY['Active', 'Expired 1d', 'Expired 5d', 'Expired 7d', 'Expired 8d', 'Expired 15d'];
    intervals INTERVAL[] := ARRAY[
        INTERVAL '20 days',    -- Active (expires in future)
        INTERVAL '-1 day',     -- Expired 1 day ago
        INTERVAL '-5 days',    -- Expired 5 days ago
        INTERVAL '-7 days',    -- Expired 7 days ago
        INTERVAL '-8 days',    -- Expired 8 days ago
        INTERVAL '-15 days'    -- Expired 15 days ago
    ];
    i INTEGER;
    result RECORD;
BEGIN
    SELECT id INTO v_plan_id FROM subscription_plans WHERE name = 'standard' LIMIT 1;

    RAISE NOTICE '';
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'TESTING ALL SUBSCRIPTION SCENARIOS';
    RAISE NOTICE '====================================================';

    FOR i IN 1..array_length(test_cases, 1) LOOP
        -- Create test subscription
        DELETE FROM user_subscriptions WHERE user_id = v_user_id;

        INSERT INTO user_subscriptions (
            user_id, plan_id, status, start_date, end_date,
            listings_used, images_used_this_month, videos_used_this_month
        ) VALUES (
            v_user_id,
            v_plan_id,
            CASE WHEN intervals[i] > INTERVAL '0' THEN 'active'::subscription_status ELSE 'expired'::subscription_status END,
            NOW() - INTERVAL '30 days',
            NOW() + intervals[i],
            3, 8, 1
        );

        -- Get scenario
        SELECT * INTO result FROM get_user_subscription_scenario(v_user_id);

        RAISE NOTICE '';
        RAISE NOTICE 'Test Case: %', test_cases[i];
        RAISE NOTICE '  Scenario: % (%)', result.scenario, result.scenario_name;
        RAISE NOTICE '  Days Expired: %', result.days_expired;
        RAISE NOTICE '  Grace Days Left: %', result.grace_days_remaining;
        RAISE NOTICE '  Can Create: %', result.can_create_listings;
        RAISE NOTICE '  Listings Live: %', result.listings_should_be_live;
        RAISE NOTICE '  Message: %', result.warning_message;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '====================================================';
END $$;


-- =====================================================
-- CLEANUP: Reset to active subscription
-- =====================================================
DO $$
DECLARE
    v_user_id UUID := '79804371-fb23-4347-98ca-353055fda1b7';
    v_plan_id UUID;
BEGIN
    SELECT id INTO v_plan_id FROM subscription_plans WHERE name = 'standard' LIMIT 1;

    DELETE FROM user_subscriptions WHERE user_id = v_user_id;

    INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        start_date,
        end_date,
        listings_used,
        images_used_this_month,
        videos_used_this_month
    ) VALUES (
        v_user_id,
        v_plan_id,
        'active'::subscription_status,
        NOW(),
        NOW() + INTERVAL '30 days',
        0, 0, 0
    );

    RAISE NOTICE 'RESET: Created fresh active subscription for 30 days';
END $$;

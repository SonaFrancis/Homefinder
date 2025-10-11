-- =====================================================
-- TEST STANDARD SUBSCRIPTION (Analytics Locked)
-- =====================================================
-- This creates an active STANDARD subscription
-- Analytics tab should be LOCKED for standard users

DO $$
DECLARE
    v_user_id UUID := '79804371-fb23-4347-98ca-353055fda1b7';
    v_plan_id UUID;
BEGIN
    -- Get Standard plan ID
    SELECT id INTO v_plan_id FROM subscription_plans WHERE name = 'standard' LIMIT 1;

    -- Delete existing subscriptions for this user
    DELETE FROM user_subscriptions WHERE user_id = v_user_id;

    -- Create STANDARD subscription (expires in 20 days)
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
        NOW() + INTERVAL '20 days',
        2,
        5,
        0
    );

    RAISE NOTICE 'Created ACTIVE STANDARD subscription - Analytics should be LOCKED';
END $$;

-- Check the scenario
SELECT * FROM get_user_subscription_scenario('79804371-fb23-4347-98ca-353055fda1b7');

-- Verify the plan type
SELECT
    us.status,
    sp.name as plan_name,
    sp.display_name,
    us.end_date
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = '79804371-fb23-4347-98ca-353055fda1b7';


-- =====================================================
-- TEST PREMIUM SUBSCRIPTION (Analytics Unlocked)
-- =====================================================
-- This creates an active PREMIUM subscription
-- Analytics tab should be UNLOCKED for premium users

DO $$
DECLARE
    v_user_id UUID := '79804371-fb23-4347-98ca-353055fda1b7';
    v_plan_id UUID;
BEGIN
    -- Get Premium plan ID
    SELECT id INTO v_plan_id FROM subscription_plans WHERE name = 'premium' LIMIT 1;

    -- Delete existing subscriptions for this user
    DELETE FROM user_subscriptions WHERE user_id = v_user_id;

    -- Create PREMIUM subscription (expires in 20 days)
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
        NOW() + INTERVAL '20 days',
        2,
        5,
        0
    );

    RAISE NOTICE 'Created ACTIVE PREMIUM subscription - Analytics should be UNLOCKED';
END $$;

-- Check the scenario
SELECT * FROM get_user_subscription_scenario('79804371-fb23-4347-98ca-353055fda1b7');

-- Verify the plan type
SELECT
    us.status,
    sp.name as plan_name,
    sp.display_name,
    us.end_date
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = '79804371-fb23-4347-98ca-353055fda1b7';

-- =====================================================
-- CREATE TEST SUBSCRIPTION FOR CURRENT USER
-- This will give your current user a premium subscription for testing
-- =====================================================

-- First, let's see what subscription plans exist
SELECT * FROM subscription_plans ORDER BY price;

-- Create a subscription for a specific user (replace 'YOUR_USER_EMAIL' with actual email)
-- This gives them a 30-day premium subscription
INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    start_date,
    end_date,
    listings_used
)
SELECT
    p.id AS user_id,
    sp.id AS plan_id,
    'active' AS status,
    NOW() AS start_date,
    NOW() + INTERVAL '30 days' AS end_date,
    0 AS listings_used
FROM profiles p
CROSS JOIN subscription_plans sp
WHERE p.email = 'YOUR_USER_EMAIL_HERE'  -- Replace with your email
  AND sp.name = 'premium'  -- or 'standard'
LIMIT 1;

-- Alternative: Give subscription to ALL users (for testing)
-- Uncomment below to give everyone a Premium subscription
/*
INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    start_date,
    end_date,
    listings_used
)
SELECT
    p.id AS user_id,
    sp.id AS plan_id,
    'active' AS status,
    NOW() AS start_date,
    NOW() + INTERVAL '30 days' AS end_date,
    0 AS listings_used
FROM profiles p
CROSS JOIN subscription_plans sp
WHERE sp.name = 'premium'
  AND NOT EXISTS (
    SELECT 1 FROM user_subscriptions us
    WHERE us.user_id = p.id
      AND us.status = 'active'
  );
*/

-- Verify the subscription was created
SELECT
    p.email,
    p.full_name,
    us.status,
    us.start_date,
    us.end_date,
    sp.name AS plan_name,
    sp.max_listings,
    us.listings_used
FROM user_subscriptions us
JOIN profiles p ON us.user_id = p.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
ORDER BY us.created_at DESC;

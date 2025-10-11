-- =====================================================
-- CREATE PREMIUM SUBSCRIPTION FOR NEW USER (SIMPLE)
-- =====================================================
-- This creates a new Premium subscription for a user
-- who doesn't have any subscription yet
-- =====================================================

-- STEP 1: Get your user ID (replace with your email)
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
-- Copy the id and use it as YOUR-USER-ID below

-- STEP 2: Check if user already has a subscription
SELECT
    user_id,
    status,
    posts_used_this_month
FROM user_subscriptions
WHERE user_id = 'YOUR-USER-ID';  -- Replace with your actual user ID

-- If the query above returns a row, the user already has a subscription.
-- In that case, use the UPDATE query below.
-- If it returns nothing, use the INSERT query below.

-- =====================================================
-- OPTION A: INSERT (if user has NO subscription)
-- =====================================================
INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    start_date,
    end_date,
    posts_used_this_month,
    current_month_start,
    created_at,
    updated_at
)
VALUES (
    'YOUR-USER-ID',  -- Replace with your actual user ID
    (SELECT id FROM subscription_plans WHERE name = 'premium'),
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    0,  -- Fresh quota: 0 posts used
    NOW(),
    NOW(),
    NOW()
);

-- =====================================================
-- OPTION B: UPDATE (if user already has a subscription)
-- =====================================================
-- UPDATE user_subscriptions
-- SET
--     plan_id = (SELECT id FROM subscription_plans WHERE name = 'premium'),
--     status = 'active',
--     start_date = NOW(),
--     end_date = NOW() + INTERVAL '30 days',
--     posts_used_this_month = 0,
--     current_month_start = NOW(),
--     updated_at = NOW()
-- WHERE user_id = 'YOUR-USER-ID';  -- Replace with your actual user ID

-- =====================================================
-- STEP 3: Verify the subscription
-- =====================================================
SELECT
    us.user_id,
    p.email,
    sp.name as plan_name,
    sp.display_name,
    sp.max_posts_per_month,
    us.posts_used_this_month,
    us.status,
    us.start_date,
    us.end_date,
    EXTRACT(DAY FROM (us.end_date - NOW()))::INTEGER as days_remaining
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
LEFT JOIN profiles p ON us.user_id = p.id
WHERE us.user_id = 'YOUR-USER-ID';  -- Replace with your actual user ID

-- Expected output:
-- | user_id | email | plan_name | display_name | max_posts | posts_used | status | days_remaining |
-- | xxx-xxx | user@email.com | premium | Premium Plan | 25 | 0 | active | 30 |

SELECT '✅ Premium subscription created successfully with fresh quotas (0/25 posts)!' as status;

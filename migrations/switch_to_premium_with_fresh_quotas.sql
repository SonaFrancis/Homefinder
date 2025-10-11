-- =====================================================
-- SWITCH USER TO PREMIUM WITH FRESH QUOTAS
-- =====================================================
-- This updates your subscription to Premium plan
-- with fresh quotas and 30 days validity
-- =====================================================

-- STEP 1: Get your user ID (replace with your email)
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
-- Copy the id and use it as YOUR-USER-ID below

-- STEP 2: Update to Premium subscription with fresh quotas
UPDATE user_subscriptions
SET
    plan_id = (SELECT id FROM subscription_plans WHERE name = 'premium'),
    status = 'active',
    start_date = NOW(),
    end_date = NOW() + INTERVAL '30 days',
    posts_used_this_month = 0,  -- Reset quota to 0
    current_month_start = NOW(),
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID';  -- Replace with your actual user ID

-- STEP 3: Verify the update
SELECT
    us.user_id,
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
WHERE us.user_id = 'YOUR-USER-ID';  -- Replace with your actual user ID

-- Expected output:
-- | plan_name | display_name | max_posts_per_month | posts_used_this_month | status | days_remaining |
-- | premium   | Premium Plan | 25                  | 0                     | active | 30             |

SELECT '✅ Switched to Premium with fresh quotas (0/25 posts used)!' as status;

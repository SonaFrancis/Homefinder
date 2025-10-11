-- =====================================================
-- TEST ALL POST-BASED QUOTA SCENARIOS
-- =====================================================
-- This script tests all subscription scenarios with the
-- new post-based quota system
-- =====================================================

-- =====================================================
-- FIND YOUR TEST USER
-- =====================================================

SELECT
    '👤 YOUR USER INFO' as section,
    p.id as user_id,
    p.full_name,
    p.email,
    p.role
FROM profiles p
WHERE p.role IN ('landlord', 'seller')
ORDER BY p.created_at DESC
LIMIT 1;

-- ⚠️ COPY YOUR USER_ID FROM ABOVE AND USE IT BELOW
-- Replace 'YOUR-USER-ID-HERE' with your actual user ID

-- =====================================================
-- VIEW CURRENT SUBSCRIPTION STATUS
-- =====================================================

SELECT
    '📊 CURRENT SUBSCRIPTION STATUS' as section,
    us.id,
    sp.name as plan_name,
    sp.display_name,
    sp.max_posts_per_month,
    sp.max_images_per_post,
    sp.max_videos_per_post,
    us.status,
    us.posts_used_this_month,
    us.current_month_start,
    us.end_date,
    CASE
        WHEN us.end_date > NOW() THEN 'Active'
        ELSE 'Expired'
    END as subscription_state
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

-- =====================================================
-- TEST SCENARIO 1A: ACTIVE SUBSCRIPTION WITH QUOTA AVAILABLE
-- =====================================================

-- Setup: Set subscription as active with posts remaining
UPDATE user_subscriptions
SET
    status = 'active',
    end_date = NOW() + INTERVAL '30 days',
    posts_used_this_month = 5,
    current_month_start = NOW() - INTERVAL '10 days',
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE' -- REPLACE THIS
AND status IN ('active', 'expired');

-- Check if user can post
SELECT
    '📊 SCENARIO 1A: Active + Posts Available' as test,
    *
FROM can_user_post('YOUR-USER-ID-HERE'); -- REPLACE THIS

-- Expected:
-- can_post: TRUE
-- posts_remaining: 15 (for Standard: 20-5) or 20 (for Premium: 25-5)
-- max_posts: 20 (Standard) or 25 (Premium)
-- message: 'Can post'

-- View subscription scenario
SELECT
    '📊 SCENARIO 1A: Subscription Scenario' as test,
    scenario,
    scenario_name,
    subscription_status,
    can_create_listings,
    can_upload_media,
    listings_should_be_live,
    can_edit_listings,
    dashboard_access,
    listings_used,
    max_listings,
    warning_message
FROM get_user_subscription_scenario('YOUR-USER-ID-HERE'); -- REPLACE THIS

-- Expected:
-- scenario: 1
-- can_create_listings: TRUE
-- can_upload_media: TRUE
-- listings_should_be_live: TRUE
-- can_edit_listings: TRUE
-- dashboard_access: 'full'

-- =====================================================
-- TEST SCENARIO 1B: ACTIVE SUBSCRIPTION WITH POST QUOTA EXHAUSTED
-- =====================================================

-- Test 1B: Exhaust post quota
UPDATE user_subscriptions us
SET
    posts_used_this_month = sp.max_posts_per_month
FROM subscription_plans sp
WHERE us.user_id = 'YOUR-USER-ID-HERE' -- REPLACE THIS
AND us.plan_id = sp.id;

SELECT
    '📊 SCENARIO 1B: Active + Post Quota Exhausted' as test,
    *
FROM can_user_post('YOUR-USER-ID-HERE'); -- REPLACE THIS

-- Expected:
-- can_post: FALSE
-- posts_remaining: 0
-- max_posts: 20 (Standard) or 25 (Premium)
-- message: 'Monthly post limit reached'

SELECT
    '📊 SCENARIO 1B: Subscription Scenario' as test,
    scenario,
    scenario_name,
    can_create_listings,
    can_upload_media,
    listings_should_be_live,
    can_edit_listings,
    warning_message
FROM get_user_subscription_scenario('YOUR-USER-ID-HERE'); -- REPLACE THIS

-- Expected:
-- scenario: 1
-- can_create_listings: FALSE (quota full)
-- can_upload_media: FALSE (quota full)
-- listings_should_be_live: TRUE (still active!)
-- can_edit_listings: TRUE
-- warning_message: "Monthly listing quota exhausted..."

-- =====================================================
-- TEST SCENARIO 2A: GRACE PERIOD WITH POSTS AVAILABLE
-- =====================================================

-- Test 2A: Expired 3 days ago with quota remaining
UPDATE user_subscriptions
SET
    status = 'active', -- Will be detected as expired by function
    end_date = NOW() - INTERVAL '3 days',
    posts_used_this_month = 8,
    current_month_start = NOW() - INTERVAL '15 days',
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

SELECT
    '📊 SCENARIO 2A: Grace Period + Posts Available' as test,
    scenario,
    days_expired,
    grace_days_remaining,
    can_create_listings,
    can_upload_media,
    listings_should_be_live,
    can_edit_listings,
    listings_used,
    max_listings,
    warning_message
FROM get_user_subscription_scenario('YOUR-USER-ID-HERE'); -- REPLACE THIS

-- Expected:
-- scenario: 2
-- days_expired: 3
-- grace_days_remaining: 4
-- can_create_listings: TRUE (can use remaining quota!)
-- can_upload_media: TRUE (can use remaining quota!)
-- listings_should_be_live: TRUE (grace active!)
-- can_edit_listings: TRUE
-- warning_message: "Subscription expired 3 days ago. Grace period: 4 days remaining..."

SELECT
    '📊 SCENARIO 2A: Can User Post?' as test,
    *
FROM can_user_post('YOUR-USER-ID-HERE'); -- REPLACE THIS

-- Expected:
-- can_post: TRUE
-- posts_remaining: 12 (Standard: 20-8) or 17 (Premium: 25-8)

-- =====================================================
-- TEST SCENARIO 2B: GRACE PERIOD WITH POST QUOTA EXHAUSTED
-- =====================================================

-- Test 2B: Expired with quota exhausted
UPDATE user_subscriptions us
SET
    end_date = NOW() - INTERVAL '5 days',
    posts_used_this_month = sp.max_posts_per_month
FROM subscription_plans sp
WHERE us.user_id = 'YOUR-USER-ID-HERE' -- REPLACE THIS
AND us.plan_id = sp.id;

SELECT
    '📊 SCENARIO 2B: Grace Period + Post Quota Exhausted' as test,
    scenario,
    days_expired,
    grace_days_remaining,
    can_create_listings,
    can_upload_media,
    listings_should_be_live,
    can_edit_listings,
    warning_message
FROM get_user_subscription_scenario('YOUR-USER-ID-HERE'); -- REPLACE THIS

-- Expected:
-- scenario: 2
-- days_expired: 5
-- grace_days_remaining: 2
-- can_create_listings: FALSE (quota full)
-- can_upload_media: FALSE (quota full)
-- listings_should_be_live: TRUE (grace still active!)
-- can_edit_listings: TRUE

SELECT
    '📊 SCENARIO 2B: Can User Post?' as test,
    *
FROM can_user_post('YOUR-USER-ID-HERE'); -- REPLACE THIS

-- Expected:
-- can_post: FALSE (if expired) or FALSE (quota full)
-- posts_remaining: 0

-- =====================================================
-- TEST SCENARIO 3: GRACE PERIOD ENDED
-- =====================================================

UPDATE user_subscriptions
SET
    status = 'active',
    end_date = NOW() - INTERVAL '10 days',
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

SELECT
    '📊 SCENARIO 3: Grace Period Ended' as test,
    scenario,
    days_expired,
    grace_days_remaining,
    can_create_listings,
    can_upload_media,
    listings_should_be_live,
    can_edit_listings,
    dashboard_access,
    warning_message
FROM get_user_subscription_scenario('YOUR-USER-ID-HERE'); -- REPLACE THIS

-- Expected:
-- scenario: 3
-- days_expired: 10
-- grace_days_remaining: 0
-- can_create_listings: FALSE
-- can_upload_media: FALSE
-- listings_should_be_live: FALSE (deactivated!)
-- can_edit_listings: FALSE
-- dashboard_access: 'readonly'

SELECT
    '📊 SCENARIO 3: Can User Post?' as test,
    *
FROM can_user_post('YOUR-USER-ID-HERE'); -- REPLACE THIS

-- Expected:
-- can_post: FALSE
-- posts_remaining: 0
-- message: 'No active subscription'

-- Check if listings were deactivated
SELECT
    '🔍 Listings Status After Grace Ended' as check,
    id,
    title,
    is_available,
    CASE
        WHEN is_available THEN '❌ STILL LIVE (Should be deactivated!)'
        ELSE '✅ Correctly deactivated'
    END as status
FROM rental_properties
WHERE landlord_id = 'YOUR-USER-ID-HERE' -- REPLACE THIS
LIMIT 5;

-- =====================================================
-- TEST MONTHLY POST RESET
-- =====================================================

-- Setup: User with old month_start date
UPDATE user_subscriptions
SET
    status = 'active',
    end_date = NOW() + INTERVAL '30 days',
    posts_used_this_month = 18,
    current_month_start = NOW() - INTERVAL '35 days',
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

SELECT
    '📊 BEFORE RESET: Post Count Should Auto-Reset' as test,
    posts_used_this_month,
    current_month_start,
    CASE
        WHEN current_month_start + INTERVAL '30 days' < CURRENT_DATE
        THEN '✅ Should reset (month passed)'
        ELSE '❌ Should NOT reset'
    END as reset_status
FROM user_subscriptions
WHERE user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

-- Call the can_user_post function which auto-resets if needed
SELECT
    '📊 AFTER AUTO-RESET: Calling can_user_post()' as test,
    *
FROM can_user_post('YOUR-USER-ID-HERE'); -- REPLACE THIS

-- Expected:
-- can_post: TRUE
-- posts_remaining: Full quota (20 or 25)
-- The function should have auto-reset posts_used_this_month to 0

-- Verify reset happened
SELECT
    '📊 VERIFY RESET HAPPENED' as test,
    posts_used_this_month,
    current_month_start,
    CASE
        WHEN posts_used_this_month = 0
        THEN '✅ Posts correctly reset to 0'
        ELSE '❌ Posts NOT reset (still showing old count)'
    END as status
FROM user_subscriptions
WHERE user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

-- =====================================================
-- TEST POST INCREMENT FUNCTION
-- =====================================================

-- Setup: User with available posts
UPDATE user_subscriptions
SET
    status = 'active',
    end_date = NOW() + INTERVAL '30 days',
    posts_used_this_month = 5,
    current_month_start = NOW(),
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

-- Get count before
SELECT
    '📊 BEFORE INCREMENT' as test,
    posts_used_this_month
FROM user_subscriptions
WHERE user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

-- Increment post count
SELECT
    '📊 INCREMENT POST COUNT' as test,
    increment_post_count('YOUR-USER-ID-HERE') as success; -- REPLACE THIS

-- Expected: TRUE

-- Get count after
SELECT
    '📊 AFTER INCREMENT' as test,
    posts_used_this_month,
    CASE
        WHEN posts_used_this_month = 6
        THEN '✅ Correctly incremented to 6'
        ELSE '❌ NOT incremented properly'
    END as status
FROM user_subscriptions
WHERE user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

-- =====================================================
-- TEST REACTIVATION ON RENEWAL
-- =====================================================

-- Renew subscription and reset post quota
UPDATE user_subscriptions
SET
    status = 'active',
    end_date = NOW() + INTERVAL '30 days',
    posts_used_this_month = 0,
    current_month_start = NOW(),
    listings_used = 0,
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

-- Check if listings were reactivated
SELECT
    '✅ Listings Status After Renewal' as check,
    id,
    title,
    is_available,
    CASE
        WHEN is_available THEN '✅ Correctly reactivated'
        ELSE '❌ STILL INACTIVE (Should be reactivated!)'
    END as status
FROM rental_properties
WHERE landlord_id = 'YOUR-USER-ID-HERE' -- REPLACE THIS
LIMIT 5;

-- Check notification sent
SELECT
    '📬 Reactivation Notification' as check,
    title,
    message,
    created_at
FROM notifications
WHERE user_id = 'YOUR-USER-ID-HERE' -- REPLACE THIS
AND title LIKE '%Welcome Back%'
ORDER BY created_at DESC
LIMIT 1;

-- =====================================================
-- TEST AUTOMATED DEACTIVATION FUNCTION
-- =====================================================

-- Setup: Create expired subscription (8 days old)
UPDATE user_subscriptions
SET
    status = 'active',
    end_date = NOW() - INTERVAL '8 days',
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

-- Ensure listings are active first
UPDATE rental_properties
SET is_available = TRUE
WHERE landlord_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

-- Run deactivation function
SELECT * FROM deactivate_listings_after_grace_period();

-- Check results
SELECT
    '📊 Deactivation Results' as test,
    p.full_name,
    us.status,
    EXTRACT(DAY FROM (NOW() - us.end_date))::INTEGER as days_expired,
    us.posts_used_this_month,
    sp.max_posts_per_month,
    COUNT(rp.id) as total_listings,
    COUNT(rp.id) FILTER (WHERE rp.is_available = FALSE) as deactivated_listings
FROM profiles p
JOIN user_subscriptions us ON us.user_id = p.id
JOIN subscription_plans sp ON sp.id = us.plan_id
LEFT JOIN rental_properties rp ON rp.landlord_id = p.id
WHERE p.id = 'YOUR-USER-ID-HERE' -- REPLACE THIS
GROUP BY p.full_name, us.status, us.end_date, us.posts_used_this_month, sp.max_posts_per_month;

-- =====================================================
-- CLEANUP: RESET TO ACTIVE
-- =====================================================

UPDATE user_subscriptions
SET
    status = 'active',
    end_date = NOW() + INTERVAL '30 days',
    posts_used_this_month = 0,
    current_month_start = NOW(),
    listings_used = 0,
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

UPDATE rental_properties
SET is_available = TRUE
WHERE landlord_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

SELECT '✅ Tests Complete! User reset to active subscription with fresh post quota.' as status;

-- =====================================================
-- VIEW FINAL SUBSCRIPTION STATUS
-- =====================================================

SELECT
    '📊 FINAL SUBSCRIPTION STATUS' as section,
    sp.name as plan_name,
    sp.display_name,
    sp.max_posts_per_month,
    sp.max_images_per_post,
    sp.max_videos_per_post,
    us.status,
    us.posts_used_this_month,
    us.current_month_start,
    us.end_date,
    CASE
        WHEN us.end_date > NOW() THEN '✅ Active'
        ELSE '❌ Expired'
    END as subscription_state
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.user_id = 'YOUR-USER-ID-HERE'; -- REPLACE THIS

-- =====================================================
-- SUMMARY: EXPECTED BEHAVIOR WITH POST-BASED QUOTAS
-- =====================================================

/*
POST-BASED QUOTA SYSTEM:
- Standard Plan: 20 posts/month (5 images, 1 video per post)
- Premium Plan: 25 posts/month (10 images, 2 videos per post)

SCENARIO 1A (Active + Posts Available):
✅ Can create listings (post quota available)
✅ Can upload media (post quota available)
✅ Listings LIVE
✅ Can edit
✅ Per-post limits enforced: Standard (5 img, 1 vid) | Premium (10 img, 2 vid)

SCENARIO 1B (Active + Post Quota Exhausted):
❌ Cannot create (post quota full)
❌ Cannot upload (post quota full)
✅ Listings STILL LIVE (subscription active!)
✅ Can edit existing listings
⚠️ Warning: "Monthly post limit reached"

SCENARIO 2A (Grace + Posts Available):
✅ Can create (using remaining post quota)
✅ Can upload (using remaining post quota)
✅ Listings STILL LIVE (grace active)
✅ Can edit
⚠️ Warning: X days left in grace period

SCENARIO 2B (Grace + Post Quota Exhausted):
❌ Cannot create (post quota full)
❌ Cannot upload (post quota full)
✅ Listings STILL LIVE (grace active)
✅ Can edit
⚠️ Warning: X days left + quota exhausted

SCENARIO 3 (Grace Ended):
❌ Cannot create
❌ Cannot upload
❌ Listings DEACTIVATED
❌ Cannot edit
⚠️ Read-only dashboard

AUTOMATIC RESET:
✅ Post count auto-resets monthly (after 30 days from current_month_start)
✅ Reset happens automatically when can_user_post() is called
✅ current_month_start is updated to current date

PER-POST MEDIA LIMITS:
Standard: Max 5 images + 1 video per individual post
Premium: Max 10 images + 2 videos per individual post
*/

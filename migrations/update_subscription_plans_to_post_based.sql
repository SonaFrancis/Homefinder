-- =====================================================
-- UPDATE SUBSCRIPTION PLANS TO POST-BASED LIMITS
-- =====================================================
-- Changes subscription plans to focus on number of posts
-- Standard: 20 posts/month (5 images, 1 video per post)
-- Premium: 25 posts/month (5 images, 2 videos per post)

-- Update subscription_plans table structure
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_posts_per_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_images_per_post INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_videos_per_post INTEGER DEFAULT 0;

-- Update existing columns descriptions
COMMENT ON COLUMN subscription_plans.max_posts_per_month IS 'Maximum number of posts (properties + marketplace items) user can create per month';
COMMENT ON COLUMN subscription_plans.max_images_per_post IS 'Maximum number of images allowed per post';
COMMENT ON COLUMN subscription_plans.max_videos_per_post IS 'Maximum number of videos allowed per post';

-- Update Standard Plan
UPDATE subscription_plans
SET
  max_posts_per_month = 20,
  max_images_per_post = 5,
  max_videos_per_post = 1,
  max_listings = 20, -- Keep for backwards compatibility
  description = 'Perfect for individual landlords and sellers. Post up to 20 listings per month with 5 images and 1 video per post.'
WHERE name = 'standard';

-- Update Premium Plan
UPDATE subscription_plans
SET
  max_posts_per_month = 25,
  max_images_per_post = 10,
  max_videos_per_post = 2,
  max_listings = 25, -- Keep for backwards compatibility
  description = 'Ideal for property managers and businesses. Post up to 25 listings per month with 10 images and 2 videos per post, plus premium features.'
WHERE name = 'premium';

-- Update user_subscriptions table to track posts
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS posts_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_month_start DATE DEFAULT CURRENT_DATE;

COMMENT ON COLUMN user_subscriptions.posts_used_this_month IS 'Number of posts created in current billing month';
COMMENT ON COLUMN user_subscriptions.current_month_start IS 'Start date of current billing month for tracking posts';

-- Create function to reset monthly post count
CREATE OR REPLACE FUNCTION reset_monthly_post_count()
RETURNS void AS $$
BEGIN
  -- Reset post count for subscriptions where month has passed
  UPDATE user_subscriptions
  SET
    posts_used_this_month = 0,
    current_month_start = CURRENT_DATE
  WHERE
    status = 'active'
    AND current_month_start + INTERVAL '30 days' < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can post
CREATE OR REPLACE FUNCTION can_user_post(p_user_id UUID)
RETURNS TABLE (
  can_post BOOLEAN,
  posts_remaining INTEGER,
  max_posts INTEGER,
  message TEXT
) AS $$
DECLARE
  v_subscription user_subscriptions%ROWTYPE;
  v_plan subscription_plans%ROWTYPE;
BEGIN
  -- Get user's active subscription
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND end_date > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- No active subscription
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'No active subscription'::TEXT;
    RETURN;
  END IF;

  -- Reset monthly count if month has passed
  IF v_subscription.current_month_start + INTERVAL '30 days' < CURRENT_DATE THEN
    UPDATE user_subscriptions
    SET
      posts_used_this_month = 0,
      current_month_start = CURRENT_DATE
    WHERE id = v_subscription.id;

    v_subscription.posts_used_this_month := 0;
  END IF;

  -- Get plan details
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = v_subscription.plan_id;

  -- Check if user has posts remaining
  IF v_subscription.posts_used_this_month >= v_plan.max_posts_per_month THEN
    RETURN QUERY SELECT
      FALSE,
      0,
      v_plan.max_posts_per_month,
      'Monthly post limit reached'::TEXT;
  ELSE
    RETURN QUERY SELECT
      TRUE,
      v_plan.max_posts_per_month - v_subscription.posts_used_this_month,
      v_plan.max_posts_per_month,
      'Can post'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment post count
CREATE OR REPLACE FUNCTION increment_post_count(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_can_post BOOLEAN;
BEGIN
  -- Check if user can post
  SELECT can_post INTO v_can_post
  FROM can_user_post(p_user_id)
  LIMIT 1;

  IF NOT v_can_post THEN
    RETURN FALSE;
  END IF;

  -- Increment post count
  UPDATE user_subscriptions
  SET posts_used_this_month = posts_used_this_month + 1
  WHERE user_id = p_user_id
    AND status = 'active'
    AND end_date > NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION reset_monthly_post_count() TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_post(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_post_count(UUID) TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions(user_id, status) WHERE status = 'active';

-- Set up cron job to reset monthly counts (if pg_cron is available)
-- You can also set this up in Supabase Dashboard > Database > Cron Jobs
-- Schedule: Run daily at midnight
-- Command: SELECT reset_monthly_post_count();

-- Verify the updates
SELECT
  name,
  price,
  max_posts_per_month,
  max_images_per_post,
  max_videos_per_post,
  description
FROM subscription_plans
ORDER BY price;

SELECT 'Subscription plans updated successfully!' AS status;

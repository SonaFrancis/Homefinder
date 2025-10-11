-- =====================================================
-- SUBSCRIPTION MANAGEMENT FUNCTIONS
-- =====================================================
-- Handles subscription activation, upgrades, and management

-- Function to activate user subscription after payment
CREATE OR REPLACE FUNCTION activate_user_subscription(
  p_user_id UUID,
  p_plan_type TEXT,
  p_payment_transaction_id UUID
)
RETURNS TABLE (
  subscription_id UUID,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_plan_id UUID;
  v_subscription_id UUID;
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the plan_id based on plan_type
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE LOWER(name) = LOWER(p_plan_type)
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Subscription plan not found';
    RETURN;
  END IF;

  -- Set subscription dates
  v_start_date := NOW();
  v_end_date := NOW() + INTERVAL '30 days';

  -- Check if user already has an active subscription
  SELECT id INTO v_subscription_id
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  LIMIT 1;

  IF v_subscription_id IS NOT NULL THEN
    -- Update existing subscription (extend by 30 days)
    UPDATE user_subscriptions
    SET
      plan_id = v_plan_id,
      end_date = GREATEST(end_date, NOW()) + INTERVAL '30 days',
      updated_at = NOW()
    WHERE id = v_subscription_id;

    -- Link payment transaction to subscription
    UPDATE payment_transactions
    SET subscription_id = v_subscription_id
    WHERE id = p_payment_transaction_id;

    RETURN QUERY SELECT v_subscription_id, TRUE, 'Subscription renewed successfully';
  ELSE
    -- Create new subscription
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      start_date,
      end_date
    ) VALUES (
      p_user_id,
      v_plan_id,
      'active',
      v_start_date,
      v_end_date
    )
    RETURNING id INTO v_subscription_id;

    -- Link payment transaction to subscription
    UPDATE payment_transactions
    SET subscription_id = v_subscription_id
    WHERE id = p_payment_transaction_id;

    RETURN QUERY SELECT v_subscription_id, TRUE, 'Subscription activated successfully';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upgrade user subscription plan
CREATE OR REPLACE FUNCTION upgrade_user_subscription(
  p_user_id UUID,
  p_new_plan_type TEXT,
  p_payment_transaction_id UUID
)
RETURNS TABLE (
  subscription_id UUID,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_new_plan_id UUID;
  v_current_plan_id UUID;
  v_subscription_id UUID;
  v_current_end_date TIMESTAMP WITH TIME ZONE;
  v_new_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the new plan_id
  SELECT id INTO v_new_plan_id
  FROM subscription_plans
  WHERE LOWER(name) = LOWER(p_new_plan_type)
  LIMIT 1;

  IF v_new_plan_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'New subscription plan not found';
    RETURN;
  END IF;

  -- Get user's current active subscription
  SELECT id, plan_id, end_date
  INTO v_subscription_id, v_current_plan_id, v_current_end_date
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  LIMIT 1;

  IF v_subscription_id IS NULL THEN
    -- No active subscription, create new one
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      start_date,
      end_date
    ) VALUES (
      p_user_id,
      v_new_plan_id,
      'active',
      NOW(),
      NOW() + INTERVAL '30 days'
    )
    RETURNING id INTO v_subscription_id;

    -- Link payment transaction
    UPDATE payment_transactions
    SET subscription_id = v_subscription_id
    WHERE id = p_payment_transaction_id;

    RETURN QUERY SELECT v_subscription_id, TRUE, 'Subscription created successfully';
  ELSE
    -- Check if it's an upgrade or same plan
    IF v_current_plan_id = v_new_plan_id THEN
      -- Same plan, just extend by 30 days
      v_new_end_date := GREATEST(v_current_end_date, NOW()) + INTERVAL '30 days';
    ELSE
      -- Upgrading to different plan, extend by 30 days from now
      v_new_end_date := GREATEST(v_current_end_date, NOW()) + INTERVAL '30 days';
    END IF;

    -- Update subscription
    UPDATE user_subscriptions
    SET
      plan_id = v_new_plan_id,
      end_date = v_new_end_date,
      updated_at = NOW()
    WHERE id = v_subscription_id;

    -- Link payment transaction
    UPDATE payment_transactions
    SET subscription_id = v_subscription_id
    WHERE id = p_payment_transaction_id;

    RETURN QUERY SELECT v_subscription_id, TRUE, 'Subscription upgraded successfully';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current subscription details
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_name TEXT,
  plan_price DECIMAL,
  status TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.id AS subscription_id,
    sp.name AS plan_name,
    sp.price AS plan_price,
    us.status,
    us.start_date,
    us.end_date,
    GREATEST(0, EXTRACT(DAY FROM (us.end_date - NOW()))::INTEGER) AS days_remaining,
    (us.status = 'active' AND us.end_date > NOW()) AS is_active
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION activate_user_subscription(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upgrade_user_subscription(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription(UUID) TO authenticated;

-- Verify functions created
SELECT
  'Subscription management functions created!' AS status,
  'activate_user_subscription, upgrade_user_subscription, get_user_subscription' AS functions;

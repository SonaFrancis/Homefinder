-- =====================================================
-- FIX SUBSCRIPTION CHECK FUNCTION
-- The function uses seller_id but rental_properties uses landlord_id
-- =====================================================

-- Drop the old function
DROP FUNCTION IF EXISTS check_subscription_before_post() CASCADE;

-- Create a new function for rental properties (uses landlord_id)
CREATE OR REPLACE FUNCTION check_subscription_before_rental_post()
RETURNS TRIGGER AS $$
DECLARE
    active_subscription RECORD;
BEGIN
    -- Get active subscription using landlord_id
    SELECT us.*, sp.max_listings
    INTO active_subscription
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = NEW.landlord_id
    AND us.status = 'active'
    AND us.end_date > NOW()
    ORDER BY us.end_date DESC
    LIMIT 1;

    IF active_subscription IS NULL THEN
        RAISE EXCEPTION 'Active subscription required to post listings. Please subscribe to continue.';
    END IF;

    IF active_subscription.listings_used >= active_subscription.max_listings THEN
        RAISE EXCEPTION 'Listing limit reached for current subscription plan.';
    END IF;

    NEW.subscription_id = active_subscription.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a new function for marketplace items (uses seller_id)
CREATE OR REPLACE FUNCTION check_subscription_before_marketplace_post()
RETURNS TRIGGER AS $$
DECLARE
    active_subscription RECORD;
BEGIN
    -- Get active subscription using seller_id
    SELECT us.*, sp.max_listings
    INTO active_subscription
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = NEW.seller_id
    AND us.status = 'active'
    AND us.end_date > NOW()
    ORDER BY us.end_date DESC
    LIMIT 1;

    IF active_subscription IS NULL THEN
        RAISE EXCEPTION 'Active subscription required to post listings. Please subscribe to continue.';
    END IF;

    IF active_subscription.listings_used >= active_subscription.max_listings THEN
        RAISE EXCEPTION 'Listing limit reached for current subscription plan.';
    END IF;

    NEW.subscription_id = active_subscription.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
-- Rental properties uses landlord_id
CREATE TRIGGER check_subscription_rental BEFORE INSERT ON rental_properties
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_rental_post();

-- All marketplace items use seller_id
CREATE TRIGGER check_subscription_electronics BEFORE INSERT ON electronics
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_marketplace_post();

CREATE TRIGGER check_subscription_fashion BEFORE INSERT ON fashion
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_marketplace_post();

CREATE TRIGGER check_subscription_cosmetics BEFORE INSERT ON cosmetics
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_marketplace_post();

CREATE TRIGGER check_subscription_house_items BEFORE INSERT ON house_items
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_marketplace_post();

CREATE TRIGGER check_subscription_cars BEFORE INSERT ON cars
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_marketplace_post();

CREATE TRIGGER check_subscription_properties_sale BEFORE INSERT ON properties_for_sale
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_marketplace_post();

CREATE TRIGGER check_subscription_businesses BEFORE INSERT ON businesses
    FOR EACH ROW EXECUTE FUNCTION check_subscription_before_marketplace_post();

-- Success message
SELECT 'Subscription check functions fixed! rental_properties uses landlord_id, marketplace items use seller_id' AS status;

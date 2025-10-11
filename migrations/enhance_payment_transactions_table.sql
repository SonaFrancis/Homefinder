-- =====================================================
-- ENHANCE PAYMENT TRANSACTIONS TABLE
-- =====================================================
-- Adds necessary columns for complete payment history tracking

-- Add missing columns if they don't exist
ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS provider_response JSONB,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS plan_type TEXT,
ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly';

-- Add comments to describe columns
COMMENT ON COLUMN payment_transactions.id IS 'Unique transaction identifier';
COMMENT ON COLUMN payment_transactions.user_id IS 'User who made the payment';
COMMENT ON COLUMN payment_transactions.subscription_id IS 'Related subscription (if applicable)';
COMMENT ON COLUMN payment_transactions.amount IS 'Payment amount';
COMMENT ON COLUMN payment_transactions.currency IS 'Currency code (XAF, USD, etc.)';
COMMENT ON COLUMN payment_transactions.payment_method IS 'Payment method (mtn, orange, bank, etc.)';
COMMENT ON COLUMN payment_transactions.payment_reference IS 'Unique payment reference from provider';
COMMENT ON COLUMN payment_transactions.phone_number IS 'Phone number used for mobile money payment';
COMMENT ON COLUMN payment_transactions.transaction_id IS 'External transaction ID from payment provider';
COMMENT ON COLUMN payment_transactions.status IS 'Transaction status (pending, completed, failed, cancelled)';
COMMENT ON COLUMN payment_transactions.payment_provider IS 'Payment gateway provider name';
COMMENT ON COLUMN payment_transactions.provider_response IS 'Full response from payment provider';
COMMENT ON COLUMN payment_transactions.failure_reason IS 'Reason for payment failure';
COMMENT ON COLUMN payment_transactions.completed_at IS 'Timestamp when payment was completed';
COMMENT ON COLUMN payment_transactions.plan_type IS 'Subscription plan type (standard, premium)';
COMMENT ON COLUMN payment_transactions.billing_period IS 'Billing period (monthly, yearly)';
COMMENT ON COLUMN payment_transactions.metadata IS 'Additional transaction metadata';
COMMENT ON COLUMN payment_transactions.created_at IS 'Transaction creation timestamp';
COMMENT ON COLUMN payment_transactions.updated_at IS 'Last update timestamp';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_method ON payment_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);

-- Create enum for payment status if not exists
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update status column to use enum (optional, for data integrity)
-- ALTER TABLE payment_transactions ALTER COLUMN status TYPE payment_status USING status::payment_status;

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update timestamp
DROP TRIGGER IF EXISTS payment_transaction_update_timestamp ON payment_transactions;
CREATE TRIGGER payment_transaction_update_timestamp
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_transaction_timestamp();

-- Verify the changes
SELECT
    'Payment transactions table enhanced!' AS status,
    'Added phone_number, transaction_id, provider_response, failure_reason, completed_at, plan_type, billing_period' AS new_columns,
    'Added indexes for better performance' AS optimization,
    'Added auto-update trigger for updated_at' AS automation;

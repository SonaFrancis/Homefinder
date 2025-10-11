-- =====================================================
-- VERIFY PAYMENT TRANSACTIONS TABLE
-- =====================================================
-- This script checks the payment_transactions table structure

-- Check all columns in payment_transactions table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'payment_transactions'
ORDER BY ordinal_position;

-- Check constraints
SELECT
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'payment_transactions';

# Payment Transactions Table Schema

## Current Schema (Existing Columns)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, unique transaction identifier |
| `user_id` | UUID | Foreign key to profiles table |
| `subscription_id` | UUID | Foreign key to user_subscriptions (nullable) |
| `amount` | DECIMAL(10,2) | Payment amount |
| `currency` | TEXT | Currency code (default: 'XAF') |
| `payment_method` | TEXT | Payment method identifier |
| `payment_reference` | TEXT | Unique payment reference (UNIQUE constraint) |
| `status` | TEXT | Transaction status (default: 'pending') |
| `payment_provider` | TEXT | Payment gateway provider name |
| `metadata` | JSONB | Additional transaction data |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

## Enhanced Schema (New Columns to Add)

Run `enhance_payment_transactions_table.sql` to add these columns:

| Column | Type | Description |
|--------|------|-------------|
| `phone_number` | TEXT | Mobile money phone number (e.g., +237650123456) |
| `transaction_id` | TEXT | External transaction ID from payment provider |
| `provider_response` | JSONB | Full API response from payment provider |
| `failure_reason` | TEXT | Reason if payment failed |
| `completed_at` | TIMESTAMP | When payment was successfully completed |
| `plan_type` | TEXT | Subscription plan (standard, premium) |
| `billing_period` | TEXT | Billing cycle (monthly, yearly) |

## Payment Status Values

- `pending` - Payment initiated, awaiting confirmation
- `processing` - Payment being processed by provider
- `completed` - Payment successful
- `failed` - Payment failed
- `cancelled` - Payment cancelled by user
- `refunded` - Payment refunded

## Payment Method Values

- `mtn` - MTN Mobile Money
- `orange` - Orange Money
- `bank` - Bank transfer
- `card` - Credit/Debit card (future)

## Indexes (for performance)

- `idx_payment_transactions_user_id` - Query by user
- `idx_payment_transactions_status` - Filter by status
- `idx_payment_transactions_payment_method` - Filter by payment method
- `idx_payment_transactions_created_at` - Sort by date
- `idx_payment_transactions_reference` - Lookup by reference
- `idx_payment_transactions_transaction_id` - Lookup by external ID

## Example Record

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "user-uuid-here",
  "subscription_id": "subscription-uuid-here",
  "amount": 5000.00,
  "currency": "XAF",
  "payment_method": "mtn",
  "payment_reference": "TXN-20250106-001",
  "phone_number": "+237650123456",
  "transaction_id": "MTN-TXN-ABC123",
  "status": "completed",
  "payment_provider": "MTN Mobile Money API",
  "plan_type": "standard",
  "billing_period": "monthly",
  "provider_response": {
    "status": "success",
    "provider_reference": "MTN123456",
    "timestamp": "2025-01-06T10:30:00Z"
  },
  "failure_reason": null,
  "completed_at": "2025-01-06T10:30:15Z",
  "metadata": {
    "ip_address": "192.168.1.1",
    "user_agent": "Mobile App v1.0"
  },
  "created_at": "2025-01-06T10:30:00Z",
  "updated_at": "2025-01-06T10:30:15Z"
}
```

## Usage in Payment Flow

### 1. Create Transaction (Pending)
```typescript
const { data: transaction } = await supabase
  .from('payment_transactions')
  .insert({
    user_id: userId,
    amount: 5000,
    currency: 'XAF',
    payment_method: 'mtn',
    phone_number: '+237650123456',
    plan_type: 'standard',
    billing_period: 'monthly',
    status: 'pending',
  })
  .select()
  .single();
```

### 2. Update on Success
```typescript
await supabase
  .from('payment_transactions')
  .update({
    status: 'completed',
    transaction_id: response.transaction_id,
    provider_response: response,
    completed_at: new Date().toISOString(),
  })
  .eq('id', transactionId);
```

### 3. Update on Failure
```typescript
await supabase
  .from('payment_transactions')
  .update({
    status: 'failed',
    failure_reason: 'Insufficient funds',
    provider_response: errorResponse,
  })
  .eq('id', transactionId);
```

### 4. Get User's Payment History
```typescript
const { data: transactions } = await supabase
  .from('payment_transactions')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### 5. Get Successful Payments
```typescript
const { data: completedPayments } = await supabase
  .from('payment_transactions')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'completed')
  .order('completed_at', { ascending: false });
```

## Benefits of Enhanced Schema

✅ **Complete Audit Trail** - Track every payment attempt and outcome
✅ **Provider Integration** - Store full provider responses for debugging
✅ **User History** - Users can view their complete payment history
✅ **Failure Analysis** - Understand why payments fail
✅ **Reconciliation** - Match internal records with provider records
✅ **Reporting** - Generate revenue and transaction reports
✅ **Support** - Customer support can investigate payment issues
✅ **Compliance** - Maintain records for financial compliance

## Next Steps

1. Run `enhance_payment_transactions_table.sql` in Supabase SQL Editor
2. Update PaymentModal to create transaction records
3. Integrate with actual payment provider API
4. Create payment history page for users
5. Add admin dashboard for transaction monitoring

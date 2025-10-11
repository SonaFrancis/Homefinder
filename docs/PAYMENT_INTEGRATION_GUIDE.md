# Payment Integration Setup Guide

This guide explains how to complete the payment integration for MTN Mobile Money and Orange Money in your rental app.

## ✅ What's Already Implemented

### 1. Database Schema
- ✅ Enhanced `payment_transactions` table with all necessary columns
- ✅ Subscription management functions (`activate_user_subscription`, `upgrade_user_subscription`)
- ✅ User subscription tracking in `user_subscriptions` table

### 2. Payment Flow
- ✅ PaymentModal with phone number auto-detection (MTN/Orange)
- ✅ Transaction record creation and status tracking
- ✅ Subscription activation after successful payment
- ✅ Complete error handling and user feedback

### 3. Dashboard Access
- ✅ Subscription-based dashboard access control
- ✅ Premium plan features (Analytics tab)
- ✅ Upgrade button in edit profile page

### 4. Payment Service
- ✅ Payment processing service with MTN/Orange placeholders
- ✅ Subscription activation/upgrade functions
- ✅ Get user subscription details

## 🚀 Steps to Complete Integration

### Step 1: Run Database Migrations

Run these SQL scripts in your Supabase SQL Editor:

1. **Enhance Payment Transactions Table**
   ```bash
   migrations/enhance_payment_transactions_table.sql
   ```

2. **Create Subscription Management Functions**
   ```bash
   migrations/create_subscription_management_functions.sql
   ```

### Step 2: Integrate Payment Provider APIs

#### For MTN Mobile Money:

1. **Sign up for MTN MoMo API**
   - Visit: https://momodeveloper.mtn.com/
   - Register and get API credentials

2. **Update `services/paymentService.ts`**
   - Replace the `processMTNPayment` function with actual API integration
   - Add your MTN API key and configuration
   - Test with MTN sandbox environment first

Example integration:
```typescript
async function processMTNPayment(request: PaymentRequest): Promise<PaymentResponse> {
  const MTN_API_KEY = process.env.MTN_API_KEY;
  const MTN_API_ENDPOINT = 'https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay';

  const response = await fetch(MTN_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MTN_API_KEY}`,
      'X-Target-Environment': 'production',
      'X-Reference-Id': request.transactionId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: request.amount.toString(),
      currency: 'XAF',
      externalId: request.transactionId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: request.phoneNumber.replace('+237', ''),
      },
      payerMessage: `Payment for ${request.planType} subscription`,
      payeeNote: 'Subscription payment',
    }),
  });

  // Handle response and return PaymentResponse
}
```

#### For Orange Money:

1. **Sign up for Orange Money API**
   - Visit: https://developer.orange.com/
   - Register and get API credentials

2. **Update `services/paymentService.ts`**
   - Replace the `processOrangePayment` function with actual API integration
   - Add your Orange API key and merchant key
   - Test with Orange sandbox environment first

Example integration:
```typescript
async function processOrangePayment(request: PaymentRequest): Promise<PaymentResponse> {
  const ORANGE_API_KEY = process.env.ORANGE_API_KEY;
  const ORANGE_MERCHANT_KEY = process.env.ORANGE_MERCHANT_KEY;
  const ORANGE_API_ENDPOINT = 'https://api.orange.com/orange-money-webpay/cm/v1/webpayment';

  const response = await fetch(ORANGE_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ORANGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merchant_key: ORANGE_MERCHANT_KEY,
      currency: 'XAF',
      order_id: request.transactionId,
      amount: request.amount,
      return_url: 'your-app://payment-success',
      cancel_url: 'your-app://payment-cancel',
      notif_url: 'https://your-backend.com/webhook/orange',
      lang: 'en',
      reference: `Subscription - ${request.planType}`,
    }),
  });

  // Handle response and return PaymentResponse
}
```

### Step 3: Add Environment Variables

Create a `.env` file (or update existing) with:

```env
# MTN Mobile Money
MTN_API_KEY=your_mtn_api_key
MTN_SUBSCRIPTION_KEY=your_mtn_subscription_key
MTN_TARGET_ENVIRONMENT=production

# Orange Money
ORANGE_API_KEY=your_orange_api_key
ORANGE_MERCHANT_KEY=your_orange_merchant_key
```

### Step 4: Test Payment Flow

1. **Test with Sandbox/Test Numbers**
   - Use provider test numbers for initial testing
   - Verify transaction records are created correctly
   - Check subscription activation works

2. **Test Complete Flow**
   ```
   User selects plan → Payment modal opens
   → User enters phone number → Network detected
   → User clicks Pay → Payment processes
   → Transaction recorded → Subscription activated
   → User redirected to dashboard → Access granted
   ```

3. **Test Error Cases**
   - Invalid phone number
   - Insufficient funds
   - Network timeout
   - Failed payments

### Step 5: Implement Webhook Handler (Optional but Recommended)

Create a webhook endpoint to receive payment confirmations:

```typescript
// Example webhook handler (backend)
app.post('/webhook/payment', async (req, res) => {
  const { transactionId, status, providerReference } = req.body;

  // Update transaction status in database
  await supabase
    .from('payment_transactions')
    .update({
      status: status === 'success' ? 'completed' : 'failed',
      transaction_id: providerReference,
      completed_at: new Date().toISOString(),
    })
    .eq('payment_reference', transactionId);

  res.status(200).send('OK');
});
```

### Step 6: Production Deployment

1. **Switch to Production APIs**
   - Update API endpoints from sandbox to production
   - Update API keys to production keys

2. **Security Checklist**
   - ✅ API keys stored in environment variables
   - ✅ Never commit sensitive keys to git
   - ✅ Use HTTPS for all API calls
   - ✅ Validate webhook signatures

3. **Monitoring**
   - Monitor transaction success/failure rates
   - Set up alerts for payment failures
   - Track subscription activations

## 📱 User Flow

### New Subscription
1. User navigates to `/subscription`
2. Selects Standard or Premium plan
3. Clicks "Choose {Plan}" button
4. Payment modal opens
5. Enters phone number (MTN/Orange auto-detected)
6. Clicks "Pay Now"
7. Payment processed with provider
8. Subscription activated
9. Dashboard access granted

### Upgrade Subscription
1. User goes to Edit Profile
2. Clicks "Upgrade to Premium" (if on Standard)
3. Redirected to subscription page
4. Selects Premium plan
5. Payment modal opens
6. Completes payment
7. Subscription upgraded
8. Premium features unlocked

## 🔧 Troubleshooting

### Payment Not Processing
- Check API keys are correct
- Verify network connectivity
- Check provider API status
- Review transaction logs

### Subscription Not Activating
- Check if `activate_user_subscription` function executed
- Verify payment transaction status is 'completed'
- Check subscription_plans table has correct plan data
- Review Supabase logs for errors

### Dashboard Access Denied
- Verify user has active subscription
- Check subscription end_date is in future
- Refresh subscription data in authStore
- Check hasDashboardAccess() returns true

## 📊 Database Queries for Monitoring

### Check Recent Transactions
```sql
SELECT
  pt.payment_reference,
  pt.status,
  pt.amount,
  pt.payment_method,
  pt.created_at,
  p.full_name
FROM payment_transactions pt
JOIN profiles p ON pt.user_id = p.id
ORDER BY pt.created_at DESC
LIMIT 20;
```

### Check Active Subscriptions
```sql
SELECT
  us.id,
  p.full_name,
  sp.name AS plan,
  us.status,
  us.start_date,
  us.end_date
FROM user_subscriptions us
JOIN profiles p ON us.user_id = p.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
ORDER BY us.created_at DESC;
```

### Check Failed Payments
```sql
SELECT
  pt.payment_reference,
  pt.phone_number,
  pt.amount,
  pt.failure_reason,
  pt.created_at
FROM payment_transactions pt
WHERE pt.status = 'failed'
ORDER BY pt.created_at DESC;
```

## 🎯 Next Features to Implement

1. **Payment History Page**
   - Show user's past transactions
   - Display receipts
   - Allow downloading transaction records

2. **Subscription Management**
   - Cancel subscription
   - Pause subscription
   - Auto-renewal settings

3. **Admin Dashboard**
   - View all transactions
   - Monitor revenue
   - Manage subscriptions
   - Handle refunds

4. **Email Notifications**
   - Payment confirmation emails
   - Subscription expiry reminders
   - Renewal notifications

## 📞 Support

For payment API support:
- **MTN MoMo**: https://momodeveloper.mtn.com/support
- **Orange Money**: https://developer.orange.com/contact

For app-specific issues:
- Check Supabase logs
- Review payment transaction records
- Check subscription status in database

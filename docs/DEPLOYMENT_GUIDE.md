# Real Payment Integration Deployment Guide

This guide will help you deploy the real MTN Mobile Money and Orange Money payment integration.

## 🎯 Overview

The payment system now uses **Supabase Edge Functions** to securely process payments on the server side. This ensures:
- ✅ API keys are never exposed in the mobile app
- ✅ Secure server-side payment processing
- ✅ Proper authentication and authorization
- ✅ PCI compliance and security best practices

## 📋 Prerequisites

Before starting, you need:

1. **Supabase CLI** installed
   ```bash
   npm install -g supabase
   ```

2. **MTN Mobile Money Developer Account**
   - Sign up at: https://momodeveloper.mtn.com/
   - Subscribe to Collections API
   - Get your credentials (User ID, API Key, Subscription Key)

3. **Orange Money Developer Account**
   - Sign up at: https://developer.orange.com/
   - Register your application
   - Get your credentials (Client ID, Client Secret, Merchant Key)

## 🚀 Step-by-Step Deployment

### Step 1: Initialize Supabase CLI

```bash
cd C:\Users\LENOVO\Downloads\Buea_rental\New_version_student_retal

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref
```

### Step 2: Deploy the Edge Function

```bash
# Deploy the payment processing function
supabase functions deploy process-payment

# Verify deployment
supabase functions list
```

### Step 3: Set Environment Secrets

**IMPORTANT:** Never commit API keys to Git. Use Supabase secrets instead.

#### For MTN Mobile Money (Sandbox):

```bash
# Set MTN API credentials
supabase secrets set MTN_API_BASE=https://sandbox.momodeveloper.mtn.com
supabase secrets set MTN_SUBSCRIPTION_KEY=your_mtn_subscription_key_here
supabase secrets set MTN_USER_ID=your_mtn_user_id_here
supabase secrets set MTN_API_KEY=your_mtn_api_key_here
supabase secrets set MTN_TARGET_ENVIRONMENT=sandbox
```

#### For Orange Money (Sandbox):

```bash
# Set Orange API credentials
supabase secrets set ORANGE_API_BASE=https://api.orange.com
supabase secrets set ORANGE_CLIENT_ID=your_orange_client_id_here
supabase secrets set ORANGE_CLIENT_SECRET=your_orange_client_secret_here
supabase secrets set ORANGE_MERCHANT_KEY=your_orange_merchant_key_here
```

#### Verify Secrets:

```bash
# List all secrets (values are hidden)
supabase secrets list
```

### Step 4: Test the Edge Function

#### Test with curl:

```bash
# Get your access token from Supabase
# (Login to your app and get the token from localStorage or console)

curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/process-payment' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "transactionId": "TEST-123",
    "phoneNumber": "+237650123456",
    "amount": 5000,
    "paymentMethod": "mtn",
    "planType": "standard"
  }'
```

#### Test from your app:

1. Run the app in development mode
2. Navigate to subscription page
3. Select a plan
4. Enter a test phone number (MTN sandbox: 46733123450)
5. Click "Pay Now"
6. Check the console for logs

### Step 5: Run Database Migrations

```bash
# Run the migrations in Supabase Dashboard > SQL Editor

# 1. Enhanced payment transactions table
# Copy and paste: migrations/enhance_payment_transactions_table.sql

# 2. Subscription management functions
# Copy and paste: migrations/create_subscription_management_functions.sql
```

### Step 6: Update Production Settings

Once testing is complete, update to production:

#### MTN Production:

```bash
supabase secrets set MTN_API_BASE=https://proxy.momoapi.mtn.com
supabase secrets set MTN_TARGET_ENVIRONMENT=production
# Update with production keys
supabase secrets set MTN_SUBSCRIPTION_KEY=your_production_key
supabase secrets set MTN_USER_ID=your_production_user_id
supabase secrets set MTN_API_KEY=your_production_api_key
```

#### Orange Production:

```bash
# Update with production credentials
supabase secrets set ORANGE_CLIENT_ID=your_production_client_id
supabase secrets set ORANGE_CLIENT_SECRET=your_production_client_secret
supabase secrets set ORANGE_MERCHANT_KEY=your_production_merchant_key
```

## 🧪 Testing Guide

### MTN Mobile Money Test Numbers (Sandbox)

Use these test numbers in sandbox mode:

| Number | Scenario |
|--------|----------|
| 46733123450 | Successful payment |
| 46733123451 | Failed payment - Payer not found |
| 46733123452 | Failed payment - Not enough funds |
| 46733123453 | Payment timeout |

### Orange Money Testing

Orange Money requires testing in production with real numbers. Use small amounts (100-500 XAF) for testing.

### Test Checklist

- [ ] Test successful MTN payment
- [ ] Test successful Orange payment
- [ ] Test payment failure (insufficient funds)
- [ ] Test invalid phone number
- [ ] Test network timeout
- [ ] Verify transaction record created
- [ ] Verify subscription activated
- [ ] Verify dashboard access granted
- [ ] Test subscription upgrade (Standard to Premium)
- [ ] Test payment history display

## 📊 Monitoring and Logging

### View Edge Function Logs:

```bash
# View real-time logs
supabase functions logs process-payment --tail

# View recent logs
supabase functions logs process-payment --limit 100
```

### Monitor Payment Transactions:

```sql
-- View recent transactions
SELECT
  payment_reference,
  amount,
  payment_method,
  status,
  phone_number,
  created_at,
  completed_at
FROM payment_transactions
ORDER BY created_at DESC
LIMIT 50;

-- Check success rate
SELECT
  payment_method,
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM payment_transactions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY payment_method, status;
```

## 🔒 Security Best Practices

### ✅ Do's:
- ✅ Store API keys in Supabase secrets
- ✅ Use HTTPS for all API calls
- ✅ Validate user authentication before processing payments
- ✅ Log all payment attempts
- ✅ Implement rate limiting
- ✅ Monitor for suspicious activity

### ❌ Don'ts:
- ❌ Never commit API keys to Git
- ❌ Don't store API keys in .env files (production)
- ❌ Don't process payments directly from mobile app
- ❌ Don't skip authentication checks
- ❌ Don't ignore failed payment logs

## 🐛 Troubleshooting

### Edge Function Not Working

```bash
# Check function status
supabase functions list

# View logs
supabase functions logs process-payment

# Redeploy if needed
supabase functions deploy process-payment --no-verify-jwt
```

### Payment Fails with "Configuration Error"

- Check if secrets are set: `supabase secrets list`
- Verify API credentials are correct
- Check if you're using sandbox vs production endpoints

### "Unauthorized" Error

- Verify user is logged in
- Check if Authorization header is being sent
- Verify Supabase session is valid

### MTN Payment Status "PENDING"

- MTN payments can take 30-60 seconds
- Implement polling or webhook for status updates
- Consider adding a "Check Status" button

### Orange Payment Requires Redirect

- Orange Money uses webview redirect flow
- Implement in-app browser or deep linking
- Handle return_url and cancel_url

## 📱 Mobile App Configuration

### Enable Edge Functions in App:

The app is already configured to call the Edge Function. Just ensure:

1. Supabase client is initialized with correct URL and anon key
2. User is authenticated before payment
3. Network requests are allowed (check app permissions)

### Deep Linking for Orange Money:

Add to `app.json`:

```json
{
  "expo": {
    "scheme": "your-app-scheme",
    "ios": {
      "associatedDomains": ["applinks:your-domain.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "your-app-scheme"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## 📈 Production Checklist

Before going live:

- [ ] All database migrations run successfully
- [ ] Edge function deployed and tested
- [ ] Production API keys set in secrets
- [ ] Test transactions completed successfully
- [ ] Subscription activation working
- [ ] Dashboard access control working
- [ ] Error handling tested
- [ ] Logging and monitoring set up
- [ ] Backup and recovery plan in place
- [ ] Support process for failed payments documented

## 💰 Pricing and Fees

### MTN Mobile Money:
- Transaction fee: ~2% (varies by country)
- API usage: Free for developers
- Settlement: T+1 days

### Orange Money:
- Transaction fee: ~2-3% (varies by country)
- API usage: Free for developers
- Settlement: T+1 to T+3 days

## 📞 Support Contacts

### MTN MoMo Support:
- Developer Portal: https://momodeveloper.mtn.com/support
- Email: support@momodeveloper.mtn.com
- Documentation: https://momodeveloper.mtn.com/api-documentation

### Orange Money Support:
- Developer Portal: https://developer.orange.com/contact
- Documentation: https://developer.orange.com/apis/orange-money/

### Supabase Support:
- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase/issues

## 🎉 Success!

Once deployed, your payment system will:
- ✅ Process real MTN and Orange Money payments
- ✅ Automatically activate subscriptions
- ✅ Grant dashboard access to paying users
- ✅ Track all transactions in database
- ✅ Handle errors gracefully
- ✅ Provide audit trail for compliance

Happy deploying! 🚀

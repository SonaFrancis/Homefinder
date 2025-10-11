# 🧪 Testing Guide: Inactive Badge & Listing Deactivation

## Overview
This guide tests the complete listing deactivation system including:
1. Automatic deactivation when subscription expires (8+ days)
2. "INACTIVE" badge display in dashboard
3. Edit button blocking
4. Public visibility (listings hidden from main app)

---

## 🔧 Setup

### Step 1: Get Your User ID
```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```
Copy your `id` - use it as `YOUR-USER-ID` below.

---

## 📋 Test Scenarios

### **Test 1: Simulate Expired Subscription (Scenario 3)**

#### A. Set subscription to expired (10 days ago)
```sql
UPDATE user_subscriptions
SET
    status = 'active',
    start_date = NOW() - INTERVAL '30 days',
    end_date = NOW() - INTERVAL '10 days',
    posts_used_this_month = 8,
    current_month_start = NOW() - INTERVAL '15 days',
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID';
```

#### B. Run auto-deactivation function
```sql
SELECT auto_deactivate_expired_user_listings();
```

**Expected Output:**
```
NOTICE:  Deactivated listings for user YOUR-USER-ID (expired 10 days ago)
NOTICE:  Auto-deactivation complete. Affected 1 users.
```

#### C. Verify scenario
```sql
SELECT * FROM get_user_subscription_scenario('YOUR-USER-ID');
```

**Expected Results:**
| Field | Value |
|-------|-------|
| scenario | 3 |
| scenario_name | Grace Period Ended |
| can_edit_listings | FALSE |
| listings_should_be_live | FALSE |
| warning_message | "Subscription expired 10 days ago. Grace period ended..." |

---

### **Test 2: Verify Listings Are Deactivated**

#### Check rental properties
```sql
SELECT
    id,
    title,
    is_available,
    created_at
FROM rental_properties
WHERE landlord_id = 'YOUR-USER-ID'
ORDER BY created_at DESC;
```

**Expected:** All listings show `is_available = false`

#### Check marketplace items (if any)
```sql
SELECT
    id,
    title,
    is_available,
    category_id
FROM electronics
WHERE seller_id = 'YOUR-USER-ID';

-- Repeat for other categories: fashion, cosmetics, cars, etc.
```

**Expected:** All items show `is_available = false`

---

### **Test 3: Verify Public Visibility (Listings Hidden)**

#### Query as public user
```sql
-- This is what the main app does - filter by is_available = TRUE
SELECT
    id,
    title,
    landlord_id,
    is_available
FROM rental_properties
WHERE is_available = TRUE
AND city = 'Buea'
LIMIT 20;
```

**Expected:** Your listings do NOT appear in results ✅

#### Query your own listings (owner view)
```sql
-- This is what the dashboard does - NO is_available filter
SELECT
    id,
    title,
    is_available,
    created_at
FROM rental_properties
WHERE landlord_id = 'YOUR-USER-ID'
ORDER BY created_at DESC;
```

**Expected:** You can still see your listings (but they're marked inactive) ✅

---

### **Test 4: App UI Testing**

#### A. Open Dashboard in App
1. Go to PropertyTab or SalesTab
2. Look at your listings

**Expected UI:**
- ✅ Red "INACTIVE" badge appears on listing images
- ✅ Badge shows eye-off icon + "INACTIVE" text
- ✅ Edit button is grayed out and disabled
- ✅ Icon color changed from green (#10B981) to gray (#9CA3AF)

#### B. Try to Edit a Listing
1. Click "Edit" button

**Expected:**
- ✅ Alert pops up: "Editing Disabled"
- ✅ Message: "Your subscription has expired and the grace period has ended. Renew your subscription to edit your listings."
- ✅ Two buttons: "Renew Now" and "Cancel"

#### C. Check Main App (Public View)
1. Log out or use another account
2. Browse properties in your city

**Expected:**
- ✅ Your deactivated listings do NOT appear
- ✅ Only active users' listings are visible

---

### **Test 5: Check Notification**

```sql
SELECT
    id,
    title,
    message,
    is_read,
    created_at
FROM notifications
WHERE user_id = 'YOUR-USER-ID'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** You should see notification:
- **Title:** "❌ Listings Deactivated"
- **Message:** "Your subscription expired X days ago and grace period has ended..."

---

### **Test 6: Verify Subscription Status Update**

```sql
SELECT
    user_id,
    status,
    end_date,
    updated_at
FROM user_subscriptions
WHERE user_id = 'YOUR-USER-ID';
```

**Expected:**
| Field | Value |
|-------|-------|
| status | deactivated |
| end_date | 10 days ago |

---

## 🔄 Test 7: Auto-Reactivation on Renewal

### A. Simulate Subscription Renewal

```sql
-- Renew subscription for 30 more days
-- The trigger will AUTOMATICALLY reactivate all listings!
UPDATE user_subscriptions
SET
    status = 'active',
    start_date = NOW(),
    end_date = NOW() + INTERVAL '30 days',
    posts_used_this_month = 0,
    current_month_start = NOW(),
    updated_at = NOW()
WHERE user_id = 'YOUR-USER-ID';
```

**Expected Output:**
```
NOTICE:  Reactivated all listings for user YOUR-USER-ID (subscription renewed)
```

### B. Verify Listings Reactivated

```sql
-- Check rental properties
SELECT
    id,
    title,
    is_available,
    updated_at
FROM rental_properties
WHERE landlord_id = 'YOUR-USER-ID'
ORDER BY updated_at DESC;
```

**Expected:** All listings show `is_available = TRUE` ✅

### C. Check Reactivation Notification

```sql
SELECT
    title,
    message,
    created_at
FROM notifications
WHERE user_id = 'YOUR-USER-ID'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Notification:**
- **Title:** "✅ Listings Reactivated"
- **Message:** "Welcome back! Your subscription has been renewed and all your listings are now live and visible to everyone."

### D. Verify in App

**Expected in Dashboard:**
- ✅ "INACTIVE" badge disappears
- ✅ Edit button becomes green and enabled
- ✅ Listings show normally (no red badge)

**Expected in Public View:**
- ✅ Listings appear in search results
- ✅ Listings visible on map
- ✅ Listings visible to all users

**Expected Permissions:**
- ✅ Can create new posts
- ✅ Can edit existing listings
- ✅ Can upload media

---

## 📊 Visual Checklist

### Dashboard View (Owner)
- [ ] See all my listings (including inactive ones)
- [ ] Red "INACTIVE" badge on deactivated listings
- [ ] Eye-off icon visible on badge
- [ ] Edit button grayed out
- [ ] Click Edit shows alert

### Main App (Public)
- [ ] Deactivated listings NOT visible
- [ ] Only active listings appear in search
- [ ] Only active listings on map

### Subscription Scenario
- [ ] Scenario = 3 (Grace Period Ended)
- [ ] can_edit_listings = FALSE
- [ ] listings_should_be_live = FALSE
- [ ] Notification received

---

## 🚀 Production Setup

To run auto-deactivation daily:

### Supabase Edge Function
```typescript
// supabase/functions/daily-maintenance/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { error } = await supabase.rpc('run_daily_subscription_maintenance')

  return new Response(
    JSON.stringify({ success: !error, error }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

**Schedule:** `0 2 * * *` (Daily at 2 AM UTC)

---

## ✅ Success Criteria

All tests pass when:
1. ✅ Listings deactivated after grace period (8+ days)
2. ✅ "INACTIVE" badge visible in dashboard
3. ✅ Edit button disabled and grayed out
4. ✅ Edit click shows "Editing Disabled" alert
5. ✅ Listings hidden from public view
6. ✅ Owner can still see their inactive listings
7. ✅ Notification sent to user
8. ✅ Subscription status = "deactivated"

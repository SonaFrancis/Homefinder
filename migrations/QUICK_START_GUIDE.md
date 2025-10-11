# 🚀 Quick Start Guide - 3-Scenario Subscription System

## 📦 **What You've Got**

1. **`SUBSCRIPTION_SYSTEM_COMPLETE.md`** - Full documentation
2. **`implement_3_scenario_system.sql`** - Complete implementation
3. **`test_all_scenarios.sql`** - Testing scripts
4. **`complete_quota_enforcement_all_tables.sql`** - Quota enforcement
5. **`quick_test_quota.sql` / `quick_reset_quota.sql`** - Quick testing tools

---

## ⚡ **Installation (5 Minutes)**

### **Step 1: Run Main Implementation** (2 min)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy **ALL** of: `implement_3_scenario_system.sql`
3. Click **RUN** ▶️
4. Wait for: `✅ 3-SCENARIO SYSTEM INSTALLED!`

### **Step 2: Run Quota Enforcement** (2 min)

1. Still in SQL Editor
2. Copy **ALL** of: `complete_quota_enforcement_all_tables.sql`
3. Click **RUN** ▶️
4. Wait for: `🎉 COMPLETE QUOTA ENFORCEMENT INSTALLED!`

### **Step 3: Setup Cron Jobs** (1 min)

Go to **Supabase Dashboard** → **Database** → **Cron Jobs**

**Create 2 jobs:**

#### Job 1: Daily Deactivation Check
```sql
-- Name: deactivate_expired_listings
-- Schedule: 0 0 * * * (Every day at midnight)
SELECT * FROM deactivate_listings_after_grace_period();
```

#### Job 2: Daily Grace Warnings
```sql
-- Name: send_grace_warnings
-- Schedule: 0 9 * * * (Every day at 9 AM)
SELECT * FROM send_grace_period_warnings();
```

---

## 🧪 **Testing (3 Minutes)**

### **Quick Test:**

1. Open `test_all_scenarios.sql`
2. Find your user ID (run first query)
3. Replace all `'YOUR-USER-ID-HERE'` with your actual user ID
4. Run each test section one by one
5. Verify expected results

### **Expected Results:**

```
Scenario 1A: ✅ Can create, listings live
Scenario 1B: ❌ Can't create (quota), listings still live
Scenario 2A: ✅ Can use remaining quota, listings live
Scenario 2B: ❌ Can't create, listings still live
Scenario 3:  ❌ Everything blocked, listings deactivated
```

---

## 📱 **Mobile App Integration**

### **Check User Status:**

```typescript
// In your React Native app
import { supabase } from '@/lib/supabase';

async function getUserStatus(userId: string) {
  const { data, error } = await supabase
    .rpc('get_user_subscription_scenario', { user_uuid: userId });

  if (data && data.length > 0) {
    const status = data[0];

    console.log('Scenario:', status.scenario);
    console.log('Can create listings:', status.can_create_listings);
    console.log('Can upload media:', status.can_upload_media);
    console.log('Listings should be live:', status.listings_should_be_live);
    console.log('Warning:', status.warning_message);

    return status;
  }
}
```

### **Display Warning Banners:**

```typescript
function SubscriptionWarning({ status }) {
  // Scenario 1B: Quota exhausted
  if (status.scenario === 1 && !status.can_create_listings) {
    return (
      <View style={styles.warningBanner}>
        <Text>⚠️ {status.warning_message}</Text>
        <Button title="Upgrade to Premium" />
      </View>
    );
  }

  // Scenario 2: Grace period
  if (status.scenario === 2) {
    return (
      <View style={styles.urgentBanner}>
        <Text>⚠️ Subscription Expired!</Text>
        <Text>Grace: {status.grace_days_remaining} days left</Text>
        <Button title="Renew Now" />
      </View>
    );
  }

  // Scenario 3: Grace ended
  if (status.scenario === 3) {
    return (
      <View style={styles.errorBanner}>
        <Text>❌ Subscription Expired - Listings Deactivated</Text>
        <Button title="Renew to Restore" />
      </View>
    );
  }

  return null;
}
```

### **Block Actions Based on Status:**

```typescript
async function handleCreateListing() {
  const status = await getUserStatus(currentUserId);

  if (!status.can_create_listings) {
    if (status.scenario === 1) {
      // Quota exhausted
      Alert.alert(
        'Quota Exhausted',
        status.warning_message,
        [
          { text: 'Upgrade to Premium', onPress: () => navigate('Subscription') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else if (status.scenario === 3) {
      // Expired, grace ended
      Alert.alert(
        'Subscription Expired',
        'Renew your subscription to create listings',
        [
          { text: 'Renew Now', onPress: () => navigate('RenewSubscription') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
    return;
  }

  // Proceed with creating listing
  navigate('CreateListing');
}
```

---

## 🎯 **Common Scenarios**

### **User Wants to Know Their Status:**

```typescript
const status = await getUserStatus(userId);

const message = (() => {
  switch(status.scenario) {
    case 1:
      if (!status.can_create_listings) {
        return `Quota full (${status.listings_used}/${status.max_listings}). Resets next month.`;
      }
      return `Active! ${status.max_listings - status.listings_used} listings remaining.`;

    case 2:
      return `Grace period: ${status.grace_days_remaining} days left. Renew to secure access!`;

    case 3:
      return `Expired ${status.days_expired} days ago. Renew to restore ${status.listings_used} listings.`;

    default:
      return 'Please subscribe to create listings.';
  }
})();

console.log(message);
```

---

## 🔧 **Troubleshooting**

### **Issue: Listings not deactivating after 8 days**

**Solution:**
```sql
-- Manually run deactivation
SELECT * FROM deactivate_listings_after_grace_period();

-- Check if cron job is running
SELECT * FROM cron.job WHERE jobname = 'deactivate_expired_listings';
```

### **Issue: Listings not reactivating after renewal**

**Solution:**
```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_reactivate_on_renewal';

-- Manually reactivate
UPDATE rental_properties
SET is_available = TRUE
WHERE landlord_id = 'user-id'
AND listing_status = 'approved';
```

### **Issue: Quota still allows upload when exhausted**

**Solution:**
```sql
-- Check if quota triggers exist
SELECT COUNT(*) FROM information_schema.triggers
WHERE trigger_name LIKE '%quota%';

-- Should return 32 triggers (16 for listings + 16 for media)

-- If missing, run: complete_quota_enforcement_all_tables.sql
```

---

## 📊 **Monitoring Dashboard**

### **Check System Health:**

```sql
-- See all user scenarios
SELECT
    p.full_name,
    s.scenario,
    s.scenario_name,
    s.days_expired,
    s.grace_days_remaining,
    s.listings_used || '/' || s.max_listings as listings,
    CASE WHEN s.listings_should_be_live THEN 'LIVE' ELSE 'INACTIVE' END as status
FROM profiles p
CROSS JOIN LATERAL get_user_subscription_scenario(p.id) s
WHERE p.role IN ('landlord', 'seller')
ORDER BY s.scenario DESC, s.days_expired DESC;
```

### **Count Users by Scenario:**

```sql
SELECT
    s.scenario,
    s.scenario_name,
    COUNT(*) as user_count
FROM profiles p
CROSS JOIN LATERAL get_user_subscription_scenario(p.id) s
WHERE p.role IN ('landlord', 'seller')
GROUP BY s.scenario, s.scenario_name
ORDER BY s.scenario;
```

---

## ✅ **Checklist**

- [ ] Ran `implement_3_scenario_system.sql`
- [ ] Ran `complete_quota_enforcement_all_tables.sql`
- [ ] Setup 2 cron jobs
- [ ] Tested with `test_all_scenarios.sql`
- [ ] Updated mobile app to use `get_user_subscription_scenario()`
- [ ] Added warning banners in UI
- [ ] Tested renewal flow (deactivate → renew → reactivate)
- [ ] Verified quota blocking works
- [ ] Checked notifications are sent

---

## 🎉 **You're Done!**

Your system now:
✅ Enforces 3 subscription scenarios
✅ Keeps listings live during grace period
✅ Auto-deactivates after 8 days
✅ One-click reactivation on renewal
✅ Quota enforcement for listings & media
✅ Clear user warnings

**Next:** Monitor for 7 days and adjust grace period warnings as needed!

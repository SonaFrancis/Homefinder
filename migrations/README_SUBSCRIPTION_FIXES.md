# 🔧 Subscription System Fixes & Enhancements

## 📋 Overview

This folder contains SQL migrations to fix critical issues with the subscription quota tracking system and add comprehensive media upload tracking.

---

## 🐛 Problems Identified

### 1. **Incorrect Subscription Plan Quotas** ❌
- **Standard Plan**: Database showed 50 images/month → Should be **15 images/month**
- **Premium Plan**: Database showed 200 images/month, 20 videos/month → Should be **30 images/month, 10 videos/month**

### 2. **Media Upload Tracking Not Working** ❌
- `images_used_this_month` and `videos_used_this_month` columns were **not being updated**
- Triggers only existed for `rental_property_media` table
- **Missing triggers** for 7 marketplace category media tables:
  - electronics_media
  - fashion_media
  - cosmetics_media
  - house_items_media
  - cars_media
  - properties_for_sale_media
  - businesses_media

### 3. **No Listing Deactivation on Expiry** ❌
- When subscriptions expired, listings remained visible
- No automated cleanup process

### 4. **No Detailed Media Tracking** ❌
- Couldn't see which files users uploaded
- No storage usage monitoring
- No per-category breakdown

---

## 🎯 Solutions Provided

### Migration 1: `comprehensive_media_tracking_system.sql`

#### What it does:
1. ✅ **Creates `user_media_uploads` table** - Tracks every single file uploaded
2. ✅ **Creates `user_storage_usage` table** - Real-time storage monitoring per user
3. ✅ **Fixes subscription plan quotas** to match SUBSCRIPTION_PLANS.md
4. ✅ **Adds media tracking triggers** for ALL 8 media tables
5. ✅ **Provides analytics functions** for usage insights
6. ✅ **Includes cleanup functions** for media management

#### Key Features:

**Track Everything:**
```sql
-- Every upload is logged with:
- File URL
- File size (bytes)
- Media type (image/video)
- Category (rental_property, electronics, etc.)
- Upload date
- Associated listing ID
- User and subscription info
```

**Real-time Storage Monitoring:**
```sql
-- user_storage_usage tracks:
- Total storage used (bytes)
- Images storage (bytes)
- Videos storage (bytes)
- Current month image count
- Current month video count
- Total file counts
```

**Analytics Functions:**
```sql
-- Get user's media usage summary
SELECT * FROM get_user_media_usage('user_id');

-- Returns:
- total_storage_mb: 45.67 MB
- images_storage_mb: 32.50 MB
- videos_storage_mb: 13.17 MB
- this_month_images: 12
- this_month_videos: 3
- image_quota: 15
- video_quota: 5
- images_remaining: 3
- videos_remaining: 2
```

```sql
-- Get breakdown by category
SELECT * FROM get_user_media_by_category('user_id');

-- Returns:
category           | image_count | video_count | total_size_mb
-------------------+-------------+-------------+--------------
electronics        | 8           | 2           | 15.23
rental_property    | 10          | 3           | 25.67
fashion            | 4           | 1           | 4.77
```

---

### Migration 2: `subscription_lifecycle_automation.sql`

#### What it does:
1. ✅ **Auto-deactivates listings** when subscription expires
2. ✅ **Auto-reactivates listings** when subscription is renewed
3. ✅ **Implements 7-day grace period** before deactivation
4. ✅ **Enhanced expiry notifications** (3 days, 1 day, expired)
5. ✅ **Testing functions** for manual verification

#### Key Features:

**Grace Period System:**
```
Day 0 (End Date):      Subscription expires
Days 1-7:              Grace period - listings still visible
                       User gets daily warnings
Day 7:                 Listings deactivated
                       Status changed to 'expired'
```

**Automated Notifications:**
- **3 days before expiry**: "⏰ Subscription Expiring Soon"
- **1 day before expiry**: "🚨 Subscription Expires Tomorrow!"
- **On expiry (grace period)**: "⚠️ Grace Period - X days remaining"
- **After deactivation**: "⚠️ Subscription Expired - Listings deactivated"
- **On renewal**: "🎉 Welcome Back! X listings reactivated"

**Smart Reactivation:**
```sql
-- When user renews, system automatically:
1. Reactivates all APPROVED listings
2. Counts total reactivated (rentals + marketplace)
3. Sends notification with breakdown
4. Updates all timestamps
```

---

## 📦 Installation Instructions

### Step 1: Run Migrations in Supabase

1. **Go to Supabase Dashboard** → Database → SQL Editor

2. **Run Migration 1** (Media Tracking):
   ```bash
   Copy contents of: comprehensive_media_tracking_system.sql
   Paste into SQL Editor
   Click "RUN"
   ```

3. **Run Migration 2** (Lifecycle Automation):
   ```bash
   Copy contents of: subscription_lifecycle_automation.sql
   Paste into SQL Editor
   Click "RUN"
   ```

### Step 2: Setup Cron Jobs

Go to **Supabase Dashboard** → Database → Cron Jobs

**Create 3 Cron Jobs:**

#### Job 1: Check Expired Subscriptions (Daily)
```sql
-- Name: check_expired_subscriptions
-- Schedule: 0 0 * * * (Every day at midnight UTC)
SELECT * FROM check_expired_subscriptions_with_grace();
```

#### Job 2: Send Expiry Notifications (Daily)
```sql
-- Name: send_expiring_notifications
-- Schedule: 0 9 * * * (Every day at 9 AM UTC)
SELECT * FROM send_expiring_soon_notifications();
```

#### Job 3: Reset Monthly Quotas (Monthly)
```sql
-- Name: reset_monthly_quotas
-- Schedule: 0 0 1 * * (1st day of month at midnight)
SELECT * FROM reset_user_monthly_media_quotas();
```

---

## 🧪 Testing

### Test Subscription Expiry

```sql
-- Manually expire a subscription to test deactivation
SELECT test_expire_subscription('user-uuid-here');

-- Check if listings were deactivated
SELECT id, title, is_available FROM rental_properties WHERE landlord_id = 'user-uuid-here';
```

### Test Subscription Renewal

```sql
-- Manually renew a subscription to test reactivation
SELECT test_renew_subscription('user-uuid-here');

-- Check if listings were reactivated
SELECT id, title, is_available FROM rental_properties WHERE landlord_id = 'user-uuid-here';
```

### Test Media Tracking

```sql
-- Upload an image via your app, then check:
SELECT * FROM user_media_uploads WHERE user_id = 'user-uuid-here';

-- Check storage usage:
SELECT * FROM get_user_media_usage('user-uuid-here');

-- Check user_subscriptions table:
SELECT
    images_used_this_month,
    videos_used_this_month,
    listings_used
FROM user_subscriptions
WHERE user_id = 'user-uuid-here' AND status = 'active';
```

---

## 📊 Monitoring & Analytics

### Check Current Subscription Quotas
```sql
SELECT
    name,
    display_name,
    max_listings,
    image_quota_per_month,
    video_quota_per_month,
    max_images_per_listing,
    max_videos_per_listing
FROM subscription_plans
ORDER BY name;
```

Expected output:
```
name     | display_name | max_listings | image_quota | video_quota | max_images | max_videos
---------|--------------|--------------|-------------|-------------|------------|------------
premium  | Premium      | 50           | 30          | 10          | 15         | 5
standard | Standard     | 10           | 15          | 5           | 10         | 3
```

### View User Media Usage
```sql
-- Summary view
SELECT
    p.full_name,
    p.email,
    usu.total_images_count,
    usu.total_videos_count,
    usu.current_month_images,
    usu.current_month_videos,
    ROUND(usu.total_storage_used_bytes::NUMERIC / 1048576, 2) as storage_mb
FROM user_storage_usage usu
JOIN profiles p ON p.id = usu.user_id
ORDER BY usu.total_storage_used_bytes DESC
LIMIT 10;
```

### View Active Triggers
```sql
SELECT
    trigger_name,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (trigger_name LIKE '%media%' OR trigger_name LIKE '%subscription%')
ORDER BY event_object_table, trigger_name;
```

---

## 🔍 Troubleshooting

### Issue: Media counters still not updating

**Solution:**
```sql
-- Check if triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'track_%_media';

-- Should return 8 triggers (one for each media table)
```

### Issue: Subscription quotas not correct

**Solution:**
```sql
-- Manually update quotas
UPDATE subscription_plans
SET
    image_quota_per_month = 15,
    video_quota_per_month = 5
WHERE name = 'standard';

UPDATE subscription_plans
SET
    image_quota_per_month = 30,
    video_quota_per_month = 10
WHERE name = 'premium';
```

### Issue: Listings not deactivating on expiry

**Solution:**
```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_subscription_expired';

-- Manually run expiry check
SELECT * FROM check_expired_subscriptions_with_grace();
```

---

## 🎯 What Gets Fixed

| Problem | Before | After |
|---------|--------|-------|
| **Standard Plan Image Quota** | 50/month ❌ | 15/month ✅ |
| **Premium Plan Image Quota** | 200/month ❌ | 30/month ✅ |
| **Premium Plan Video Quota** | 20/month ❌ | 10/month ✅ |
| **Media Upload Tracking** | Not working ❌ | Real-time tracking ✅ |
| **Storage Monitoring** | None ❌ | Per-user tracking ✅ |
| **Listing Deactivation** | Manual ❌ | Automated ✅ |
| **Grace Period** | None ❌ | 7 days ✅ |
| **Media Analytics** | None ❌ | Detailed insights ✅ |

---

## 📱 Mobile App Integration

### Display Media Usage in App

```typescript
// In your React Native app
import { supabase } from '@/lib/supabase';

async function getUserMediaUsage(userId: string) {
  const { data, error } = await supabase
    .rpc('get_user_media_usage', { user_uuid: userId });

  if (data && data.length > 0) {
    const usage = data[0];
    console.log(`Images: ${usage.this_month_images}/${usage.image_quota}`);
    console.log(`Videos: ${usage.this_month_videos}/${usage.video_quota}`);
    console.log(`Storage: ${usage.total_storage_mb} MB`);
    console.log(`Images remaining: ${usage.images_remaining}`);
  }
}
```

### Check Before Upload

```typescript
async function canUploadMedia(userId: string, mediaType: 'image' | 'video') {
  const { data } = await supabase
    .rpc('get_user_media_usage', { user_uuid: userId });

  if (data && data.length > 0) {
    const usage = data[0];

    if (mediaType === 'image') {
      return usage.images_remaining > 0;
    } else {
      return usage.videos_remaining > 0;
    }
  }

  return false;
}
```

---

## 🚀 Next Steps

1. ✅ Run both migration files in Supabase
2. ✅ Setup 3 cron jobs
3. ✅ Test with a real user account
4. ✅ Monitor media uploads for 24 hours
5. ✅ Integrate media usage display in mobile app
6. ✅ Setup alerts for users approaching quota limits

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs (Dashboard → Logs)
2. Verify triggers exist (see Troubleshooting section)
3. Test with manual functions provided
4. Check RLS policies are enabled

---

**Last Updated:** 2025-01-XX
**Version:** 1.0.0
**Author:** Claude Code Assistant

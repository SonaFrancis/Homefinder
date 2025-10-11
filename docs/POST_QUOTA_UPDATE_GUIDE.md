# Post-Based Subscription System Update Guide

## Overview

The subscription system has been updated from tracking individual images/videos to tracking **posts per month** with limits on images/videos **per post**.

### New Limits:

**Standard Plan (5000 XAF/month):**
- ✅ 20 posts per month
- ✅ 5 images per post
- ✅ 1 video per post

**Premium Plan (9000 XAF/month):**
- ✅ 25 posts per month
- ✅ 5 images per post
- ✅ 2 videos per post

## Changes Made

### 1. Database Schema ✅
- Added `max_posts_per_month`, `max_images_per_post`, `max_videos_per_post` to `subscription_plans`
- Added `posts_used_this_month`, `current_month_start` to `user_subscriptions`
- Created functions:
  - `can_user_post(user_id)` - Check if user can create a post
  - `increment_post_count(user_id)` - Increment post count after successful creation
  - `reset_monthly_post_count()` - Reset counts monthly

### 2. UI Updates ✅
- Updated subscription page with new plan features
- Updated edit profile page with new benefits list

### 3. New Hook ✅
- Created `usePostQuota` hook to replace complex subscription scenario logic
- Provides: `canPost`, `postsRemaining`, `maxImagesPerPost`, `maxVideosPerPost`

## Deployment Steps

### Step 1: Run Database Migration

```bash
# In Supabase Dashboard > SQL Editor
# Run: migrations/update_subscription_plans_to_post_based.sql
```

This will:
- Update subscription plans with new limits
- Add tracking columns to user_subscriptions
- Create helper functions for quota checking

### Step 2: Set Up Monthly Reset (Optional)

You can automate monthly post count resets using Supabase Cron:

1. Go to Supabase Dashboard > Database > Cron Jobs
2. Create new cron job:
   - **Name**: Reset Monthly Post Counts
   - **Schedule**: `0 0 * * *` (daily at midnight)
   - **Query**: `SELECT reset_monthly_post_count();`

### Step 3: Update Dashboard Components

The dashboard tabs need to be updated to use the new `usePostQuota` hook.

#### PropertyTab.tsx Changes:

**Replace imports:**
```typescript
// OLD:
import { useSubscriptionScenario } from '@/hooks/useSubscriptionScenario';
import { useQuotaGuard } from '@/hooks/useQuotaGuard';

// NEW:
import { usePostQuota } from '@/hooks/usePostQuota';
```

**Replace quota hooks:**
```typescript
// OLD:
const {
  scenario,
  loading: scenarioLoading,
  canCreateListing,
  canUploadMedia,
  listingsRemaining,
  imagesRemaining,
  videosRemaining,
  refresh: refreshScenario
} = useSubscriptionScenario(profile?.id);

const { checkCanCreateListing, checkCanUploadMedia } = useQuotaGuard({
  scenario,
  onBlocked: () => console.log('User blocked from action')
});

// NEW:
const {
  quotaInfo,
  loading: quotaLoading,
  refresh: refreshQuota,
  incrementPostCount,
} = usePostQuota(profile?.id);
```

**Update media picker validation:**
```typescript
const pickMedia = async () => {
  // Check if user can post
  if (!quotaInfo?.canPost) {
    Alert.alert('Post Limit Reached', quotaInfo?.message || 'You have reached your monthly post limit');
    return;
  }

  // Check image/video limits per post
  const imageCount = selectedMedia.filter(m => m.type === 'image').length;
  const videoCount = selectedMedia.filter(m => m.type === 'video').length;

  if (imageCount >= (quotaInfo?.maxImagesPerPost || 0)) {
    Alert.alert('Image Limit', `You can upload up to ${quotaInfo?.maxImagesPerPost} images per post`);
    return;
  }

  if (videoCount >= (quotaInfo?.maxVideosPerPost || 0)) {
    Alert.alert('Video Limit', `You can upload up to ${quotaInfo?.maxVideosPerPost} videos per post`);
    return;
  }

  // Rest of media picker logic...
};
```

**Update submit handler:**
```typescript
const handleSubmit = async () => {
  // Check if user can post (for new posts only)
  if (!editingPropertyId && !quotaInfo?.canPost) {
    Alert.alert('Post Limit Reached', quotaInfo?.message || 'Cannot create more posts this month');
    return;
  }

  // Validate media limits
  const imageCount = selectedMedia.filter(m => m.type === 'image').length;
  const videoCount = selectedMedia.filter(m => m.type === 'video').length;

  if (imageCount > (quotaInfo?.maxImagesPerPost || 0)) {
    Alert.alert('Too Many Images', `Maximum ${quotaInfo?.maxImagesPerPost} images per post`);
    return;
  }

  if (videoCount > (quotaInfo?.maxVideosPerPost || 0)) {
    Alert.alert('Too Many Videos', `Maximum ${quotaInfo?.maxVideosPerPost} videos per post`);
    return;
  }

  // ... existing validation ...

  setSubmitting(true);

  try {
    // ... create/update property ...

    // ... upload media ...

    // ... save media records ...

    // Increment post count ONLY for new posts
    if (!editingPropertyId) {
      const incremented = await incrementPostCount();
      if (!incremented) {
        console.warn('Failed to increment post count');
      }
    }

    Alert.alert('Success', editingPropertyId ? 'Property updated!' : 'Property posted!');

    // Reset form and refresh
    resetForm();
    await fetchListings();
    await refreshQuota();

  } catch (error) {
    // ... error handling ...
  } finally {
    setSubmitting(false);
  }
};
```

**Add quota display:**
```typescript
// Add this component to show remaining posts
{!showForm && quotaInfo && (
  <View style={styles.quotaInfo}>
    <Ionicons name="create-outline" size={20} color="#10B981" />
    <Text style={styles.quotaText}>
      {quotaInfo.postsRemaining} of {quotaInfo.maxPosts} posts remaining this month
    </Text>
  </View>
)}
```

#### SalesTab.tsx Changes:

Apply the same changes to SalesTab.tsx:
1. Import `usePostQuota`
2. Replace quota hooks
3. Update media picker validation
4. Update submit handler to increment post count
5. Add quota display

### Step 4: Remove Old Hooks (Optional)

Once everything is working, you can optionally remove or deprecate:
- `useSubscriptionScenario.ts`
- `useQuotaGuard.ts`

Or keep them for backwards compatibility if other parts of the app use them.

## Testing Checklist

### Database:
- [ ] Migration runs successfully
- [ ] Subscription plans updated with new limits
- [ ] `can_user_post()` function works correctly
- [ ] `increment_post_count()` function increments count
- [ ] Monthly reset function works

### Frontend:
- [ ] Subscription page shows correct limits (20/25 posts)
- [ ] Edit profile shows correct benefits
- [ ] Dashboard shows remaining posts
- [ ] Cannot create post when limit reached
- [ ] Cannot upload more than max images per post
- [ ] Cannot upload more than max videos per post
- [ ] Post count increments after successful creation
- [ ] Post count does NOT increment when editing existing post

### User Flow:
1. [ ] New user subscribes to Standard
2. [ ] User can create 20 posts
3. [ ] Each post limited to 5 images, 1 video
4. [ ] 21st post attempt shows limit reached alert
5. [ ] User upgrades to Premium
6. [ ] User can now create 25 posts
7. [ ] Each post limited to 5 images, 2 videos
8. [ ] After 30 days, post count resets

## Migration for Existing Users

### Reset All User Post Counts:

```sql
-- Reset post counts for all active subscriptions
UPDATE user_subscriptions
SET
  posts_used_this_month = 0,
  current_month_start = CURRENT_DATE
WHERE status = 'active';
```

### Calculate Current Month Usage (if needed):

If you want to preserve current month's usage:

```sql
-- Count posts created this month per user
WITH post_counts AS (
  SELECT
    landlord_id as user_id,
    COUNT(*) as property_count
  FROM rental_properties
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY landlord_id

  UNION ALL

  -- Add marketplace items (repeat for each category table)
  SELECT
    seller_id as user_id,
    COUNT(*) as item_count
  FROM electronics
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY seller_id
)
UPDATE user_subscriptions us
SET
  posts_used_this_month = COALESCE(pc.total_posts, 0),
  current_month_start = DATE_TRUNC('month', CURRENT_DATE)
FROM (
  SELECT user_id, SUM(property_count) as total_posts
  FROM post_counts
  GROUP BY user_id
) pc
WHERE us.user_id = pc.user_id
  AND us.status = 'active';
```

## Monitoring Queries

### Check User's Post Quota:

```sql
SELECT
  p.full_name,
  sp.name as plan,
  sp.max_posts_per_month,
  us.posts_used_this_month,
  sp.max_posts_per_month - us.posts_used_this_month as remaining,
  us.current_month_start
FROM user_subscriptions us
JOIN profiles p ON us.user_id = p.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
ORDER BY us.posts_used_this_month DESC;
```

### Find Users Near Limit:

```sql
SELECT
  p.full_name,
  p.email,
  sp.name as plan,
  us.posts_used_this_month,
  sp.max_posts_per_month,
  sp.max_posts_per_month - us.posts_used_this_month as remaining
FROM user_subscriptions us
JOIN profiles p ON us.user_id = p.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
  AND us.posts_used_this_month >= sp.max_posts_per_month * 0.8
ORDER BY remaining ASC;
```

### Check Who Needs Reset:

```sql
SELECT
  p.full_name,
  us.current_month_start,
  CURRENT_DATE - us.current_month_start as days_since_start
FROM user_subscriptions us
JOIN profiles p ON us.user_id = p.id
WHERE us.status = 'active'
  AND us.current_month_start + INTERVAL '30 days' < CURRENT_DATE;
```

## Benefits of New System

### For Users:
✅ Clearer pricing - focus on number of posts
✅ More flexible - 5 images per post is generous
✅ Better value - can create more quality listings

### For Business:
✅ Simpler quota management
✅ Easier to explain to users
✅ More predictable resource usage
✅ Encourages quality over quantity

### For Development:
✅ Less complex tracking logic
✅ Single point of quota check
✅ Easier to add new post types
✅ Better performance (fewer queries)

## Troubleshooting

### User says they can't post but should have quota:

```sql
-- Check their actual quota
SELECT * FROM can_user_post('user-uuid-here');

-- Check their subscription
SELECT * FROM user_subscriptions WHERE user_id = 'user-uuid-here';

-- Manually reset if needed
UPDATE user_subscriptions
SET posts_used_this_month = 0
WHERE user_id = 'user-uuid-here';
```

### Post count not incrementing:

- Check if `increment_post_count()` function is being called after post creation
- Check function permissions: `GRANT EXECUTE ON FUNCTION increment_post_count(UUID) TO authenticated;`
- Check if user has active subscription

### Monthly reset not working:

- Verify cron job is set up
- Manually run: `SELECT reset_monthly_post_count();`
- Check which subscriptions were reset: Check `current_month_start` dates

## Support

If you need help with the migration, check:
1. Supabase Dashboard > Logs for any errors
2. Console logs in the app for quota check failures
3. Database query results using the monitoring queries above

Good luck with the update! 🚀

# Subscription System Toggle Guide

## Overview

This guide documents how to temporarily disable the subscription system to allow free access to all users, and how to easily re-enable it later when you're ready to monetize.

**Key Feature:** One-line toggle to switch between free access and paid subscriptions.

**Latest Update:** Added Step 8 to hide Account Status section in Edit Profile page when subscriptions are disabled.

**⚠️ IMPORTANT:** This guide covers **frontend-only** changes. You must also disable database-level subscription checks! See: [DATABASE_SUBSCRIPTION_TOGGLE.md](./DATABASE_SUBSCRIPTION_TOGGLE.md)

---

## Table of Contents

1. [Strategy Overview](#strategy-overview)
2. [Implementation Steps](#implementation-steps)
3. [How to Toggle Subscriptions](#how-to-toggle-subscriptions)
4. [Testing Checklist](#testing-checklist)
5. [Files Modified](#files-modified)
6. [Rollback Instructions](#rollback-instructions)

---

## Strategy Overview

### Why This Approach?

- ✅ **Zero Code Deletion**: All subscription code remains intact
- ✅ **One-Line Toggle**: Change one flag to activate/deactivate subscriptions
- ✅ **No Database Changes**: No migrations or schema updates needed
- ✅ **Clean Rollback**: Easy to switch back and forth for testing
- ✅ **Maintainable**: Clear separation of free vs paid logic
- ✅ **Testable**: Can test both modes easily

### How It Works

We create a feature flag system that bypasses subscription checks when disabled:

```typescript
// lib/featureFlags.ts
export const FEATURE_FLAGS = {
  ENABLE_SUBSCRIPTIONS: false,  // Set to true to require subscriptions
  // ...
}
```

When `ENABLE_SUBSCRIPTIONS = false`:
- All users get free dashboard access after signup
- Unlimited posts allowed (configurable limit)
- No subscription banners or prompts
- All subscription code remains dormant

When `ENABLE_SUBSCRIPTIONS = true`:
- Original subscription system activates
- Quota limits enforced
- Payment required for dashboard access

---

## Implementation Steps

### Step 1: Create Feature Flags Configuration

**Create new file:** `lib/featureFlags.ts`

```typescript
// =====================================================
// FEATURE FLAGS
// =====================================================
// Central configuration for enabling/disabling features
// Toggle ENABLE_SUBSCRIPTIONS to true when ready to activate

export const FEATURE_FLAGS = {
  // Set to false for free access, true to require subscriptions
  ENABLE_SUBSCRIPTIONS: false,

  // When subscriptions disabled, these are the default limits
  FREE_ACCESS_LIMITS: {
    maxPostsPerMonth: 999, // Unlimited posts (or set a reasonable limit)
    maxImagesPerPost: 10,
    maxVideosPerPost: 5,
    dashboardAccess: true,
  }
} as const;
```

---

### Step 2: Update Authentication Store

**File:** `store/authStore.ts`

**Import the feature flags at the top:**

```typescript
import { FEATURE_FLAGS } from '@/lib/featureFlags';
```

**Modify the `hasDashboardAccess` function:**

```typescript
hasDashboardAccess: () => {
  // If subscriptions disabled, grant access to all logged-in users
  if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
    return true;
  }

  // Original subscription logic
  const { subscription } = get();
  if (!subscription) return false;

  // Calculate days expired
  const endDate = new Date(subscription.end_date);
  const now = new Date();
  const daysExpired = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

  // Grant access if:
  // 1. Subscription is active, OR
  // 2. Subscription expired but within 7-day grace period
  return (
    subscription.status === 'active' ||
    (subscription.status === 'expired' && daysExpired <= 7)
  );
},
```

**Modify the `hasActiveSubscription` function:**

```typescript
hasActiveSubscription: () => {
  // If subscriptions disabled, treat all users as having active subscription
  if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
    return true;
  }

  // Original subscription logic
  const { subscription } = get();
  if (!subscription) return false;

  return (
    subscription.status === 'active' &&
    subscription.end_date &&
    new Date(subscription.end_date) > new Date()
  );
},
```

**Modify the `canPostListing` function:**

```typescript
canPostListing: () => {
  // If subscriptions disabled, allow posting
  if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
    return true;
  }

  // Original subscription logic
  const { subscription } = get();
  if (!subscription || !get().hasActiveSubscription()) return false;

  const plan = subscription.subscription_plans;
  if (!plan) return false;

  return subscription.listings_used < plan.max_listings;
},
```

---

### Step 3: Update Subscription Scenario Hook

**File:** `hooks/useSubscriptionScenario.ts`

**Import the feature flags at the top:**

```typescript
import { FEATURE_FLAGS } from '@/lib/featureFlags';
```

**Modify the `fetchScenario` function to add feature flag check at the beginning:**

```typescript
const fetchScenario = useCallback(async () => {
  // If subscriptions disabled, return unlimited access scenario
  if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
    setScenario({
      scenario: 1, // Active scenario
      scenario_name: 'Free Access (Beta)',
      subscription_status: 'active',
      days_expired: 0,
      grace_days_remaining: 0,
      can_create_listings: true,
      can_upload_media: true,
      listings_should_be_live: true,
      can_edit_listings: true,
      dashboard_access: 'full',
      warning_message: '',
      listings_used: 0,
      max_listings: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxPostsPerMonth,
      posts_used_this_month: 0,
      max_posts_per_month: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxPostsPerMonth,
      images_used: 0,
      image_quota: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxImagesPerPost * 1000,
      videos_used: 0,
      video_quota: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxVideosPerPost * 1000,
    });
    setLoading(false);
    return;
  }

  // Original subscription checking logic continues below...
  if (!userId) {
    setLoading(false);
    return;
  }

  // ... rest of original code remains unchanged
}, [userId]);
```

---

### Step 4: Update Dashboard Access Check

**File:** `app/dashboard/index.tsx`

**Import the feature flags at the top:**

```typescript
import { FEATURE_FLAGS } from '@/lib/featureFlags';
```

**Update the access check useEffect:**

```typescript
// Check dashboard access on mount
useEffect(() => {
  // Skip check if subscriptions are disabled
  if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
    return;
  }

  if (!loading && !hasDashboardAccess()) {
    Alert.alert(
      'Subscription Required',
      'You need an active subscription to access the dashboard. Please subscribe to continue.',
      [
        {
          text: 'Subscribe Now',
          onPress: () => router.replace('/subscription'),
        },
        {
          text: 'Go Back',
          style: 'cancel',
          onPress: () => router.back(),
        },
      ]
    );
  }
}, [loading, hasDashboardAccess]);
```

**Hide the subscription banner when disabled:**

```typescript
{/* Subscription Status Banner */}
{!loading && scenario && FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS && (
  <SubscriptionStatusBanner scenario={scenario} />
)}
```

---

### Step 5: Update Post Quota Checks in Property Tab

**File:** `app/dashboard/tabs/PropertyTab.tsx`

**Import the feature flags at the top:**

```typescript
import { FEATURE_FLAGS } from '@/lib/featureFlags';
```

**Update the `getPostQuota` function:**

```typescript
const getPostQuota = () => {
  // If subscriptions disabled, return unlimited quota
  if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
    return {
      postsUsed: 0,
      maxPosts: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxPostsPerMonth,
      postsRemaining: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxPostsPerMonth,
      canPost: true
    };
  }

  // Original subscription quota logic
  const plan = subscription?.subscription_plans;
  const postsUsed = subscription?.posts_used_this_month || 0;
  const maxPosts = plan?.max_posts_per_month || 20;
  return {
    postsUsed,
    maxPosts,
    postsRemaining: maxPosts - postsUsed,
    canPost: postsUsed < maxPosts
  };
};
```

**Update the `getUploadLimits` function:**

```typescript
const getUploadLimits = () => {
  // If subscriptions disabled, return free access limits
  if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
    return {
      maxImages: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxImagesPerPost,
      maxVideos: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxVideosPerPost,
      planName: 'Beta Access'
    };
  }

  // Original subscription limits logic
  const plan = subscription?.subscription_plans;
  return {
    maxImages: plan?.max_images_per_post || 5,
    maxVideos: plan?.max_videos_per_post || 1,
    planName: plan?.display_name || 'Standard'
  };
};
```

---

### Step 6: Update Post Quota Checks in Sales Tab

**File:** `app/dashboard/tabs/SalesTab.tsx`

**Import the feature flags at the top:**

```typescript
import { FEATURE_FLAGS } from '@/lib/featureFlags';
```

**Update the `getPostQuota` function (same as PropertyTab):**

```typescript
const getPostQuota = () => {
  // If subscriptions disabled, return unlimited quota
  if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
    return {
      postsUsed: 0,
      maxPosts: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxPostsPerMonth,
      postsRemaining: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxPostsPerMonth,
      canPost: true
    };
  }

  // Original subscription quota logic
  const plan = subscription?.subscription_plans;
  const postsUsed = subscription?.posts_used_this_month || 0;
  const maxPosts = plan?.max_posts_per_month || 20;
  return {
    postsUsed,
    maxPosts,
    postsRemaining: maxPosts - postsUsed,
    canPost: postsUsed < maxPosts
  };
};
```

**Update the `getUploadLimits` function (same as PropertyTab):**

```typescript
const getUploadLimits = () => {
  // If subscriptions disabled, return free access limits
  if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
    return {
      maxImages: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxImagesPerPost,
      maxVideos: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxVideosPerPost,
      planName: 'Beta Access'
    };
  }

  // Original subscription limits logic
  const plan = subscription?.subscription_plans;
  return {
    maxImages: plan?.max_images_per_post || 5,
    maxVideos: plan?.max_videos_per_post || 1,
    planName: plan?.display_name || 'Standard'
  };
};
```

---

### Step 7 (Optional): Hide Subscription Button in Profile

**File:** `app/(tabs)/profile.tsx`

**Import the feature flags at the top:**

```typescript
import { FEATURE_FLAGS } from '@/lib/featureFlags';
```

**Wrap the subscription/upgrade button with conditional rendering:**

```typescript
{FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS && (
  <TouchableOpacity
    style={styles.subscriptionButton}
    onPress={() => router.push('/subscription')}
  >
    {/* Subscription button content */}
  </TouchableOpacity>
)}
```

---

### Step 8: Hide Account Status in Edit Profile Page

**File:** `app/profile/edit.tsx`

**Import the feature flags at the top:**

```typescript
import { FEATURE_FLAGS } from '@/lib/featureFlags';
```

**Wrap the Account Status Section with conditional rendering:**

Find the Account Status Section (around line 423) and wrap it:

```typescript
{/* Account Status Section - Only show when subscriptions are enabled */}
{FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS && (
<View style={styles.accountStatusSection}>
  <Text style={styles.sectionTitle}>Account Status</Text>

  {/* Subscription Card */}
  <View style={styles.subscriptionCard}>
    {/* ... all subscription content ... */}
  </View>

  {/* Benefits List */}
  {subscriptionStatus.isSubscribed && (
    <View style={styles.benefitsContainer}>
      {/* ... benefits content ... */}
    </View>
  )}
</View>
)}
```

**What this does:**
- When subscriptions are disabled, the entire Account Status section is hidden
- When subscriptions are enabled, it displays subscription info, status, and benefits
- Keeps the UI clean during free access mode

---

### Step 9 (Optional): Add Beta Access Banner

**File:** `app/dashboard/index.tsx`

**Add a beta banner when subscriptions are disabled (after the Subscription Status Banner section):**

```typescript
{/* Beta Access Banner (when subscriptions disabled) */}
{!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS && (
  <View style={styles.betaBanner}>
    <Ionicons name="gift-outline" size={20} color="#10B981" />
    <Text style={styles.betaText}>
      🎉 Free Beta Access - Unlimited Posts
    </Text>
  </View>
)}
```

**Add the corresponding styles:**

```typescript
betaBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#E8F5F0',
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  marginHorizontal: spacing.lg,
  marginVertical: spacing.sm,
  borderRadius: spacing.md,
  gap: spacing.sm,
},
betaText: {
  fontSize: fontSize.base,
  fontWeight: '600',
  color: '#10B981',
},
```

---

## How to Toggle Subscriptions

### To Enable Free Access (Current Mode)

**Frontend:**
1. Open `lib/featureFlags.ts`
2. Set `ENABLE_SUBSCRIPTIONS: false`
3. Save and deploy

**Database:**
4. Open Supabase SQL Editor
5. Run `migrations/disable_subscription_enforcement.sql`
6. Verify success message

**Result:**
- All users get free dashboard access after signup
- Unlimited posts (or configured limit)
- No subscription barriers
- No payment prompts
- No database errors when creating listings

---

### To Enable Paid Subscriptions (Future)

**Frontend:**
1. Open `lib/featureFlags.ts`
2. Change `ENABLE_SUBSCRIPTIONS: false` to `ENABLE_SUBSCRIPTIONS: true`
3. Save and deploy

**Database:**
4. Open Supabase SQL Editor
5. Run `migrations/enable_subscription_enforcement.sql`
6. Verify success message

**Result:**
- Full subscription system activates
- Payment required for dashboard access
- Quota limits enforced at frontend AND database levels
- Subscription banners visible
- Subscription button appears in profile page
- Account Status section becomes visible in Edit Profile page
- Database blocks listing creation without subscription

---

## Testing Checklist

### With Subscriptions Disabled (`ENABLE_SUBSCRIPTIONS: false`)

- [ ] New users can access dashboard immediately after signup
- [ ] Users can create property listings without subscription
- [ ] Users can create marketplace items without subscription
- [ ] No subscription status banner shown in dashboard
- [ ] No subscription button in profile page
- [ ] Account Status section hidden in Edit Profile page
- [ ] Users can upload images/videos without quota limits
- [ ] No payment prompts or alerts
- [ ] Dashboard displays "Beta Access" or configured free plan name
- [ ] Beta banner shows in dashboard (if Step 8 implemented)

### With Subscriptions Enabled (`ENABLE_SUBSCRIPTIONS: true`)

- [ ] New users see "Subscription Required" when accessing dashboard
- [ ] Users without subscription redirected to subscription page
- [ ] Subscription status banner displays correctly
- [ ] Quota limits enforced (posts, images, videos)
- [ ] Subscription button visible in profile page
- [ ] Account Status section visible in Edit Profile page
- [ ] Subscription details showing correctly in Edit Profile
- [ ] Payment flow works correctly
- [ ] Grace period system functions as expected
- [ ] Expired subscriptions handled correctly
- [ ] Beta banner hidden (if Step 8 implemented)

---

## Files Modified

| File | Purpose | Changes |
|------|---------|---------|
| `lib/featureFlags.ts` | **NEW** - Feature flag configuration | Central toggle for subscription system |
| `store/authStore.ts` | Authentication & access control | Add feature flag checks to access functions |
| `hooks/useSubscriptionScenario.ts` | Subscription state management | Return free access scenario when disabled |
| `app/dashboard/index.tsx` | Dashboard access & UI | Skip access checks, hide subscription banner |
| `app/dashboard/tabs/PropertyTab.tsx` | Property posting quotas | Return unlimited quotas when disabled |
| `app/dashboard/tabs/SalesTab.tsx` | Marketplace posting quotas | Return unlimited quotas when disabled |
| `app/(tabs)/profile.tsx` | Profile page UI | Hide subscription button when disabled |
| `app/profile/edit.tsx` | Edit profile page UI | Hide Account Status section when disabled |

---

## Rollback Instructions

### If You Need to Completely Undo These Changes

1. Delete the file: `lib/featureFlags.ts`
2. Remove all imports of `FEATURE_FLAGS` from modified files
3. Remove all `if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS)` checks
4. Restore original function logic (before the feature flag checks)

**However**, it's recommended to keep this system even after enabling subscriptions, as it provides:
- Easy testing ability (switch between modes)
- Quick emergency disable if payment system has issues
- Ability to run promotional "free access" periods
- A/B testing capabilities

---

## Configuration Options

You can customize the free access limits in `lib/featureFlags.ts`:

```typescript
FREE_ACCESS_LIMITS: {
  maxPostsPerMonth: 999,  // Change to set post limit (e.g., 50, 100)
  maxImagesPerPost: 10,   // Images per post limit
  maxVideosPerPost: 5,    // Videos per post limit
  dashboardAccess: true,  // Dashboard access permission
}
```

---

## Frequently Asked Questions

### Q: Will existing subscriber data be lost?
**A:** No, all subscription data remains in the database. The feature flag only bypasses the checks.

### Q: Can we toggle this multiple times?
**A:** Yes, you can switch between free and paid as many times as needed.

### Q: What happens to users who paid when we disable subscriptions?
**A:** They keep their subscription status in the database. When you re-enable, their subscriptions will still be valid (if not expired).

### Q: Do we need to run database migrations?
**A:** No, this approach requires zero database changes.

### Q: How do we track usage during free period?
**A:** The post counters and usage tracking still work. You can analyze this data to set appropriate limits when enabling subscriptions.

### Q: Can we set a post limit even in free mode?
**A:** Yes, change `maxPostsPerMonth` in the `FREE_ACCESS_LIMITS` configuration.

---

## Migration Path for Existing Users

When you're ready to enable subscriptions after having many free users:

1. **Grandfather Existing Users** (Optional):
   - Query all users who signed up during free period
   - Grant them a free "Beta Tester" subscription plan
   - This rewards early adopters

2. **Set Transition Date**:
   - Announce subscription requirement starting on a specific date
   - Give users 30 days notice

3. **Enable Subscriptions**:
   - Change `ENABLE_SUBSCRIPTIONS` to `true`
   - Existing free users will see subscription prompts
   - New users must subscribe from day 1

4. **Monitor & Support**:
   - Watch for user feedback
   - Provide support for payment issues
   - Consider offering discounts to convert free users

---

## Support

If you encounter issues:

1. Check that `FEATURE_FLAGS` is imported correctly in all files
2. Verify the feature flag value is set correctly
3. Clear app cache and rebuild
4. Check console for any TypeScript errors

---

## Version History

- **v1.0** - Initial feature flag implementation
- **Current Status**: Subscriptions DISABLED (Free Access Mode)

---

**Last Updated**: 2025-10-08
**Maintained By**: Development Team

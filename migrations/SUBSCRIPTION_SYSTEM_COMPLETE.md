# 🎯 Complete Subscription & Quota System Documentation

## 📋 Overview

This document describes the **3-Scenario Subscription System** that controls user access, listing visibility, and quota enforcement based on subscription status and quota usage.

---

## 🎬 **The 3 Scenarios**

### **Scenario 1: Active Subscription** ✅

**Conditions:**
- Subscription status: `active`
- End date: Future (not expired)
- Quota: Any (doesn't matter)

**User Experience:**
```
✅ Full access to all features
✅ Can create new listings
✅ Can upload media (within quota limits)
✅ All listings are LIVE in main app
✅ Can edit/delete existing listings
✅ Full dashboard access
```

**Quota Sub-States:**

#### **1A: Active + Quota Available**
```
Subscription: ACTIVE
Listings: 5/10 used
Images: 8/15 used

Result:
- Can create 5 more listings ✅
- Can upload 7 more images ✅
- All 5 existing listings LIVE ✅
```

#### **1B: Active + Quota Exhausted**
```
Subscription: ACTIVE
Listings: 10/10 used (FULL)
Images: 15/15 used (FULL)

Result:
- Can create new listings: ❌ NO
- Can upload new media: ❌ NO
- All 10 existing listings: ✅ STILL LIVE (subscription active!)
- Can edit existing listings: ✅ YES
- Can delete to free quota: ✅ YES

User sees:
⚠️ "Monthly quota reached (10/10 listings, 15/15 images)"
   "Resets on March 1st or [Upgrade to Premium]"

Dashboard: ✅ Full access
Existing listings: ✅ LIVE and editable
```

**Key Point:** Quota exhaustion does NOT deactivate listings if subscription is still active!

---

### **Scenario 2: Subscription Expired (0-7 days) - Grace Period** ⚠️

**Conditions:**
- Subscription status: `expired` or end_date in past
- Days since expiry: 0-7 days
- Quota: May have remaining quota

**User Experience:**
```
⚠️ Grace period active (listings stay live)
✅ Can use REMAINING quota only
✅ Listings stay LIVE in main app
✅ Can edit existing listings
⚠️ Big warning banners everywhere
```

**Sub-States:**

#### **2A: Expired + Quota Remaining**
```
Subscription: EXPIRED (3 days ago)
Listings: 5/10 used (5 remaining)
Images: 8/15 used (7 remaining)
Grace: 4 days left

Result:
- Can create 5 MORE listings: ✅ YES (using remaining quota)
- Can upload 7 MORE images: ✅ YES (using remaining quota)
- All existing listings: ✅ LIVE (grace period)
- Can edit: ✅ YES

User sees:
⚠️ "Your subscription expired 3 days ago"
   Grace period: 4 days remaining

   You can still use remaining quota:
   • 5 more listings
   • 7 more images

   ⏰ After 4 days, all listings will be deactivated
   [Renew Now] to keep full access

Dashboard: ✅ Full access (with warnings)
Listings: ✅ LIVE with countdown timer
```

#### **2B: Expired + Quota Exhausted**
```
Subscription: EXPIRED (2 days ago)
Listings: 10/10 used (FULL)
Images: 15/15 used (FULL)
Grace: 5 days left

Result:
- Can create new: ❌ NO (quota full)
- Can upload: ❌ NO (quota full)
- All existing listings: ✅ LIVE (grace period)
- Can edit: ✅ YES

User sees:
⚠️ "Subscription expired 2 days ago"
   Quota: 10/10 listings, 15/15 images (exhausted)
   Grace period: 5 days remaining

   ⏰ Renew now to avoid losing access in 5 days
   [Renew Subscription]

Dashboard: ✅ Full access
Listings: ✅ LIVE (grace active)
```

---

### **Scenario 3: Subscription Expired (8+ days) - Grace Ended** ❌

**Conditions:**
- Subscription status: `expired`
- Days since expiry: 8 or more
- Grace period: ENDED

**User Experience:**
```
❌ All listings DEACTIVATED (not visible in main app)
❌ Cannot create new listings
❌ Cannot upload media
❌ Cannot edit existing listings
✅ Dashboard: READ-ONLY access
✅ Can view own listings (marked "Inactive")
✅ Can renew subscription
✅ One-click reactivation after renewal
```

**What User Sees:**
```
┌─────────────────────────────────────────────────────┐
│ ❌ Subscription Expired 10 Days Ago                 │
│    Grace period ended                               │
│                                                     │
│ Your 10 listings have been deactivated and are     │
│ no longer visible in the marketplace.               │
│                                                     │
│ Renew now to restore them immediately!              │
│                                                     │
│ [Renew Subscription - Instant Reactivation]        │
└─────────────────────────────────────────────────────┘

Dashboard:
- Analytics: ⚠️ Grayed out (read-only)
- Listings: Shows all 10 with "INACTIVE" badge
- Create button: ❌ Disabled with "Renew to create" tooltip
- Upload button: ❌ Disabled

Listings in User Dashboard:
┌────────────────────────────────┐
│ 🏠 Modern 2BR Apartment        │
│ Status: ⚠️ INACTIVE            │
│ Reason: Subscription expired   │
│                                │
│ [Reactivate After Renewal]     │
└────────────────────────────────┘
```

**After Renewal:**
```
User clicks [Renew Subscription] → Pays → Success

Result:
✅ All 10 listings INSTANTLY reactivated
✅ Quota reset to 0/10, 0/15
✅ Full access restored
✅ Listings appear in main app immediately

Success message:
🎉 "Welcome Back! Your 10 listings are now live again!"
```

---

## 📊 **Complete Behavior Matrix**

| Scenario | Subscription | Quota Used | Days Expired | Create New? | Upload Media? | Listings LIVE? | Edit Existing? | Dashboard Access |
|----------|--------------|------------|--------------|-------------|---------------|----------------|----------------|------------------|
| **1A. Active + Available** | ✅ Active | 5/10 | 0 | ✅ YES | ✅ YES | ✅ LIVE | ✅ YES | ✅ Full |
| **1B. Active + Exhausted** | ✅ Active | 10/10 | 0 | ❌ NO | ❌ NO | ✅ **LIVE** | ✅ YES | ✅ Full |
| **2A. Grace + Quota Left** | ⚠️ Expired | 5/10 | 3 days | ✅ YES | ✅ YES | ✅ **LIVE** | ✅ YES | ✅ Full + Warnings |
| **2B. Grace + Exhausted** | ⚠️ Expired | 10/10 | 5 days | ❌ NO | ❌ NO | ✅ **LIVE** | ✅ YES | ✅ Full + Warnings |
| **3. Grace Ended** | ❌ Expired | Any | 10 days | ❌ NO | ❌ NO | ❌ INACTIVE | ❌ NO | ⚠️ Read-only |

---

## 🔄 **Lifecycle Timeline Example**

### **Month 1: Normal Usage**

#### **Day 1-25: Active Subscription**
```
Feb 1-25:
- User creates 10 listings (quota full)
- All 10 listings: ✅ LIVE
- Can still edit/delete: ✅ YES
- Create new: ❌ NO (quota full, but listings stay live)
- Status: Scenario 1B (Active + Exhausted)
```

#### **Day 28: Subscription Expires**
```
Feb 28 (Last day):
- Subscription ends at 11:59 PM
- Status changes: active → expired
- Grace period begins: Day 0 of 7
```

### **Month 2: Grace Period**

#### **Day 1-3: Early Grace (Expired 1-3 days)**
```
Mar 1-3:
- Subscription: EXPIRED (1-3 days ago)
- All 10 listings: ✅ STILL LIVE (grace active)
- Grace remaining: 6-4 days
- Status: Scenario 2B (Grace + Exhausted)

User sees:
⚠️ Banner: "Subscription expired 2 days ago. Renew in 5 days or listings deactivate."
```

#### **Day 7: Last Day of Grace**
```
Mar 7:
- Subscription: EXPIRED (7 days ago)
- All 10 listings: ✅ STILL LIVE (last day!)
- Grace: Ends tomorrow

User sees:
🚨 Urgent Banner: "LAST DAY! Renew before midnight or all 10 listings will be deactivated."
```

#### **Day 8: Grace Period Ended**
```
Mar 8 (12:01 AM):
- Subscription: EXPIRED (8 days ago)
- All 10 listings: ❌ AUTOMATICALLY DEACTIVATED
- Main app: Listings disappear
- User dashboard: Shows "Inactive - Renew to Restore"
- Status: Scenario 3 (Grace Ended)

Automated email sent:
"Your listings have been deactivated. Renew to restore them instantly!"
```

#### **Day 15: Still Expired**
```
Mar 15:
- Subscription: EXPIRED (15 days ago)
- Listings: Still deactivated
- User logs in: Read-only dashboard
- Can view inactive listings
- Big [Renew Now] button everywhere
```

#### **Day 20: User Renews!**
```
Mar 20:
User clicks [Renew Subscription] → Pays 5000 XAF → Success!

Instant Results (within 1 second):
✅ All 10 listings REACTIVATED
✅ Appear in main app immediately
✅ Quota reset: 0/10 listings, 0/15 images
✅ Can create 10 more listings
✅ Grace period: N/A (fresh subscription)
✅ Subscription valid until Apr 20

Success notification:
🎉 "Welcome back! Your 10 listings are live again.
    Fresh quota: 10 listings, 15 images."
```

---

## 🎯 **Key Design Principles**

### **1. Fairness**
- Users keep using paid quota during grace period
- Existing listings stay live if subscription active (even if quota full)
- Clear warnings before deactivation

### **2. Urgency Without Panic**
- 7-day grace period (enough time to renew)
- Progressive warnings (day 3, 5, 7)
- No surprise deactivations

### **3. User Retention**
- Listings stay live as long as possible
- Easy one-click reactivation
- Instant restoration after renewal

### **4. Revenue Protection**
- Grace period ends eventually (8 days)
- Clear calls-to-action to renew
- Cannot create new without subscription

---

## 🔍 **Technical Implementation**

### **Status Calculation Logic**

```typescript
function getUserSubscriptionStatus(subscription) {
    const now = new Date();
    const endDate = new Date(subscription.end_date);
    const daysExpired = Math.floor((now - endDate) / (1000 * 60 * 60 * 24));

    // Scenario 1: Active subscription
    if (subscription.status === 'active' && endDate > now) {
        return {
            scenario: 1,
            name: 'Active Subscription',
            canCreateListings: subscription.listings_used < subscription.max_listings,
            canUploadMedia: subscription.images_used < subscription.image_quota,
            listingsLive: true,
            canEdit: true,
            dashboardAccess: 'full'
        };
    }

    // Scenario 2: Grace period (0-7 days)
    if (daysExpired >= 0 && daysExpired <= 7) {
        return {
            scenario: 2,
            name: 'Grace Period',
            daysRemaining: 7 - daysExpired,
            canCreateListings: subscription.listings_used < subscription.max_listings,
            canUploadMedia: subscription.images_used < subscription.image_quota,
            listingsLive: true,
            canEdit: true,
            dashboardAccess: 'full',
            warning: `Subscription expired ${daysExpired} days ago. ${7 - daysExpired} days remaining.`
        };
    }

    // Scenario 3: Grace ended (8+ days)
    return {
        scenario: 3,
        name: 'Grace Ended',
        daysExpired: daysExpired,
        canCreateListings: false,
        canUploadMedia: false,
        listingsLive: false,
        canEdit: false,
        dashboardAccess: 'readonly',
        message: `Subscription expired ${daysExpired} days ago. Renew to restore access.`
    };
}
```

---

## 📱 **User Interface Examples**

### **Scenario 1B: Active but Quota Full**

```
┌─────────────────────────────────────────┐
│ Dashboard - February 25, 2025           │
├─────────────────────────────────────────┤
│ ⚠️ Monthly Quota Reached                │
│                                         │
│ Listings: 10/10 (Full)                  │
│ Images: 15/15 (Full)                    │
│                                         │
│ Your quota resets on March 1st          │
│ or [Upgrade to Premium] for more        │
│                                         │
│ Your 10 listings are still LIVE ✅      │
└─────────────────────────────────────────┘
```

### **Scenario 2A: Grace + Quota Available**

```
┌─────────────────────────────────────────┐
│ ⚠️ SUBSCRIPTION EXPIRED                 │
│                                         │
│ Expired: 3 days ago                     │
│ Grace Period: 4 days remaining          │
│                                         │
│ ⏰ Your listings will be deactivated    │
│    in 4 days if you don't renew         │
│                                         │
│ Remaining Quota:                        │
│ • 5 more listings                       │
│ • 7 more images                         │
│                                         │
│ [Renew Now - Don't Lose Access!]       │
└─────────────────────────────────────────┘

My Listings (Still LIVE):
┌────────────────────┐ ┌────────────────────┐
│ 🏠 2BR Apartment   │ │ 🏠 Studio Room     │
│ ✅ LIVE            │ │ ✅ LIVE            │
│ ⏰ 4 days left     │ │ ⏰ 4 days left     │
└────────────────────┘ └────────────────────┘
```

### **Scenario 3: Grace Ended**

```
┌─────────────────────────────────────────┐
│ ❌ SUBSCRIPTION EXPIRED                 │
│                                         │
│ Expired: 10 days ago                    │
│ Grace Period: ENDED                     │
│                                         │
│ Your 10 listings have been deactivated  │
│ and are not visible in the marketplace. │
│                                         │
│ Renew now for instant reactivation!     │
│                                         │
│ [Renew Subscription - 5000 XAF/month]  │
└─────────────────────────────────────────┘

My Listings (INACTIVE):
┌────────────────────┐ ┌────────────────────┐
│ 🏠 2BR Apartment   │ │ 🏠 Studio Room     │
│ ❌ INACTIVE        │ │ ❌ INACTIVE        │
│ Not visible        │ │ Not visible        │
│ [Renew to Restore] │ │ [Renew to Restore] │
└────────────────────┘ └────────────────────┘
```

---

## 🚀 **Benefits of This System**

### **For Users:**
✅ Fair treatment - paid quota honored during grace
✅ No surprise deactivations - 7-day warning
✅ Keeps earning potential - listings stay live as long as possible
✅ Easy recovery - one-click reactivation
✅ Clear expectations - know exactly what happens when

### **For Business:**
✅ Higher retention - grace period gives time to renew
✅ Better UX - professional, fair system like Airbnb
✅ Revenue protection - eventually enforces payment
✅ Positive reviews - "fair platform" reputation
✅ Lower support tickets - clear communication

### **For Platform:**
✅ More content - listings stay live longer
✅ Better engagement - users motivated to renew
✅ Professional image - competing with big platforms
✅ Sustainable growth - balance fairness + revenue

---

## 📞 **Support Scenarios**

### **User: "Why can't I create a new listing?"**

**Answer depends on scenario:**

**If Scenario 1B (Active + Quota Full):**
> "Your monthly quota is full (10/10 listings used). Your quota resets on March 1st, or you can upgrade to Premium for 50 listings/month."

**If Scenario 2 (Grace Period):**
> "Your subscription expired 3 days ago. You can still use your remaining quota (5 more listings available), but please renew within 4 days to avoid losing access."

**If Scenario 3 (Grace Ended):**
> "Your subscription expired 10 days ago and the grace period has ended. Please renew to create new listings and reactivate your existing ones."

---

## 🔧 **Implementation Checklist**

- [ ] SQL triggers for quota enforcement
- [ ] SQL triggers for listing deactivation (8+ days)
- [ ] SQL triggers for listing reactivation (after renewal)
- [ ] SQL functions to check user status
- [ ] Mobile app UI for all 3 scenarios
- [ ] Dashboard warnings and banners
- [ ] Email notifications (expiry, grace, deactivation)
- [ ] Push notifications (countdown reminders)
- [ ] One-click renewal flow
- [ ] Analytics tracking (renewal rates, grace usage)
- [ ] Testing scripts for all scenarios

---

## 📅 **Automated Reminders Schedule**

| Event | Timing | Channel | Message |
|-------|--------|---------|---------|
| **Expiry Warning** | 3 days before | Email + Push | "Subscription expires in 3 days" |
| **Expiry Day** | Day of expiry | Email + Push | "Subscription expired. 7-day grace period started" |
| **Grace Day 3** | 3 days after expiry | Email + Push | "4 days left before listings deactivate" |
| **Grace Day 6** | 6 days after expiry | Email + Push + SMS | "URGENT: 1 day left!" |
| **Deactivation** | 8 days after expiry | Email + Push | "Listings deactivated. Renew to restore" |
| **Day 15** | 15 days after expiry | Email | "We miss you! Renew to restore your 10 listings" |

---

**Last Updated:** 2025-01-XX
**Version:** 1.0
**Status:** Ready for Implementation


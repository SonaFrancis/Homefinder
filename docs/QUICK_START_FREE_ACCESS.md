# Quick Start: Enable Free Access Mode

## ⚡ TL;DR - Do This Now

You're getting the error: **"Active subscription required to create listings"**

Here's the fix:

### Step 1: Run This SQL in Supabase (1 minute)

1. Go to: https://supabase.com/dashboard
2. Open your project
3. Click: **SQL Editor** (left sidebar)
4. Click: **New query**
5. Copy and paste this entire SQL:

```sql
-- Disable subscription enforcement
DROP TRIGGER IF EXISTS check_subscription_before_property_insert ON rental_properties;
DROP TRIGGER IF EXISTS check_quota_before_property_insert ON rental_properties;
DROP TRIGGER IF EXISTS check_rental_property_quota ON rental_properties;
DROP TRIGGER IF EXISTS check_subscription_before_marketplace_insert ON marketplace_items;
DROP TRIGGER IF EXISTS check_quota_before_marketplace_insert ON marketplace_items;
DROP TRIGGER IF EXISTS check_marketplace_item_quota ON marketplace_items;
DROP TRIGGER IF EXISTS check_electronics_quota ON electronics;
DROP TRIGGER IF EXISTS check_fashion_quota ON fashion;
DROP TRIGGER IF EXISTS check_cosmetics_quota ON cosmetics;
DROP TRIGGER IF EXISTS check_house_items_quota ON house_items;
DROP TRIGGER IF EXISTS check_cars_quota ON cars;
DROP TRIGGER IF EXISTS check_properties_for_sale_quota ON properties_for_sale;
DROP TRIGGER IF EXISTS check_businesses_quota ON businesses;

SELECT 'Subscription enforcement DISABLED - Free access mode active' as status;
```

6. Click: **Run** (or Ctrl+Enter)
7. You should see: "Subscription enforcement DISABLED" ✅

### Step 2: Test (30 seconds)

1. Open your app
2. Sign up as a new user
3. Go to Dashboard
4. Try creating a property listing
5. Should work! ✅ No more errors!

---

## ✅ What This Does

**Before:**
- ❌ Error: "Active subscription required"
- ❌ Can't create listings

**After:**
- ✅ No errors
- ✅ Free dashboard access
- ✅ Unlimited listings
- ✅ Clean UI (no subscription prompts)

---

## 📚 Full Documentation

For complete details, see:

1. **Frontend Toggle:** [SUBSCRIPTION_TOGGLE_GUIDE.md](./SUBSCRIPTION_TOGGLE_GUIDE.md)
2. **Database Toggle:** [DATABASE_SUBSCRIPTION_TOGGLE.md](./DATABASE_SUBSCRIPTION_TOGGLE.md)

---

## 🔄 To Switch Back to Paid Mode Later

When you're ready to require subscriptions:

**Frontend:**
```typescript
// In lib/featureFlags.ts
ENABLE_SUBSCRIPTIONS: true  // Change from false to true
```

**Database:**
Run `migrations/enable_subscription_enforcement.sql` in Supabase SQL Editor

---

## ❓ Questions?

**Q: Is this safe?**
A: Yes! Reversible anytime. No data loss.

**Q: Will existing users lose data?**
A: No! All data stays intact.

**Q: Can I switch back and forth?**
A: Yes! As many times as needed.

---

**That's it! Your app now has free access mode enabled.** 🎉

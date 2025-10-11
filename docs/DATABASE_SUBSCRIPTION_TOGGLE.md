# Database Subscription Toggle Guide

## Overview

This guide explains how to disable/enable subscription enforcement at the **database level** in Supabase.

**Important:** This is in addition to the frontend toggle (`ENABLE_SUBSCRIPTIONS` flag). Both must be disabled for full free access mode.

---

## Why You Need This

The app has **TWO layers** of subscription enforcement:

1. **Frontend Layer** - Controlled by `FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS` in `lib/featureFlags.ts`
2. **Database Layer** - Database triggers that block listing creation without subscription

**Both must be disabled** for users to have free access!

---

## Quick Start

### To Enable Free Access Mode

**Step 1: Disable Frontend Checks**
- Set `ENABLE_SUBSCRIPTIONS: false` in `lib/featureFlags.ts`

**Step 2: Disable Database Checks**
- Run the SQL migration: `disable_subscription_enforcement.sql`

### To Enable Paid Subscription Mode

**Step 1: Enable Frontend Checks**
- Set `ENABLE_SUBSCRIPTIONS: true` in `lib/featureFlags.ts`

**Step 2: Enable Database Checks**
- Run the SQL migration: `enable_subscription_enforcement.sql`

---

## How to Run SQL Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to: **SQL Editor** (left sidebar)
3. Click: **New query**
4. Copy the contents of the migration file:
   - For free mode: `migrations/disable_subscription_enforcement.sql`
   - For paid mode: `migrations/enable_subscription_enforcement.sql`
5. Paste into the SQL Editor
6. Click: **Run** (or press Ctrl/Cmd + Enter)
7. Check for success messages in the output

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or run specific migration
supabase db execute --file migrations/disable_subscription_enforcement.sql
```

### Option 3: Copy-Paste from Files

**For Free Access:**
```bash
# Copy the entire contents of:
migrations/disable_subscription_enforcement.sql

# Then paste and run in Supabase SQL Editor
```

**For Paid Mode:**
```bash
# Copy the entire contents of:
migrations/enable_subscription_enforcement.sql

# Then paste and run in Supabase SQL Editor
```

---

## What Each Migration Does

### `disable_subscription_enforcement.sql`

**Removes:**
- ❌ Subscription requirement triggers
- ❌ Quota check triggers
- ❌ Functions that block listing creation

**Result:**
- ✅ Users can create listings without subscription
- ✅ No database errors about "Active subscription required"
- ✅ Free access mode fully active

**Safe to run:** Yes - Can be reversed anytime

---

### `enable_subscription_enforcement.sql`

**Adds back:**
- ✅ Subscription requirement triggers
- ✅ Quota check triggers
- ✅ Functions that enforce subscription rules

**Result:**
- ✅ Database blocks listing creation without subscription
- ✅ Quota limits enforced at database level
- ✅ Paid mode fully active

**Safe to run:** Yes - Can be reversed anytime

---

## Verification

### After Disabling Subscriptions:

**Test in Supabase SQL Editor:**
```sql
-- Check if triggers are removed
SELECT
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%quota%'
   OR trigger_name LIKE '%subscription%';

-- Should return 0 rows or empty result
```

**Test in App:**
- Sign up as new user
- Try creating a property listing
- Should work without "Active subscription required" error ✅

---

### After Enabling Subscriptions:

**Test in Supabase SQL Editor:**
```sql
-- Check if triggers are active
SELECT
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%quota%'
   OR trigger_name LIKE '%subscription%';

-- Should show multiple triggers
```

**Test in App:**
- Sign up as new user (without subscription)
- Try creating a property listing
- Should get error: "Active subscription required" ✅

---

## Complete Toggle Checklist

### Switching to FREE ACCESS MODE

- [ ] Set `ENABLE_SUBSCRIPTIONS: false` in `lib/featureFlags.ts`
- [ ] Deploy frontend changes
- [ ] Run `disable_subscription_enforcement.sql` in Supabase
- [ ] Test: New user can create listings without subscription
- [ ] Verify: No subscription UI elements visible
- [ ] Verify: Dashboard accessible to all users

### Switching to PAID SUBSCRIPTION MODE

- [ ] Set `ENABLE_SUBSCRIPTIONS: true` in `lib/featureFlags.ts`
- [ ] Deploy frontend changes
- [ ] Run `enable_subscription_enforcement.sql` in Supabase
- [ ] Test: New user sees "Subscription Required" error
- [ ] Verify: Subscription UI elements visible
- [ ] Verify: Dashboard requires subscription
- [ ] Verify: Account Status visible in Edit Profile

---

## Troubleshooting

### Error: "Active subscription required to create listings"

**Cause:** Database triggers are still active

**Solution:**
1. Run `disable_subscription_enforcement.sql` in Supabase SQL Editor
2. Verify triggers are removed (see Verification section)
3. Try creating listing again

---

### Error: "relation does not exist" when running migration

**Cause:** Some tables mentioned in migration don't exist in your database

**Solution:**
1. Check which tables you actually have
2. Comment out trigger creation for non-existent tables
3. Common tables to keep:
   - `rental_properties`
   - `marketplace_items`
   - `electronics`, `fashion`, `cosmetics`, etc.

---

### Listings still blocked even after disabling

**Possible causes:**
1. ❌ Migration didn't run successfully
2. ❌ Frontend still has `ENABLE_SUBSCRIPTIONS: true`
3. ❌ App cache not cleared

**Solution:**
1. Re-run `disable_subscription_enforcement.sql`
2. Verify `ENABLE_SUBSCRIPTIONS: false` in code
3. Clear app cache: `npx expo start --clear`
4. Rebuild app

---

## Migration Files Location

Both migration files are in:
```
migrations/
├── disable_subscription_enforcement.sql  ← For free access
└── enable_subscription_enforcement.sql   ← For paid mode
```

---

## Safety Notes

✅ **Safe Operations:**
- Switching between modes multiple times
- Running same migration multiple times (idempotent)
- Testing in development environment

⚠️ **Important:**
- Always test in development first
- Take database backup before major changes (optional but recommended)
- Coordinate database and frontend changes

---

## Summary

| Mode | Frontend Flag | Database Migration | Result |
|------|--------------|-------------------|---------|
| **Free Access** | `ENABLE_SUBSCRIPTIONS: false` | `disable_subscription_enforcement.sql` | Full free access |
| **Paid Mode** | `ENABLE_SUBSCRIPTIONS: true` | `enable_subscription_enforcement.sql` | Subscription required |

**Remember:** Both layers must match for consistent behavior!

---

## Quick Reference Commands

```bash
# Disable subscriptions (Free Access)
# 1. In code: ENABLE_SUBSCRIPTIONS = false
# 2. In Supabase: Run disable_subscription_enforcement.sql

# Enable subscriptions (Paid Mode)
# 1. In code: ENABLE_SUBSCRIPTIONS = true
# 2. In Supabase: Run enable_subscription_enforcement.sql

# Clear app cache
npx expo start --clear
```

---

**Last Updated:** 2025-10-09
**Version:** 1.0

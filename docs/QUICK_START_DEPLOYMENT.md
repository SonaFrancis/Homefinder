# Quick Start: Deploy to Production

This is a streamlined guide to get your app to production FAST. For complete details, see `PRODUCTION_CHECKLIST.md`.

## ⚡ Prerequisites (5 minutes)

1. **Create Expo Account**
   ```bash
   # Sign up at https://expo.dev
   npm install -g eas-cli
   eas login
   ```

2. **Production Supabase Project**
   - Go to https://supabase.com
   - Create NEW production project
   - Note: URL and anon key

3. **Update Environment Variables**
   - Copy your production Supabase URL and anon key
   - You'll set these during build

## 🚀 Deploy in 30 Minutes

### Step 1: Prepare Database (10 minutes)

1. **Run Migrations in Production Supabase:**
   - Go to Supabase SQL Editor
   - Run all your table creation migrations
   - Run `migrations/disable_subscription_enforcement.sql`

2. **Create Storage Buckets:**
   - property-images (public)
   - marketplace-images (public)
   - profile-pictures (public)

3. **Verify RLS Policies:**
   - Check that policies are enabled on all tables

### Step 2: Build the App (15 minutes)

```bash
# Configure EAS (first time only)
eas build:configure

# Build for Android (Google Play Store)
eas build --platform android --profile production

# Build for iOS (App Store) - if you have Apple Developer account
eas build --platform ios --profile production
```

**During build**, you'll be prompted for:
- Supabase URL (production)
- Supabase anon key (production)

Build takes 10-20 minutes. You'll get a download link when done.

### Step 3: Upload to Store (5 minutes)

#### Google Play Store

1. Go to https://play.google.com/console
2. Create new app "HomeFinder"
3. Upload the AAB file from EAS build
4. Fill in store listing:
   - Title: HomeFinder
   - Short description: "Find student housing & buy/sell items in Cameroon"
   - Add at least 2 screenshots from your phone
   - Add app icon (1024x1024)
5. Submit for review

#### Apple App Store

1. Go to https://appstoreconnect.apple.com
2. Create new app "HomeFinder"
3. Upload IPA from EAS build
4. Fill in app information
5. Submit for review

## 📱 Required Assets

Before submitting, you need:

### App Icon
- 1024x1024 PNG
- No transparency
- Export from `assets/icon.png` at this size

### Screenshots (minimum 2)
- Take screenshots on your phone
- Show key features:
  - Home screen with properties
  - Property details
  - Marketplace
  - Upload form
  - Profile

### Feature Graphic (Android only)
- 1024x500 PNG
- Create in Canva or similar tool

## 🔥 Fastest Path to Production

**If you just want to test on Google Play:**

```bash
# 1. Build
eas build --platform android --profile production

# 2. Download APK when build completes

# 3. Upload to Google Play Console

# Done! Submit for review.
```

Google Play review typically takes 1-3 days.

## 💡 Pro Tips

1. **Test First**: Build with `--profile preview` to test before production

2. **Store Listing**: You can submit with minimal info and update later

3. **Gradual Rollout**: On Google Play, release to 20% of users first

4. **Updates**: For minor updates, use OTA updates instead of new builds:
   ```bash
   eas update --branch production --message "Bug fixes"
   ```

## 📋 Minimum Store Listing

**What you MUST have:**
- [ ] App name
- [ ] Short description (80 chars)
- [ ] Full description (200+ words)
- [ ] At least 2 screenshots
- [ ] App icon (1024x1024)
- [ ] Privacy policy URL
- [ ] Category selection
- [ ] Content rating

**Privacy Policy:** Use the template in `docs/PRIVACY_POLICY_TEMPLATE.md`, host it on a simple website or GitHub Pages.

## 🎯 Launch Day Checklist

- [ ] Production database is ready
- [ ] App builds successfully
- [ ] Tested on real device
- [ ] Store listing complete
- [ ] Privacy policy published
- [ ] Support email set up (e.g., support@homefinder.com)
- [ ] Ready to monitor reviews and feedback

## 🆘 Common Issues

**Build fails?**
```bash
# Clear cache and try again
eas build --clear-cache --platform android
```

**Environment variables?**
- Make sure you entered production Supabase URL and key during build
- Check they match your production project

**Can't upload to store?**
- Verify you have developer account ($25 one-time for Google, $99/year for Apple)
- Check bundle ID matches your registered app

## 📞 Need Help?

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- Expo Discord: https://chat.expo.dev
- Check `PRODUCTION_CHECKLIST.md` for detailed steps

---

**You've got this! 🚀**

The first deployment is the hardest. After that, updates are super easy with EAS.

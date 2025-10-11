# Production Deployment Checklist

This comprehensive guide will help you prepare and deploy your HomeFinder app to production.

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration

#### ✅ Supabase Configuration
- [ ] **Production Supabase Project Created**
  - Create a new production project at https://supabase.com
  - Note down the production URL and anon key

- [ ] **Database Migration**
  - [ ] Run all migrations in production database
  - [ ] Run `migrations/disable_subscription_enforcement.sql` (since ENABLE_SUBSCRIPTIONS = false)
  - [ ] Verify all tables exist
  - [ ] Check RLS policies are enabled

- [ ] **Storage Buckets Setup**
  - [ ] Create `property-images` bucket (public)
  - [ ] Create `marketplace-images` bucket (public)
  - [ ] Create `profile-pictures` bucket (public)
  - [ ] Set up storage policies

- [ ] **Environment Variables**
  - [ ] Update `.env` with production Supabase URL
  - [ ] Update `.env` with production Supabase anon key
  - [ ] Remove any development/testing credentials

#### ✅ App Configuration
- [ ] **app.json Updates**
  ```json
  {
    "expo": {
      "name": "HomeFinder",
      "slug": "homefinder",
      "version": "1.0.0",
      "orientation": "portrait",
      "icon": "./assets/icon.png",
      "scheme": "homefinder",
      "userInterfaceStyle": "automatic",
      "splash": {
        "image": "./assets/splash.png",
        "resizeMode": "contain",
        "backgroundColor": "#10B981"
      },
      "ios": {
        "supportsTablet": true,
        "bundleIdentifier": "com.yourcompany.homefinder",
        "buildNumber": "1"
      },
      "android": {
        "adaptiveIcon": {
          "foregroundImage": "./assets/adaptive-icon.png",
          "backgroundColor": "#10B981"
        },
        "package": "com.yourcompany.homefinder",
        "versionCode": 1,
        "permissions": [
          "CAMERA",
          "READ_EXTERNAL_STORAGE",
          "WRITE_EXTERNAL_STORAGE"
        ]
      }
    }
  }
  ```

- [ ] **Update Bundle Identifiers**
  - iOS: `com.yourcompany.homefinder` → Replace with your actual company/developer name
  - Android: `com.yourcompany.homefinder` → Replace with your actual company/developer name

### 2. Code Quality & Testing

- [ ] **Remove Debug Code**
  - [ ] Remove all console.log statements (or replace with proper logging)
  - [ ] Remove __DEV__ debug blocks
  - [ ] Check for hardcoded test data

- [ ] **Test All Features**
  - [ ] User registration & login
  - [ ] Profile editing (with phone validation)
  - [ ] Upload rental property (with images/videos)
  - [ ] Upload marketplace items (all categories)
  - [ ] Edit listings
  - [ ] Delete listings
  - [ ] WhatsApp contact buttons
  - [ ] Search & filters
  - [ ] Notifications

- [ ] **Test on Real Devices**
  - [ ] Test on real Android device
  - [ ] Test on real iOS device
  - [ ] Test different screen sizes
  - [ ] Test with slow network
  - [ ] Test offline behavior

### 3. Performance Optimization

- [ ] **Image Optimization**
  - [ ] Compress app icon and splash screen
  - [ ] Ensure images are optimized for mobile
  - [ ] Check image loading performance

- [ ] **Code Optimization**
  - [ ] Review and optimize heavy components
  - [ ] Check for memory leaks
  - [ ] Verify FlatList performance with large datasets

### 4. Security Review

- [ ] **API Keys & Secrets**
  - [ ] Never commit `.env` file to git
  - [ ] Ensure Supabase RLS policies are properly configured
  - [ ] Verify authentication flows are secure

- [ ] **Data Validation**
  - [ ] Phone number validation is working
  - [ ] Form validation on all inputs
  - [ ] Server-side validation in Supabase

### 5. Legal & Compliance

- [ ] **Privacy Policy**
  - [ ] Create privacy policy document
  - [ ] Add privacy policy link in app
  - [ ] Explain data collection and usage

- [ ] **Terms of Service**
  - [ ] Create terms of service document
  - [ ] Add terms link in app
  - [ ] Define user responsibilities

- [ ] **App Store Requirements**
  - [ ] Prepare app description (max 4000 chars for Google Play, 170 chars for iOS)
  - [ ] Create promotional text
  - [ ] Prepare screenshots (see requirements below)
  - [ ] Create app icon (1024x1024 PNG)

## 🚀 Build & Deployment Steps

### Step 1: Update App Configuration

1. **Update app.json with production values:**
   ```bash
   # Update version number, bundle IDs, etc.
   ```

2. **Update environment variables:**
   ```bash
   # Create .env.production
   EXPO_PUBLIC_SUPABASE_URL=your_production_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_key
   ```

### Step 2: Build the App

#### For Android (Google Play Store)

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS build
eas build:configure

# Build for Android production
eas build --platform android --profile production
```

**Build Configuration (eas.json):**
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  }
}
```

#### For iOS (App Store)

```bash
# Build for iOS production
eas build --platform ios --profile production

# You'll need:
# - Apple Developer account ($99/year)
# - Distribution certificate
# - Provisioning profile
```

### Step 3: Prepare Store Assets

#### Required Screenshots

**Android (Google Play):**
- At least 2 screenshots
- Recommended: 8 screenshots showing key features
- Phone: 1080 x 1920 (or 1080 x 2340 for newer devices)
- Tablet (optional): 2048 x 2732

**iOS (App Store):**
- 6.5" iPhone: 1242 x 2688 (required)
- 5.5" iPhone: 1242 x 2208 (required)
- iPad Pro 12.9": 2048 x 2732 (recommended)

#### App Icon Requirements
- **iOS**: 1024 x 1024 PNG (no alpha channel)
- **Android**: Adaptive icon with foreground and background layers

#### Feature Graphic (Android only)
- 1024 x 500 PNG or JPEG
- Showcases your app prominently

### Step 4: Upload to Stores

#### Google Play Store

1. **Create Release:**
   - Go to Google Play Console
   - Create new release
   - Upload AAB file from EAS build

2. **Complete Store Listing:**
   - App name: HomeFinder
   - Short description (80 chars): "Find student housing & buy/sell items in Cameroon"
   - Full description (4000 chars): See template below
   - Screenshots (at least 2)
   - Feature graphic
   - App icon
   - Category: House & Home or Lifestyle
   - Content rating
   - Privacy policy URL

3. **Set Pricing:**
   - Free app (since subscriptions are disabled)
   - Select countries/regions

4. **Submit for Review**

#### Apple App Store

1. **Create App in App Store Connect:**
   - Go to appstoreconnect.apple.com
   - Create new app
   - Fill in app information

2. **Upload Build:**
   - Use EAS build or Xcode
   - Upload IPA to App Store Connect

3. **Complete App Information:**
   - App name: HomeFinder
   - Subtitle (30 chars): "Student Housing & Marketplace"
   - Description (4000 chars)
   - Keywords (100 chars): "housing,rental,marketplace,student,cameroon"
   - Screenshots
   - App icon
   - Privacy policy URL
   - Support URL

4. **Submit for Review**

## 📝 Store Listing Templates

### App Description (Google Play & App Store)

```
HomeFinder - Your Complete Student Housing & Marketplace Solution

🏠 FIND YOUR PERFECT HOME
Browse verified student-friendly rental properties in Cameroon. Filter by location, price, bedrooms, amenities, and more.

✨ KEY FEATURES

RENTAL PROPERTIES:
• Browse thousands of verified listings
• Advanced search with filters (city, price, bedrooms, amenities)
• High-quality photos and detailed descriptions
• Direct WhatsApp contact with landlords
• Save favorite properties
• Real-time notifications

MARKETPLACE:
• Buy and sell items across multiple categories
  - Electronics
  - Fashion & Accessories
  - Cosmetics & Beauty
  - House Items & Furniture
  - Cars & Vehicles
  - Properties for Sale
  - Business Listings

USER FEATURES:
• Easy registration and profile management
• Upload unlimited listings (free during beta)
• Manage your properties and items
• Track views and engagement
• Secure and verified platform

📱 EASY TO USE
Simple, intuitive interface designed for students. Find housing or sell items in minutes!

🔒 SAFE & SECURE
All listings are verified. Contact sellers directly through WhatsApp with confidence.

🌟 WHY CHOOSE HOMEFINDER?
• Largest database of student housing in Cameroon
• Free to use during beta period
• Fast, reliable, and user-friendly
• Local support team
• Regular updates and new features

Perfect for:
✓ Students looking for accommodation
✓ Landlords wanting to list properties
✓ Anyone buying or selling items

Download HomeFinder today and find your next home or make your next sale!

---

SUPPORT
Need help? Contact us at support@homefinder.com

PRIVACY
We respect your privacy. Read our privacy policy at: [YOUR_PRIVACY_URL]
```

### Short Description (80 characters - Google Play)

```
Find student housing & buy/sell items in Cameroon - Fast, Free & Easy!
```

### Promotional Text (170 characters - iOS)

```
🏠 Find your perfect student home in Cameroon! Browse verified rentals, buy/sell items across categories. Free during beta. Download now! 🚀
```

## 🔧 Post-Deployment Tasks

### Monitoring & Analytics

- [ ] **Set up Analytics**
  - [ ] Google Analytics or Firebase Analytics
  - [ ] Track key user actions
  - [ ] Monitor crash reports

- [ ] **Set up Error Tracking**
  - [ ] Sentry or similar service
  - [ ] Monitor production errors
  - [ ] Set up alerts

- [ ] **Monitor Database**
  - [ ] Watch Supabase dashboard for errors
  - [ ] Monitor storage usage
  - [ ] Track API usage

### User Support

- [ ] **Create Support Channels**
  - [ ] Support email: support@homefinder.com
  - [ ] FAQ document
  - [ ] In-app help section

- [ ] **Prepare for User Feedback**
  - [ ] Monitor app store reviews
  - [ ] Respond to user inquiries
  - [ ] Create feedback collection system

### Updates & Maintenance

- [ ] **Plan Regular Updates**
  - [ ] Bug fixes based on user feedback
  - [ ] Performance improvements
  - [ ] New feature rollout plan

- [ ] **Version Control**
  - [ ] Tag release in git: `git tag v1.0.0`
  - [ ] Document changes in CHANGELOG.md
  - [ ] Keep track of version numbers

## 🎯 Launch Strategy

### Soft Launch (Recommended)

1. **Week 1-2: Limited Release**
   - Release to 100-500 users
   - Collect feedback
   - Fix critical bugs

2. **Week 3-4: Gradual Rollout**
   - Expand to more users
   - Monitor performance
   - Optimize based on real usage

3. **Week 5+: Full Launch**
   - Public announcement
   - Marketing campaign
   - Social media promotion

### Marketing Ideas

- [ ] Social media presence (Facebook, Instagram, Twitter)
- [ ] University partnerships
- [ ] Student ambassador program
- [ ] Referral program
- [ ] Local advertising
- [ ] Press release

## 📞 Emergency Contacts & Resources

**Expo Documentation:**
- EAS Build: https://docs.expo.dev/build/introduction/
- App Stores: https://docs.expo.dev/distribution/introduction/

**Store Developer Consoles:**
- Google Play: https://play.google.com/console
- App Store Connect: https://appstoreconnect.apple.com

**Supabase:**
- Dashboard: https://supabase.com/dashboard
- Documentation: https://supabase.com/docs

## ✅ Final Pre-Launch Checklist

- [ ] All features tested on real devices (iOS & Android)
- [ ] Production environment configured
- [ ] Database migrations run successfully
- [ ] Storage buckets created and configured
- [ ] App builds successfully (Android & iOS)
- [ ] Store listings complete with all required assets
- [ ] Privacy policy and terms of service published
- [ ] Support email set up and monitored
- [ ] Analytics and error tracking configured
- [ ] Backup and recovery plan in place
- [ ] Team briefed on launch day procedures

## 🎉 You're Ready to Launch!

Once all items above are checked, you're ready to submit your app to the stores!

**Expected Review Times:**
- Google Play: 1-3 days
- Apple App Store: 1-7 days

**Good luck with your launch! 🚀**

---

**Questions or Issues?**
Review this checklist regularly and update it as your app evolves.

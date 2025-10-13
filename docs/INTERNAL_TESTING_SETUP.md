# Internal Testing Setup Guide

## Why Use Internal Testing?

Internal testing allows you to test your app through the Google Play Store before releasing it to the public. This ensures:

- The app installs correctly from the Play Store
- Subscriptions and payments work properly
- All features work in a production environment
- You can catch any last-minute bugs

**Recommendation**: Test for 1-2 days with 5-10 trusted users before going to production.

---

## Step-by-Step Setup

### 1. Access Internal Testing

1. Go to https://play.google.com/console
2. Select your HomeFinder app
3. In the left sidebar, under "Release" section, click **"Internal testing"**

### 2. Create Internal Test Release

1. Click **"Create new release"**
2. Upload your AAB file:
   - Download from: https://expo.dev/artifacts/eas/weX453XtJEAb8RAvPKSAwy.aab
3. **Release name**: v1.0.0 - Internal Test
4. **Release notes** (for testers):
   ```
   Internal test build for HomeFinder v1.0.0

   Please test:
   - Sign up and login
   - Browse rental properties
   - Create a property listing (upload photos)
   - Browse marketplace items
   - Create a marketplace listing
   - Test subscription flow (don't worry, test purchases are free)
   - Test notifications
   - Profile editing
   - Search and filters

   Report any bugs or issues you encounter!
   ```

5. Click **"Save"** and then **"Review release"**
6. Click **"Start rollout to Internal testing"**

### 3. Create Tester List

1. Click on **"Testers"** tab in Internal testing
2. Click **"Create email list"**
3. **List name**: HomeFinder Internal Testers
4. Add tester email addresses (Gmail accounts):
   - Add one email per line
   - Maximum 100 testers for internal testing
   - Testers must have a Google account

Example testers to add:
```
tester1@gmail.com
tester2@gmail.com
your.email@gmail.com
friend@gmail.com
```

5. Click **"Save changes"**

### 4. Copy Tester Link

1. After creating the release and adding testers, you'll see a **"Copy link"** button
2. Copy the testing link (looks like):
   ```
   https://play.google.com/apps/internaltest/[YOUR_APP_ID]
   ```

3. Share this link with your testers via:
   - Email
   - WhatsApp
   - Telegram
   - Any messaging platform

### 5. Testers Join and Install

**Instructions for testers**:

1. Click the testing link you received
2. Sign in with your Google account (must be the same email that was added as a tester)
3. Click **"Become a tester"** or **"Accept invitation"**
4. You'll be redirected to the Play Store
5. Click **"Install"** to download the app
6. Open the app and start testing!

**Note**: It may take 10-15 minutes after creating the release before testers can install the app.

---

## What to Test

### Critical Flows to Test:

#### 1. Authentication
- [ ] Sign up with new account
- [ ] Login with existing account
- [ ] Logout
- [ ] Profile creation

#### 2. Property Listings
- [ ] Browse properties
- [ ] View property details
- [ ] Search properties
- [ ] Filter by price, location, rooms
- [ ] Create new property listing
- [ ] Upload 5 photos to listing
- [ ] Edit existing listing
- [ ] Delete listing

#### 3. Marketplace
- [ ] Browse marketplace items
- [ ] View item details
- [ ] Search items
- [ ] Create new item listing
- [ ] Upload 5 photos to item
- [ ] Edit existing item
- [ ] Delete item

#### 4. Dashboard
- [ ] View dashboard analytics
- [ ] See listing statistics
- [ ] Navigate between tabs (Properties, Sales, Analytics)

#### 5. Subscriptions (IMPORTANT)
- [ ] View subscription plans
- [ ] Click "Upgrade" on Standard plan
- [ ] Go through test purchase flow (won't charge real money)
- [ ] Cancel test purchase
- [ ] Verify free plan limits work (1 post per month)

#### 6. Notifications
- [ ] Receive notification when someone views listing
- [ ] Tap notification to open app
- [ ] Mark notifications as read

#### 7. Profile & Settings
- [ ] View profile
- [ ] Edit profile information
- [ ] Upload profile picture
- [ ] View subscription status

#### 8. Performance
- [ ] App loads quickly
- [ ] Images load properly
- [ ] No crashes or freezes
- [ ] Back button works correctly
- [ ] Navigation is smooth

---

## Testing Subscriptions (Test Mode)

When testing subscriptions in internal testing:

- **Test purchases are FREE** - no real money is charged
- Test subscriptions expire quickly (5 minutes for weekly, 5 minutes for monthly)
- You can test the purchase flow multiple times
- Use a real Google account (your own test account)

**To test subscriptions**:

1. Open the app
2. Go to Profile > Subscription
3. Tap "Upgrade to Standard" or "Upgrade to Premium"
4. Complete the test purchase flow
5. Verify that:
   - Subscription status updates in the app
   - You can now post more listings
   - Dashboard shows correct plan

6. After 5 minutes, the test subscription expires automatically
7. You can test again with a different plan

---

## Collecting Feedback

### Create a Feedback Form

Use Google Forms or similar to collect structured feedback:

**Sample questions**:

1. What device did you test on? (Brand and model)
2. Did you encounter any bugs or crashes? If yes, please describe.
3. Was the signup/login process easy?
4. Were you able to create a listing successfully?
5. Did photo uploads work properly?
6. Did notifications work correctly?
7. Was the app easy to navigate?
8. On a scale of 1-10, how would you rate the app?
9. Any features you'd like to see added?
10. Any other comments or suggestions?

Share the form link with your testers along with the app link.

---

## Common Issues and Solutions

### Testers Can't Access the App

**Problem**: Tester clicks link but sees "App not available"

**Solutions**:
- Verify the tester's email is added to the tester list
- Tester must use the same Google account that was added
- Wait 10-15 minutes after creating the release
- Tester may need to sign out and back into Play Store

### App Won't Install

**Problem**: Installation fails or gets stuck

**Solutions**:
- Clear Google Play Store cache
- Restart device
- Ensure device has enough storage (at least 200MB free)
- Check that device is Android 5.0 or higher

### Subscription Test Doesn't Work

**Problem**: Can't test subscription purchase

**Solutions**:
- Ensure you're using internal testing (not production)
- Device must have Google Play Services installed
- Must be signed in with a Google account
- Try with a different Google account

### Upload Fails

**Problem**: Photos or videos don't upload

**Solutions**:
- Check internet connection
- Verify camera/storage permissions are granted
- Try with smaller photo files
- Check that file format is supported (JPG, PNG)

---

## Timeline and Next Steps

### Recommended Testing Timeline:

**Day 0** (Today):
- [ ] Set up internal testing track
- [ ] Upload AAB file
- [ ] Add testers
- [ ] Share testing link

**Day 1**:
- [ ] Testers install and test
- [ ] Monitor for crash reports
- [ ] Collect feedback

**Day 2**:
- [ ] Review all feedback
- [ ] Fix any critical bugs
- [ ] Build new version if needed (v1.0.1)

**Day 3**:
- [ ] Final testing round
- [ ] Prepare for production release

**Day 4**:
- [ ] Submit to production
- [ ] Celebrate! 🎉

---

## Moving to Production

Once internal testing is successful:

1. Go to **"Production"** in the left sidebar
2. Click **"Create new release"**
3. Upload the **same AAB file** you tested (or a new one if you fixed bugs)
4. Fill in the release notes
5. Complete the store listing (use docs/GOOGLE_PLAY_STORE_LISTING.md)
6. Click **"Review release"**
7. Click **"Start rollout to Production"**

**Review time**: Google typically reviews in 1-7 days for first release.

---

## Monitoring After Release

Once in production, monitor:

1. **Crash-free rate** (aim for 99%+)
   - Found in: Play Console > Dashboard > "Vitals"

2. **User reviews**
   - Respond to reviews within 24 hours
   - Address negative feedback

3. **Installation metrics**
   - Track daily installs
   - Monitor uninstall rate

4. **ANR (App Not Responding) rate**
   - Should be under 0.5%

5. **User retention**
   - Day 1, Day 7, Day 30 retention rates

---

## Advanced: Closed Testing (Beta)

After internal testing, consider a **closed beta** before full production:

1. Go to **"Closed testing"** in Play Console
2. Create a new track (e.g., "Beta")
3. Add 50-100 beta testers
4. Get feedback from a larger group
5. Iterate based on feedback
6. Then push to production

**Benefits**:
- Larger test group
- More diverse devices
- More comprehensive feedback
- Lower risk for production release

---

## Support Resources

**Expo Documentation**:
- https://docs.expo.dev/build/introduction/
- https://docs.expo.dev/submit/android/

**Google Play Console Help**:
- https://support.google.com/googleplay/android-developer/
- https://play.google.com/console/about/guides/releasewithconfidence/

**Testing Best Practices**:
- https://developer.android.com/distribute/best-practices/launch/test-tracks

---

## Quick Reference: Internal Testing Commands

**Check build status**:
```bash
npx eas build:list --platform android
```

**Download specific build**:
```bash
npx eas build:download --platform android --id [BUILD_ID]
```

**Create new build**:
```bash
npx eas build --platform android --profile production
```

**View build logs**:
```bash
npx eas build:view --platform android
```

---

**Ready to start testing? Let's go! 🚀**

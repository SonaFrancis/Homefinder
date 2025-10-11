# Quick Deployment Commands

## Prerequisites

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Configure EAS (first time only)
eas build:configure
```

## Development Builds

```bash
# Build APK for Android testing
eas build --platform android --profile preview

# Build for iOS simulator (Mac only)
eas build --platform ios --profile preview
```

## Production Builds

```bash
# Build Android App Bundle (for Google Play)
eas build --platform android --profile production

# Build iOS App (for App Store)
eas build --platform ios --profile production

# Build both platforms
eas build --platform all --profile production
```

## Check Build Status

```bash
# View all builds
eas build:list

# View specific build
eas build:view [BUILD_ID]
```

## Submit to Stores

```bash
# Submit to Google Play (after configuring eas.json)
eas submit --platform android

# Submit to App Store (after configuring eas.json)
eas submit --platform ios
```

## Update App (OTA Updates - For minor changes)

```bash
# Publish update to production
eas update --branch production --message "Bug fixes and improvements"

# View all updates
eas update:list
```

## Version Management

Before building a new version:

1. Update version in `app.json`:
   ```json
   {
     "expo": {
       "version": "1.0.1",
       "android": {
         "versionCode": 2
       },
       "ios": {
         "buildNumber": "2"
       }
     }
   }
   ```

2. Commit changes:
   ```bash
   git add app.json
   git commit -m "Bump version to 1.0.1"
   git tag v1.0.1
   git push origin main --tags
   ```

3. Build:
   ```bash
   eas build --platform all --profile production
   ```

## Environment Variables

```bash
# Set secret environment variables (don't put in .env)
eas secret:create --scope project --name SUPABASE_SERVICE_ROLE_KEY --value your-secret-key

# List secrets
eas secret:list

# Delete secret
eas secret:delete --name SUPABASE_SERVICE_ROLE_KEY
```

## Troubleshooting

```bash
# Clear build cache
eas build --clear-cache

# View build logs
eas build:view [BUILD_ID]

# Cancel build
eas build:cancel [BUILD_ID]
```

## Useful Links

- EAS Build Documentation: https://docs.expo.dev/build/introduction/
- EAS Submit Documentation: https://docs.expo.dev/submit/introduction/
- EAS Update Documentation: https://docs.expo.dev/eas-update/introduction/

## Build Times

Typical build times:
- Android: 10-20 minutes
- iOS: 15-30 minutes

## Notes

- First build takes longer (cache is being created)
- You can have multiple builds running in parallel
- Builds are stored in Expo for 30 days
- Download builds from Expo dashboard or CLI

# Authentication & Session Persistence Guide

## Overview

This app implements **production-grade persistent authentication** similar to Airbnb and Property Finder, where users sign in once and remain authenticated across app restarts until they explicitly log out.

## Architecture

### 1. **Secure Token Storage**

#### Platform-Specific Storage
- **iOS/Android**: `expo-secure-store` - Hardware-backed keychain/keystore
- **Web**: `localStorage` - Browser storage with fallback

```typescript
// lib/supabase.ts
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key); // Encrypted storage
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value); // Encrypted storage
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};
```

**What Gets Stored:**
- Access Token (JWT)
- Refresh Token (for automatic token renewal)
- Session metadata

**Security Features:**
- Tokens are encrypted at rest (iOS Keychain, Android Keystore)
- Automatic token rotation
- PKCE flow for enhanced security

### 2. **Session Management**

#### Supabase Client Configuration

```typescript
// lib/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter, // Custom secure storage
    autoRefreshToken: true,           // Auto-refresh before expiry
    persistSession: true,             // Save session across app restarts
    detectSessionInUrl: false,        // Not needed for mobile
    flowType: 'pkce',                 // More secure auth flow
    debug: __DEV__,                   // Debug logs in development
  },
});
```

#### Token Refresh Strategy

- **Access Token**: Valid for 1 hour
- **Refresh Token**: Valid for 30 days (configurable in Supabase)
- **Auto-Refresh**: Happens automatically 5 minutes before expiry
- **Manual Refresh**: Triggered on app focus/resume

### 3. **Authentication Store (Zustand)**

#### Store Structure

```typescript
interface AuthState {
  // Session Data
  session: Session | null;           // Supabase session
  user: User | null;                 // User object from session
  profile: Profile | null;           // User profile from database
  subscription: UserSubscription | null; // User subscription data

  // State Flags
  loading: boolean;                  // Loading during initialization
  initialized: boolean;              // Has initialization completed?

  // Actions
  initialize: () => Promise<void>;   // Initialize auth on app start
  signOut: () => Promise<void>;      // Sign out and clear session
  setSession: (session) => void;     // Update session
  fetchProfile: () => Promise<void>; // Load user profile
  fetchSubscription: () => Promise<void>; // Load subscription
  handleAuthError: (error) => Promise<void>; // Handle auth errors
}
```

#### Initialization Flow

```typescript
// store/authStore.ts
initialize: async () => {
  console.log('[Auth] Initializing authentication...');

  // Step 1: Try to recover existing session from SecureStore
  const { data: { session }, error } = await supabase.auth.getSession();

  if (session) {
    console.log('[Auth] Session recovered successfully');
    // Load user profile and subscription in parallel
    await Promise.all([
      fetchProfile(),
      fetchSubscription(),
    ]);
  }

  // Step 2: Set up auth state listener for real-time updates
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      // Auto-navigate to home
      router.replace('/(tabs)');
    } else if (event === 'SIGNED_OUT') {
      // Auto-navigate to login
      router.replace('/(auth)/login');
    } else if (event === 'TOKEN_REFRESHED') {
      // Update session silently
      setSession(session);
    }
  });
}
```

### 4. **App Startup Flow**

#### Root Layout (_layout.tsx)

```
┌─────────────────────────────────────┐
│         App Launch                  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Show Loading Screen               │
│   (Logo + Spinner)                  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Initialize Auth Store             │
│   - Check SecureStore               │
│   - Recover session if exists       │
│   - Load user profile               │
└──────────┬──────────────────────────┘
           │
           ▼
     ┌────┴────┐
     │ Session │
     │ Exists? │
     └────┬────┘
          │
    ┌─────┼─────┐
    │           │
   YES         NO
    │           │
    ▼           ▼
┌───────┐   ┌───────┐
│ Home  │   │ Login │
│ Screen│   │ Screen│
└───────┘   └───────┘
```

**Code Implementation:**

```typescript
// app/_layout.tsx
export default function RootLayout() {
  const { session, initialized, loading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Initialize on mount
    initialize();
  }, []);

  useEffect(() => {
    if (!initialized) return; // Wait for initialization

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Not logged in → redirect to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Logged in but on auth screen → redirect to home
      router.replace('/(tabs)');
    }
  }, [session, segments, initialized]);

  // Show loading screen during initialization
  if (!initialized || loading) {
    return <LoadingScreen />;
  }

  return <NavigationStack />;
}
```

## Usage Examples

### 1. Sign In

```typescript
// app/(auth)/login.tsx
const handleLogin = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    Alert.alert('Login Failed', error.message);
    return;
  }

  // ✅ Session is automatically saved to SecureStore
  // ✅ User is automatically redirected to /(tabs) by auth state listener
  // ✅ No manual navigation needed!
};
```

### 2. Sign Out

```typescript
// Anywhere in the app
const { signOut } = useAuthStore();

const handleSignOut = async () => {
  await signOut();
  // ✅ Session cleared from SecureStore
  // ✅ User automatically redirected to login by auth state listener
};
```

### 3. Check Authentication

```typescript
// Protected screen
const { session, profile } = useAuthStore();

if (!session) {
  return <Redirect href="/(auth)/login" />;
}

return <ProtectedContent user={profile} />;
```

### 4. Access User Data

```typescript
const { session, user, profile, subscription } = useAuthStore();

// Session data
console.log(session?.access_token);
console.log(session?.expires_at);

// User data
console.log(user?.email);
console.log(user?.id);

// Profile data
console.log(profile?.full_name);
console.log(profile?.role);

// Subscription data
console.log(subscription?.status);
console.log(subscription?.plan_id);
```

## Error Handling

### Expired/Invalid Tokens

The auth store automatically handles expired or invalid tokens:

```typescript
handleAuthError: async (error) => {
  // Check for auth-related errors
  if (
    error?.message?.includes('Refresh Token') ||
    error?.message?.includes('Invalid Refresh Token') ||
    error?.status === 401
  ) {
    console.warn('[Auth] Session expired, signing out');
    await signOut();
    router.replace('/(auth)/login');
  }
};
```

**When This Triggers:**
- Refresh token expires (after 30 days of inactivity)
- Token is manually revoked
- Session is invalidated server-side
- User signs in on another device (if configured)

### Network Errors

```typescript
// Supabase automatically retries failed token refresh attempts
// If all retries fail, onAuthStateChange fires 'SIGNED_OUT' event
```

## Testing Scenarios

### ✅ First-Time User Flow

1. User opens app
2. No session exists → Shows login screen
3. User enters credentials → Signs in
4. Session saved to SecureStore
5. User redirected to home screen

### ✅ Returning User Flow

1. User opens app (after closing it)
2. Session recovered from SecureStore
3. Token is valid → User sees home screen immediately
4. If token expired → Auto-refresh happens
5. If refresh fails → User redirected to login

### ✅ Token Refresh Flow

1. User is actively using app
2. Access token expires (after 1 hour)
3. Supabase automatically uses refresh token
4. New access token obtained silently
5. User continues without interruption

### ✅ Sign Out Flow

1. User taps "Sign Out"
2. Session cleared from SecureStore
3. Store state reset to null
4. User redirected to login screen
5. Next app open requires re-authentication

### ✅ Multi-Device Scenario

User signs in on Device A, then Device B:

- **Default Behavior**: Both sessions remain valid
- **Optional**: Configure Supabase to revoke old sessions
- **Handled**: Auth error triggers re-login on Device A

## Best Practices

### ✅ DO

- **Use the auth store for all auth state**: Don't duplicate session state
- **Trust the automatic redirects**: Let the store handle navigation
- **Log auth events in development**: Use the console logs to debug
- **Handle loading states**: Show spinners during initialization
- **Test on real devices**: SecureStore behaves differently than simulators

### ❌ DON'T

- **Don't store tokens in AsyncStorage**: Use SecureStore (already configured)
- **Don't manually navigate after login**: The store handles it
- **Don't check session in every screen**: Use protected routes
- **Don't disable autoRefreshToken**: Keep it enabled for seamless UX
- **Don't ignore auth errors**: They indicate security issues

## Security Considerations

### 1. Token Storage

✅ **Secure**
- iOS: Hardware Keychain (AES-256 encryption)
- Android: Keystore (hardware-backed if available)

❌ **Insecure** (Don't use)
- AsyncStorage (unencrypted)
- Plain text files
- Redux persist without encryption

### 2. Token Transmission

✅ All requests use HTTPS
✅ Tokens sent in Authorization header
✅ PKCE flow prevents interception attacks

### 3. Token Expiry

- **Access Token**: Short-lived (1 hour) - limits damage if stolen
- **Refresh Token**: Long-lived (30 days) - stored securely
- **Automatic Rotation**: Reduces risk of token reuse

### 4. Biometric Authentication (Optional Enhancement)

```typescript
// Future: Add biometric authentication
import * as LocalAuthentication from 'expo-local-authentication';

const requireBiometricAuth = async () => {
  const { success } = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to continue',
  });

  if (!success) {
    await signOut();
  }
};
```

## Troubleshooting

### Session Not Persisting

**Problem**: User has to log in every time

**Solutions**:
1. Check if SecureStore is installed: `expo-secure-store`
2. Verify `persistSession: true` in Supabase config
3. Check for errors in initialization logs
4. Clear app data and test fresh install

### Automatic Logout

**Problem**: User gets logged out unexpectedly

**Solutions**:
1. Check refresh token expiry (default 30 days)
2. Look for auth errors in console
3. Verify network connectivity
4. Check if session was revoked server-side

### Slow App Startup

**Problem**: Loading screen shows too long

**Solutions**:
1. Use `Promise.all` for parallel data fetching ✅ (already done)
2. Implement skeleton screens
3. Cache profile data locally
4. Reduce initial data fetching

## Monitoring & Analytics

### Track Auth Events

```typescript
// Add to auth store
supabase.auth.onAuthStateChange((event, session) => {
  // Send to analytics
  analytics.track('auth_event', {
    event_type: event,
    user_id: session?.user.id,
    timestamp: new Date().toISOString(),
  });
});
```

### Metrics to Monitor

- **Session Recovery Rate**: % of app opens with valid session
- **Token Refresh Success Rate**: % of successful auto-refreshes
- **Average Session Duration**: Time between login and logout
- **Auth Error Rate**: % of auth-related errors

## Comparison with Other Apps

| Feature | Your App | Airbnb | Property Finder |
|---------|----------|---------|-----------------|
| Persistent Login | ✅ | ✅ | ✅ |
| Secure Token Storage | ✅ | ✅ | ✅ |
| Auto Token Refresh | ✅ | ✅ | ✅ |
| Biometric Auth | ❌ | ✅ | ✅ |
| Offline Session | ⚠️ | ✅ | ⚠️ |
| Multi-Device Sync | ⚠️ | ✅ | ✅ |

## Next Steps

### Enhancements

1. **Biometric Authentication**: Add Face ID/Touch ID for extra security
2. **Offline Support**: Cache profile data for offline access
3. **Session Management**: Show active sessions, revoke specific sessions
4. **Remember Me**: Optional checkbox for shorter session duration
5. **Two-Factor Authentication**: Add 2FA support

### Production Checklist

- [x] SecureStore configured for iOS/Android
- [x] autoRefreshToken enabled
- [x] persistSession enabled
- [x] PKCE flow enabled
- [x] Auth state listener set up
- [x] Error handling implemented
- [x] Loading states handled
- [x] Automatic redirects working
- [ ] Analytics tracking (optional)
- [ ] Biometric auth (optional)

## Support

For issues or questions about authentication:
1. Check console logs (look for `[Auth]` prefix)
2. Review this guide
3. Check Supabase dashboard for user sessions
4. Test on physical device (SecureStore behaves differently on simulators)

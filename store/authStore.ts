import { create } from 'zustand';
import { supabase, Profile, UserSubscription } from '@/lib/supabase';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  subscription: UserSubscription | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSubscription: (subscription: UserSubscription | null) => void;
  fetchProfile: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
  handleAuthError: (error: any) => Promise<void>;
  hasActiveSubscription: () => boolean;
  hasDashboardAccess: () => boolean;
  canPostListing: () => boolean;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  subscription: null,
  loading: true,
  initialized: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
    if (session?.user) {
      get().fetchProfile();
      get().fetchSubscription();
    } else {
      set({ profile: null, subscription: null });
    }
  },

  setProfile: (profile) => set({ profile }),

  setSubscription: (subscription) => set({ subscription }),

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile:', error);
        await get().handleAuthError(error);
        set({ profile: null });
        return;
      }

      set({ profile: data });
    } catch (error) {
      console.warn('Unexpected error fetching profile:', error);
      await get().handleAuthError(error);
      set({ profile: null });
    }
  },

  fetchSubscription: async () => {
    const { user } = get();
    if (!user) return;

    try {
      // Fetch the most recent subscription (active or expired)
      // This allows checking for grace period access
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        await get().handleAuthError(error);
        set({ subscription: null });
        return;
      }

      set({ subscription: data });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      await get().handleAuthError(error);
      set({ subscription: null });
    }
  },

  signOut: async () => {
    try {
      console.log('[Auth] Signing out user...');

      // Sign out from Supabase (this clears the session from SecureStore)
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[Auth] Error signing out:', error);
      }

      // Clear all auth state
      set({ session: null, user: null, profile: null, subscription: null });

      console.log('[Auth] User signed out successfully');
    } catch (error) {
      console.error('[Auth] Unexpected error during sign out:', error);
      // Still clear state even if sign out fails
      set({ session: null, user: null, profile: null, subscription: null });
    }
  },

  handleAuthError: async (error: any) => {
    // Check if error is related to refresh token
    if (
      error?.message?.includes('Refresh Token') ||
      error?.message?.includes('Invalid Refresh Token') ||
      error?.status === 401
    ) {
      console.warn('Auth session expired, signing out user');
      await get().signOut();

      // Redirect to login page
      try {
        router.replace('/(auth)/login');
      } catch (routerError) {
        console.warn('Router not available yet');
      }
    }
  },

  hasActiveSubscription: () => {
    // If subscriptions disabled, treat all users as having active subscription
    if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
      return true;
    }

    const { subscription } = get();
    if (!subscription) return false;

    return (
      subscription.status === 'active' &&
      subscription.end_date &&
      new Date(subscription.end_date) > new Date()
    );
  },

  hasDashboardAccess: () => {
    // If subscriptions disabled, grant access to all logged-in users
    if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
      return true;
    }

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

  canPostListing: () => {
    // If subscriptions disabled, allow posting
    if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
      return true;
    }

    const { subscription } = get();
    if (!subscription || !get().hasActiveSubscription()) return false;

    const plan = subscription.subscription_plans;
    if (!plan) return false;

    return subscription.listings_used < plan.max_listings;
  },

  initialize: async () => {
    set({ loading: true });

    try {
      console.log('[Auth] Initializing authentication...');

      // Step 1: Try to recover existing session from SecureStore
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('[Auth] Error getting session:', error.message);

        // If refresh token is invalid, clear it and start fresh
        if (error.message?.includes('Refresh Token')) {
          console.log('[Auth] Clearing invalid session');
          await supabase.auth.signOut();
          set({ session: null, user: null, profile: null, subscription: null });
        }
      } else if (session) {
        console.log('[Auth] Session recovered successfully, user:', session.user.email);
        set({ session, user: session.user });

        // Fetch user data in parallel for faster load
        try {
          await Promise.all([
            get().fetchProfile(),
            get().fetchSubscription(),
          ]);
          console.log('[Auth] User data loaded');
        } catch (dataError) {
          console.error('[Auth] Error loading user data:', dataError);
          // Continue anyway - user can still use the app
        }
      } else {
        console.log('[Auth] No existing session found');
      }

      // Step 2: Set up auth state listener for real-time updates
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[Auth] State change event:', event);

        if (event === 'SIGNED_OUT') {
          console.log('[Auth] User signed out');
          set({ session: null, user: null, profile: null, subscription: null });
          try {
            router.replace('/(auth)/login');
          } catch (routerError) {
            console.warn('[Auth] Router not available yet');
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('[Auth] Token refreshed successfully');
          get().setSession(session);
        } else if (event === 'SIGNED_IN') {
          console.log('[Auth] User signed in:', session?.user.email);
          get().setSession(session);

          // Wait for profile to load before navigating
          try {
            await Promise.all([
              get().fetchProfile(),
              get().fetchSubscription(),
            ]);
          } catch (dataError) {
            console.error('[Auth] Error loading user data:', dataError);
          }

          try {
            router.replace('/(tabs)');
          } catch (routerError) {
            console.warn('[Auth] Router not available yet');
          }
        } else if (event === 'USER_UPDATED') {
          console.log('[Auth] User data updated');
          get().setSession(session);
        }
      });

      set({ loading: false, initialized: true });
      console.log('[Auth] Initialization complete');
    } catch (error) {
      console.error('[Auth] Error initializing:', error);
      // Clear any corrupted session data
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.warn('[Auth] Error signing out during cleanup:', signOutError);
      }
      set({ session: null, user: null, profile: null, subscription: null, loading: false, initialized: true });
    }
  },
}));
// =====================================================
// USE SUBSCRIPTION SCENARIO HOOK
// =====================================================
// Checks user's subscription status across all 3 scenarios
// and provides permissions for creating listings/uploading media

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SubscriptionScenario } from '@/lib/subscriptionTypes';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

interface UseSubscriptionScenarioReturn {
  scenario: SubscriptionScenario | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  // Quick access permissions
  canCreateListing: boolean;
  canUploadMedia: boolean;
  canEditListing: boolean;
  listingsShouldBeLive: boolean;

  // Quota information
  listingsRemaining: number;
  imagesRemaining: number;
  videosRemaining: number;
  quotaPercentage: number;
}

export function useSubscriptionScenario(userId: string | undefined): UseSubscriptionScenarioReturn {
  const [scenario, setScenario] = useState<SubscriptionScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_user_subscription_scenario', { user_uuid: userId });

      if (rpcError) {
        throw rpcError;
      }

      if (data && data.length > 0) {
        setScenario(data[0] as SubscriptionScenario);
      } else {
        // No subscription found
        setScenario({
          scenario: 0,
          scenario_name: 'No Subscription',
          subscription_status: 'none',
          days_expired: 0,
          grace_days_remaining: 0,
          can_create_listings: false,
          can_upload_media: false,
          listings_should_be_live: false,
          can_edit_listings: false,
          dashboard_access: 'none',
          warning_message: 'Please subscribe to create listings',
          listings_used: 0,
          max_listings: 0,
          images_used: 0,
          image_quota: 0,
          videos_used: 0,
          video_quota: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching subscription scenario:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription status');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchScenario();
  }, [fetchScenario]);

  // Calculate quick access values
  const canCreateListing = scenario?.can_create_listings ?? false;
  const canUploadMedia = scenario?.can_upload_media ?? false;
  const canEditListing = scenario?.can_edit_listings ?? false;
  const listingsShouldBeLive = scenario?.listings_should_be_live ?? false;

  const listingsRemaining = scenario
    ? Math.max(0, scenario.max_listings - scenario.listings_used)
    : 0;

  const imagesRemaining = scenario
    ? Math.max(0, scenario.image_quota - scenario.images_used)
    : 0;

  const videosRemaining = scenario
    ? Math.max(0, scenario.video_quota - scenario.videos_used)
    : 0;

  const quotaPercentage = scenario && scenario.max_listings > 0
    ? Math.round((scenario.listings_used / scenario.max_listings) * 100)
    : 0;

  return {
    scenario,
    loading,
    error,
    refresh: fetchScenario,
    canCreateListing,
    canUploadMedia,
    canEditListing,
    listingsShouldBeLive,
    listingsRemaining,
    imagesRemaining,
    videosRemaining,
    quotaPercentage,
  };
}

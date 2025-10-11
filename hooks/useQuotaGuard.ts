// =====================================================
// USE QUOTA GUARD HOOK
// =====================================================
// Provides blocking functions with user-friendly alerts
// for listing creation and media uploads

import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SubscriptionScenario, getScenarioAlertTitle } from '@/lib/subscriptionTypes';

interface QuotaGuardOptions {
  scenario: SubscriptionScenario | null;
  onBlocked?: () => void;
}

export function useQuotaGuard({ scenario, onBlocked }: QuotaGuardOptions) {
  const router = useRouter();

  /**
   * Check if user can create a new listing
   * Shows appropriate alert if blocked
   * @returns true if allowed, false if blocked
   */
  const checkCanCreateListing = (): boolean => {
    if (!scenario) {
      Alert.alert(
        '⚠️ Unable to Verify',
        'Could not verify subscription status. Please try again.',
        [{ text: 'OK' }]
      );
      onBlocked?.();
      return false;
    }

    if (!scenario.can_create_listings) {
      const title = getScenarioAlertTitle(scenario.scenario);

      switch (scenario.scenario) {
        case 0: // No subscription
          Alert.alert(
            title,
            'Subscribe to start creating listings and reach thousands of potential customers!',
            [
              {
                text: 'View Plans',
                onPress: () => router.push('/subscription'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          break;

        case 1: // Active but quota exhausted
          Alert.alert(
            title,
            `You've used all ${scenario.max_listings} listings for this month.\n\n` +
            `Your quota will reset next month, or upgrade to Premium for ${scenario.max_listings === 10 ? '20' : 'unlimited'} listings.`,
            [
              {
                text: 'Upgrade to Premium',
                onPress: () => router.push('/subscription'),
              },
              { text: 'Wait for Reset', style: 'cancel' },
            ]
          );
          break;

        case 2: // Grace period with quota exhausted
          Alert.alert(
            title,
            `Your subscription expired ${scenario.days_expired} days ago and you've used all available quota.\n\n` +
            `Grace period: ${scenario.grace_days_remaining} days remaining.\n\n` +
            `Renew now to keep your listings active!`,
            [
              {
                text: 'Renew Now',
                onPress: () => router.push('/subscription'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          break;

        case 3: // Expired - grace ended
          Alert.alert(
            title,
            `Your subscription expired ${scenario.days_expired} days ago. All your listings have been deactivated.\n\n` +
            `Renew now to instantly restore all ${scenario.listings_used} listings!`,
            [
              {
                text: 'Renew & Restore',
                onPress: () => router.push('/subscription'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          break;
      }

      onBlocked?.();
      return false;
    }

    return true;
  };

  /**
   * Check if user can upload media (images/videos)
   * Shows appropriate alert if blocked
   * @param mediaType - 'image' or 'video'
   * @returns true if allowed, false if blocked
   */
  const checkCanUploadMedia = (mediaType: 'image' | 'video' = 'image'): boolean => {
    if (!scenario) {
      Alert.alert(
        '⚠️ Unable to Verify',
        'Could not verify subscription status. Please try again.',
        [{ text: 'OK' }]
      );
      onBlocked?.();
      return false;
    }

    if (!scenario.can_upload_media) {
      const isImage = mediaType === 'image';
      const used = isImage ? scenario.images_used : scenario.videos_used;
      const quota = isImage ? scenario.image_quota : scenario.video_quota;
      const mediaName = isImage ? 'image' : 'video';
      const title = getScenarioAlertTitle(scenario.scenario);

      switch (scenario.scenario) {
        case 0: // No subscription
          Alert.alert(
            title,
            `Subscribe to upload ${mediaName}s and showcase your listings!`,
            [
              {
                text: 'View Plans',
                onPress: () => router.push('/subscription'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          break;

        case 1: // Active but quota exhausted
          Alert.alert(
            title,
            `You've used all ${quota} ${mediaName} uploads for this month (${used}/${quota}).\n\n` +
            `Your quota will reset next month, or upgrade to Premium for more uploads.`,
            [
              {
                text: 'Upgrade Plan',
                onPress: () => router.push('/subscription'),
              },
              { text: 'Wait for Reset', style: 'cancel' },
            ]
          );
          break;

        case 2: // Grace period
          Alert.alert(
            title,
            `Your subscription expired ${scenario.days_expired} days ago and your ${mediaName} quota is exhausted.\n\n` +
            `Renew now to continue uploading!`,
            [
              {
                text: 'Renew Now',
                onPress: () => router.push('/subscription'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          break;

        case 3: // Expired - grace ended
          Alert.alert(
            title,
            `Your subscription expired ${scenario.days_expired} days ago.\n\n` +
            `Renew now to restore upload access!`,
            [
              {
                text: 'Renew Subscription',
                onPress: () => router.push('/subscription'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          break;
      }

      onBlocked?.();
      return false;
    }

    return true;
  };

  /**
   * Check if user can edit their listings
   * Shows appropriate alert if blocked
   * @returns true if allowed, false if blocked
   */
  const checkCanEditListing = (): boolean => {
    if (!scenario) {
      Alert.alert(
        '⚠️ Unable to Verify',
        'Could not verify subscription status. Please try again.',
        [{ text: 'OK' }]
      );
      onBlocked?.();
      return false;
    }

    if (!scenario.can_edit_listings) {
      Alert.alert(
        '❌ Subscription Expired',
        `Your subscription expired ${scenario.days_expired} days ago. You can no longer edit listings.\n\n` +
        `Renew now to restore full access!`,
        [
          {
            text: 'Renew Subscription',
            onPress: () => router.push('/subscription'),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );

      onBlocked?.();
      return false;
    }

    return true;
  };

  return {
    checkCanCreateListing,
    checkCanUploadMedia,
    checkCanEditListing,
  };
}

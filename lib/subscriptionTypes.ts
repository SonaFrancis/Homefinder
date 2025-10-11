// =====================================================
// SUBSCRIPTION SCENARIO TYPES
// =====================================================
// Matches the database function: get_user_subscription_scenario()

export interface SubscriptionScenario {
  scenario: number;
  scenario_name: string;
  subscription_status: string;
  days_expired: number;
  grace_days_remaining: number;
  can_create_listings: boolean;
  can_upload_media: boolean;
  listings_should_be_live: boolean;
  can_edit_listings: boolean;
  dashboard_access: 'full' | 'readonly' | 'none';
  warning_message: string;
  listings_used: number;
  max_listings: number;
  posts_used_this_month: number;
  max_posts_per_month: number;
  images_used: number;
  image_quota: number;
  videos_used: number;
  video_quota: number;
}

export type ScenarioType =
  | 0  // No subscription
  | 1  // Active subscription
  | 2  // Grace period (0-7 days expired)
  | 3; // Grace period ended (8+ days expired)

// Helper type guards
export const isScenario = {
  noSubscription: (scenario: number): boolean => scenario === 0,
  active: (scenario: number): boolean => scenario === 1,
  gracePeriod: (scenario: number): boolean => scenario === 2,
  expired: (scenario: number): boolean => scenario === 3,
};

// User-friendly scenario messages
export const getScenarioMessage = (status: SubscriptionScenario): string => {
  const postsUsed = status.posts_used_this_month ?? status.listings_used;
  const maxPosts = status.max_posts_per_month ?? status.max_listings;

  switch (status.scenario) {
    case 0:
      return 'Subscribe to start creating posts';
    case 1:
      if (!status.can_create_listings) {
        return `Post quota full (${postsUsed}/${maxPosts}). Renew or upgrade to get more.`;
      }
      return `Active! ${maxPosts - postsUsed} posts remaining.`;
    case 2:
      return `Grace period: ${status.grace_days_remaining} days left. Renew to secure access!`;
    case 3:
      return `Expired ${status.days_expired} days ago. Renew to restore ${status.listings_used} listings.`;
    default:
      return 'Unknown subscription status';
  }
};

// Alert titles by scenario
export const getScenarioAlertTitle = (scenario: number): string => {
  switch (scenario) {
    case 0:
      return '📋 No Subscription';
    case 1:
      return '⚠️ Quota Exhausted';
    case 2:
      return '⏰ Grace Period Active';
    case 3:
      return '❌ Subscription Expired';
    default:
      return 'Subscription Status';
  }
};

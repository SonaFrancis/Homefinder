// =====================================================
// FEATURE FLAGS
// =====================================================
// Central configuration for enabling/disabling features
// Toggle ENABLE_SUBSCRIPTIONS to true when ready to activate

export const FEATURE_FLAGS = {
  // Set to false for free access, true to require subscriptions
  ENABLE_SUBSCRIPTIONS: false,

  // When subscriptions disabled, these are the default limits
  FREE_ACCESS_LIMITS: {
    maxPostsPerMonth: 999, // Unlimited posts (or set a reasonable limit)
    maxImagesPerPost: 5,
    maxVideosPerPost: 1,
    dashboardAccess: true,
  }
} as const;

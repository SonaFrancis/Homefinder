// =====================================================
// SUBSCRIPTION STATUS BANNER COMPONENT
// =====================================================
// Shows warnings based on the 3 subscription scenarios

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SubscriptionScenario, isScenario } from '@/lib/subscriptionTypes';

interface SubscriptionStatusBannerProps {
  scenario: SubscriptionScenario | null;
  style?: any;
}

export function SubscriptionStatusBanner({ scenario, style }: SubscriptionStatusBannerProps) {
  const router = useRouter();

  if (!scenario) return null;

  // Scenario 0: No subscription
  if (isScenario.noSubscription(scenario.scenario)) {
    return (
      <View style={[styles.banner, styles.errorBanner, style]}>
        <View style={styles.content}>
          <Text style={styles.icon}>📋</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>No Active Subscription</Text>
            <Text style={styles.message}>{scenario.warning_message}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, styles.errorButton]}
          onPress={() => router.push('/subscription')}
        >
          <Text style={styles.buttonText}>Subscribe Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Scenario 1: Active subscription but quota exhausted
  if (isScenario.active(scenario.scenario) && !scenario.can_create_listings) {
    const postsUsed = scenario.posts_used_this_month ?? scenario.listings_used;
    const maxPosts = scenario.max_posts_per_month ?? scenario.max_listings;

    return (
      <View style={[styles.banner, styles.warningBanner, style]}>
        <View style={styles.content}>
          <Text style={styles.icon}>⚠️</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Post Quota Reached</Text>
            <Text style={styles.message}>
              {postsUsed}/{maxPosts} posts used this month
            </Text>
            <Text style={styles.subMessage}>
              Renew your subscription or upgrade to Premium for more posts
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, styles.warningButton]}
          onPress={() => router.push('/subscription')}
        >
          <Text style={styles.buttonText}>Upgrade Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Scenario 2: Grace period (0-7 days expired)
  if (isScenario.gracePeriod(scenario.scenario)) {
    const isUrgent = scenario.grace_days_remaining <= 2;
    return (
      <View style={[styles.banner, isUrgent ? styles.urgentBanner : styles.warningBanner, style]}>
        <View style={styles.content}>
          <Text style={styles.icon}>{isUrgent ? '🚨' : '⏰'}</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {isUrgent ? 'URGENT: Subscription Expired' : 'Grace Period Active'}
            </Text>
            <Text style={styles.message}>
              Expired {scenario.days_expired} day{scenario.days_expired > 1 ? 's' : ''} ago
            </Text>
            <Text style={[styles.subMessage, isUrgent && styles.urgentText]}>
              {scenario.grace_days_remaining} day{scenario.grace_days_remaining > 1 ? 's' : ''} left before listings are deactivated!
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, isUrgent ? styles.urgentButton : styles.warningButton]}
          onPress={() => router.push('/subscription')}
        >
          <Text style={styles.buttonText}>Renew Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Scenario 3: Grace period ended (8+ days expired)
  if (isScenario.expired(scenario.scenario)) {
    return (
      <View style={[styles.banner, styles.errorBanner, style]}>
        <View style={styles.content}>
          <Text style={styles.icon}>❌</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Subscription Expired - Listings Deactivated</Text>
            <Text style={styles.message}>
              Expired {scenario.days_expired} days ago
            </Text>
            <Text style={styles.subMessage}>
              Renew now to instantly restore all {scenario.listings_used} listings
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, styles.errorButton]}
          onPress={() => router.push('/subscription')}
        >
          <Text style={styles.buttonText}>Renew to Restore</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Scenario 1: Active and healthy - show quota info (optional, can be hidden)
  if (isScenario.active(scenario.scenario) && scenario.can_create_listings) {
    const postsUsed = scenario.posts_used_this_month ?? scenario.listings_used;
    const maxPosts = scenario.max_posts_per_month ?? scenario.max_listings;
    const quotaPercentage = (postsUsed / maxPosts) * 100;

    // Only show if quota is > 70% used
    if (quotaPercentage > 70) {
      return (
        <View style={[styles.banner, styles.infoBanner, style]}>
          <View style={styles.content}>
            <Text style={styles.icon}>📊</Text>
            <View style={styles.textContainer}>
              <Text style={styles.title}>Subscription Active</Text>
              <Text style={styles.message}>
                {maxPosts - postsUsed} posts remaining this month
              </Text>
            </View>
          </View>
        </View>
      );
    }
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoBanner: {
    backgroundColor: '#EBF5FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  warningBanner: {
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  urgentBanner: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 2,
  },
  subMessage: {
    fontSize: 13,
    color: '#6B7280',
  },
  urgentText: {
    fontWeight: '600',
    color: '#DC2626',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorButton: {
    backgroundColor: '#DC2626',
  },
  warningButton: {
    backgroundColor: '#F59E0B',
  },
  urgentButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

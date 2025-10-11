/**
 * Skeleton Loader Component
 *
 * WHY: Shows a placeholder UI while data loads instead of blank screens
 * This makes the app feel faster and more responsive (like Instagram/Facebook)
 *
 * USAGE:
 * <SkeletonLoader width={100} height={20} />
 * <PropertyCardSkeleton />
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { scale, spacing } from '@/utils/responsive';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

/**
 * Base skeleton component with shimmer animation
 */
export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonLoaderProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Shimmer animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Property Card Skeleton
 */
export function PropertyCardSkeleton() {
  return (
    <View style={styles.propertyCard}>
      {/* Image skeleton */}
      <SkeletonLoader width="100%" height={scale(200)} borderRadius={12} />

      <View style={styles.cardContent}>
        {/* Title skeleton */}
        <SkeletonLoader width="80%" height={20} style={{ marginBottom: spacing.sm }} />

        {/* Price skeleton */}
        <SkeletonLoader width="40%" height={24} style={{ marginBottom: spacing.sm }} />

        {/* Location skeleton */}
        <SkeletonLoader width="60%" height={16} style={{ marginBottom: spacing.sm }} />

        {/* Details row skeleton */}
        <View style={styles.detailsRow}>
          <SkeletonLoader width={60} height={16} />
          <SkeletonLoader width={60} height={16} />
          <SkeletonLoader width={60} height={16} />
        </View>
      </View>
    </View>
  );
}

/**
 * Marketplace Item Card Skeleton
 */
export function MarketplaceCardSkeleton() {
  return (
    <View style={styles.marketplaceCard}>
      {/* Image skeleton */}
      <SkeletonLoader width="100%" height={scale(150)} borderRadius={8} />

      <View style={styles.cardContent}>
        {/* Title skeleton */}
        <SkeletonLoader width="90%" height={18} style={{ marginBottom: spacing.xs }} />

        {/* Price skeleton */}
        <SkeletonLoader width="30%" height={20} style={{ marginBottom: spacing.xs }} />

        {/* Location skeleton */}
        <SkeletonLoader width="50%" height={14} />
      </View>
    </View>
  );
}

/**
 * List of skeleton cards
 */
export function SkeletonList({ count = 3, type = 'property' }: { count?: number; type?: 'property' | 'marketplace' }) {
  const CardComponent = type === 'property' ? PropertyCardSkeleton : MarketplaceCardSkeleton;

  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <CardComponent key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  marketplaceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardContent: {
    padding: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
});

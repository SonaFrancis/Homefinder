import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { spacing, fontSize, scale } from '@/utils/responsive';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface AnalyticsTabProps {
  isPremium: boolean;
}

interface PerformanceItem {
  id: string;
  title: string;
  type: 'Property' | 'Marketplace';
  views: number;
  clicks: number;
  trending: boolean;
}

export default function AnalyticsTab({ isPremium }: AnalyticsTabProps) {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    totalViews: 0,
    totalClicks: 0,
    propertyViews: 0,
    salesViews: 0,
    activeListings: 0,
    totalRevenue: 0,
  });
  const [performanceData, setPerformanceData] = useState<PerformanceItem[]>([]);

  useEffect(() => {
    if (isPremium && profile?.id) {
      fetchAnalytics();
    }
  }, [isPremium, profile?.id]);

  const fetchAnalytics = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Fetch rental properties
      const { data: properties, error: propError } = await supabase
        .from('rental_properties')
        .select('id, title, views_count, whatsapp_clicks, is_available')
        .eq('landlord_id', profile.id);

      if (propError) throw propError;

      // Fetch all marketplace items across all categories
      const categories = ['electronics', 'fashion', 'cosmetics', 'house_items', 'cars', 'properties_for_sale', 'businesses'];
      let allMarketplaceItems: any[] = [];

      for (const category of categories) {
        const { data, error } = await supabase
          .from(category)
          .select('id, title, views_count, whatsapp_clicks, is_available')
          .eq('seller_id', profile.id);

        if (!error && data) {
          allMarketplaceItems = [...allMarketplaceItems, ...data.map(item => ({ ...item, category }))];
        }
      }

      // Calculate analytics
      const propertyViews = properties?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
      const propertyClicks = properties?.reduce((sum, p) => sum + (p.whatsapp_clicks || 0), 0) || 0;
      const salesViews = allMarketplaceItems.reduce((sum, item) => sum + (item.views_count || 0), 0);
      const salesClicks = allMarketplaceItems.reduce((sum, item) => sum + (item.whatsapp_clicks || 0), 0);
      const activeProperties = properties?.filter(p => p.is_available).length || 0;
      const activeMarketplace = allMarketplaceItems.filter(item => item.is_available).length;

      setAnalyticsData({
        totalViews: propertyViews + salesViews,
        totalClicks: propertyClicks + salesClicks,
        propertyViews,
        salesViews,
        activeListings: activeProperties + activeMarketplace,
        totalRevenue: 0,
      });

      // Get top performing items
      const allItems = [
        ...(properties?.map(p => ({
          id: p.id,
          title: p.title,
          type: 'Property' as const,
          views: p.views_count || 0,
          clicks: p.whatsapp_clicks || 0,
        })) || []),
        ...allMarketplaceItems.map(item => ({
          id: item.id,
          title: item.title,
          type: 'Marketplace' as const,
          views: item.views_count || 0,
          clicks: item.whatsapp_clicks || 0,
        })),
      ];

      // Sort by views and get top 5
      const topItems = allItems
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
        .map((item, index) => ({
          ...item,
          trending: index === 0 && item.views > 50, // Mark first item as trending if views > 50
        }));

      setPerformanceData(topItems);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.lockedContainer}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={scale(64)} color="#F59E0B" />
          </View>
          <Text style={styles.lockedTitle}>Premium Feature</Text>
          <Text style={styles.lockedText}>
            Analytics are available for Premium users only. Upgrade your account to access:
          </Text>

          <View style={styles.featuresList}>
            {[
              'Detailed view and click statistics',
              'Performance tracking for all listings',
              'Trending items identification',
              'User engagement metrics',
              'Monthly performance reports',
              'Export analytics data',
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={scale(20)} color="#10B981" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/profile/edit')}
          >
            <Ionicons name="star" size={scale(20)} color="#fff" />
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <View style={styles.premiumBadge}>
          <Ionicons name="star" size={scale(14)} color="#fff" />
          <Text style={styles.premiumText}>Premium</Text>
        </View>
      </View>

      {/* Overview Cards */}
      <View style={styles.overviewSection}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#E8F5F0' }]}>
            <Ionicons name="eye-outline" size={scale(28)} color="#10B981" />
            <Text style={styles.statValue}>{analyticsData.totalViews.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Views</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="hand-left-outline" size={scale(28)} color="#6366F1" />
            <Text style={styles.statValue}>{analyticsData.totalClicks.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Clicks</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="home-outline" size={scale(28)} color="#F59E0B" />
            <Text style={styles.statValue}>{analyticsData.propertyViews.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Property Views</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="cart-outline" size={scale(28)} color="#2563EB" />
            <Text style={styles.statValue}>{analyticsData.salesViews.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Sales Views</Text>
          </View>
        </View>
      </View>

      {/* Active Listings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Listings</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{analyticsData.activeListings}</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>
          You have {analyticsData.activeListings} active listings across Property and Sales
        </Text>
      </View>

      {/* Performance Tracking */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performing Listings</Text>
        {performanceData.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={scale(48)} color="#ccc" />
            <Text style={styles.emptyText}>No listings yet. Create your first listing to see performance data!</Text>
          </View>
        ) : (
          <View style={styles.performanceList}>
            {performanceData.map((item, index) => (
            <View key={item.id} style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <View style={styles.performanceRank}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.performanceInfo}>
                  <View style={styles.performanceTitleRow}>
                    <Text style={styles.performanceTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.trending && (
                      <View style={styles.trendingBadge}>
                        <Ionicons name="trending-up" size={scale(12)} color="#EF4444" />
                        <Text style={styles.trendingText}>Trending</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.performanceType}>{item.type}</Text>
                </View>
              </View>

              <View style={styles.performanceStats}>
                <View style={styles.performanceStat}>
                  <Ionicons name="eye-outline" size={scale(16)} color="#666" />
                  <Text style={styles.performanceStatValue}>{item.views}</Text>
                  <Text style={styles.performanceStatLabel}>views</Text>
                </View>
                <View style={styles.performanceStat}>
                  <Ionicons name="hand-left-outline" size={scale(16)} color="#666" />
                  <Text style={styles.performanceStatValue}>{item.clicks}</Text>
                  <Text style={styles.performanceStatLabel}>clicks</Text>
                </View>
                <View style={styles.performanceStat}>
                  <Ionicons name="stats-chart" size={scale(16)} color="#10B981" />
                  <Text style={[styles.performanceStatValue, { color: '#10B981' }]}>
                    {((item.clicks / item.views) * 100).toFixed(1)}%
                  </Text>
                  <Text style={styles.performanceStatLabel}>CTR</Text>
                </View>
              </View>
            </View>
            ))}
          </View>
        )}
      </View>

      {/* Engagement Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Engagement Insights</Text>
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="bulb-outline" size={scale(24)} color="#F59E0B" />
            <Text style={styles.insightTitle}>Tips to Improve Performance</Text>
          </View>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <Ionicons name="camera-outline" size={scale(16)} color="#666" />
              <Text style={styles.insightText}>
                Add high-quality photos to increase views by up to 40%
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="time-outline" size={scale(16)} color="#666" />
              <Text style={styles.insightText}>
                Update your listings regularly to stay at the top
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="pricetag-outline" size={scale(16)} color="#666" />
              <Text style={styles.insightText}>
                Competitive pricing leads to 2x more inquiries
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Export Data */}
      <View style={[styles.section, { marginBottom: spacing.xxxl }]}>
        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="download-outline" size={scale(20)} color="#6366F1" />
          <Text style={styles.exportButtonText}>Export Analytics Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    backgroundColor: '#10B981',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
  },
  premiumText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  overviewSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.base,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  statCard: {
    width: '47%',
    padding: spacing.base,
    borderRadius: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: '#666',
    marginTop: spacing.xs / 2,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  countBadge: {
    backgroundColor: '#10B981',
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  sectionSubtitle: {
    fontSize: fontSize.base,
    color: '#666',
  },
  performanceList: {
    gap: spacing.base,
  },
  performanceCard: {
    backgroundColor: '#F9FAFB',
    padding: spacing.base,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  performanceRank: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
  performanceInfo: {
    flex: 1,
  },
  performanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs / 2,
  },
  performanceTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs,
  },
  trendingText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#EF4444',
  },
  performanceType: {
    fontSize: fontSize.sm,
    color: '#666',
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  performanceStat: {
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  performanceStatValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  performanceStatLabel: {
    fontSize: fontSize.xs,
    color: '#999',
  },
  insightCard: {
    backgroundColor: '#FEF3C7',
    padding: spacing.base,
    borderRadius: spacing.md,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  insightTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  insightsList: {
    gap: spacing.md,
  },
  insightItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  insightText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: '#666',
    lineHeight: fontSize.lg,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#EEF2FF',
    paddingVertical: spacing.base,
    borderRadius: spacing.md,
  },
  exportButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#6366F1',
  },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  lockIcon: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  lockedTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.sm,
  },
  lockedText: {
    fontSize: fontSize.base,
    color: '#666',
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    lineHeight: fontSize.xl,
  },
  featuresList: {
    width: '100%',
    gap: spacing.base,
    marginBottom: spacing.xxxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    fontSize: fontSize.base,
    color: '#666',
    flex: 1,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#10B981',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xxxl,
    borderRadius: spacing.md,
  },
  upgradeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    backgroundColor: '#F9FAFB',
    borderRadius: spacing.md,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: '#999',
    textAlign: 'center',
  },
});

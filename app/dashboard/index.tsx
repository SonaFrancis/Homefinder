import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, scale } from '@/utils/responsive';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

// Import tab components
import PropertyTab from './tabs/PropertyTab';
import SalesTab from './tabs/SalesTab';
import AnalyticsTab from './tabs/AnalyticsTab';

// Import subscription components
import { useSubscriptionScenario } from '@/hooks/useSubscriptionScenario';
import { SubscriptionStatusBanner } from '@/components/SubscriptionStatusBanner';

type TabType = 'property' | 'sales' | 'analytics';

export default function DashboardScreen() {
  const { hasDashboardAccess } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('property');
  const [salesCategory, setSalesCategory] = useState<string>('');
  const [isCategorySelectionShown, setIsCategorySelectionShown] = useState<boolean>(false);
  const [isPropertyFormShown, setIsPropertyFormShown] = useState<boolean>(false);
  const [propertyResetTrigger, setPropertyResetTrigger] = useState<number>(0);
  const [salesResetTrigger, setSalesResetTrigger] = useState<number>(0);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Get subscription scenario
  const { scenario, loading } = useSubscriptionScenario(userId);

  // Check dashboard access on mount
  useEffect(() => {
    // Skip check if subscriptions are disabled
    if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
      return;
    }

    if (!loading && !hasDashboardAccess()) {
      Alert.alert(
        'Subscription Required',
        'You need an active subscription to access the dashboard. Please subscribe to continue.',
        [
          {
            text: 'Subscribe Now',
            onPress: () => router.replace('/subscription'),
          },
          {
            text: 'Go Back',
            style: 'cancel',
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [loading, hasDashboardAccess]);

  // Check if user has active subscription
  const hasActiveSubscription = scenario?.scenario === 1 && scenario?.subscription_status === 'active';

  // Check if user has premium plan (analytics access is premium-only)
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (!userId || !hasActiveSubscription) {
        setIsPremium(false);
        return;
      }

      const { data } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            name
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (data?.subscription_plans?.name === 'premium') {
        setIsPremium(true);
      } else {
        setIsPremium(false);
      }
    };

    checkPremiumStatus();
  }, [userId, hasActiveSubscription]);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const tabs = [
    { id: 'property', label: 'Property', icon: 'home-outline' },
    { id: 'sales', label: 'Sales', icon: 'storefront-outline' },
    { id: 'analytics', label: 'Analytics', icon: 'stats-chart-outline', premium: true },
  ];

  const getCategoryName = (categoryId: string) => {
    const categories: { [key: string]: string } = {
      'electronics': 'Electronics',
      'house_items': 'House Items',
      'cars': 'Cars',
      'properties': 'Properties',
      'fashion': 'Fashion',
      'cosmetics': 'Cosmetics',
      'businesses': 'Businesses',
    };
    return categories[categoryId] || '';
  };

  const getHeaderTitle = () => {
    if (activeTab === 'property' && isPropertyFormShown) {
      return 'Add Property Listing';
    }
    if (activeTab === 'sales' && isCategorySelectionShown) {
      return 'Select Category';
    }
    if (activeTab === 'sales' && salesCategory) {
      return `Sell ${getCategoryName(salesCategory)}`;
    }
    return 'My Dashboard';
  };

  const handleBackPress = () => {
    // If in property form, go back to main dashboard
    if (activeTab === 'property' && isPropertyFormShown) {
      setIsPropertyFormShown(false);
      setPropertyResetTrigger(prev => prev + 1);
      return;
    }
    // If in sales category form, go back to category selection
    if (activeTab === 'sales' && salesCategory) {
      setSalesCategory('');
      setIsCategorySelectionShown(true);
      return;
    }
    // If in category selection, go back to marketplace items
    if (activeTab === 'sales' && isCategorySelectionShown) {
      setIsCategorySelectionShown(false);
      setSalesResetTrigger(prev => prev + 1);
      return;
    }
    // Otherwise, go back to previous screen (profile)
    router.back();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'property':
        return <PropertyTab onFormStateChange={setIsPropertyFormShown} resetTrigger={propertyResetTrigger} />;
      case 'sales':
        return <SalesTab onCategoryChange={setSalesCategory} onCategorySelectionChange={setIsCategorySelectionShown} resetTrigger={salesResetTrigger} showCategorySelectionExternal={isCategorySelectionShown} />;
      case 'analytics':
        return <AnalyticsTab isPremium={isPremium} />;
      default:
        return <PropertyTab onFormStateChange={setIsPropertyFormShown} resetTrigger={propertyResetTrigger} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={scale(24)} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => router.push('/support')}
        >
          <Ionicons name="help-circle-outline" size={scale(24)} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      {/* Subscription Status Banner */}
      {!loading && scenario && FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS && (
        <SubscriptionStatusBanner scenario={scenario} />
      )}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {tabs.map((tab) => {
            const isLocked = tab.premium && !isPremium;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && styles.tabActive,
                  isLocked && styles.tabLocked,
                ]}
                onPress={() => {
                  if (!isLocked) {
                    setActiveTab(tab.id as TabType);
                  }
                }}
                disabled={isLocked}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={scale(20)}
                  color={activeTab === tab.id ? '#10B981' : '#666'}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab.id && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.premium && (
                  <Ionicons
                    name={isPremium ? 'checkmark-circle' : 'lock-closed'}
                    size={scale(16)}
                    color={isPremium ? '#10B981' : '#F59E0B'}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  helpButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: '#F9FAFB',
  },
  tabActive: {
    backgroundColor: '#E8F5F0',
  },
  tabLocked: {
    opacity: 0.5,
  },
  tabLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#666',
  },
  tabLabelActive: {
    color: '#10B981',
  },
  content: {
    flex: 1,
  },
});

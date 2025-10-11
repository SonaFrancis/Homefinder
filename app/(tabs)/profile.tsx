import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { spacing, fontSize, scale, wp } from '@/utils/responsive';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'fr', name: 'Français' },
];

export default function ProfileScreen() {
  const { profile, signOut, subscription, hasDashboardAccess } = useAuthStore();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const currentLanguage = LANGUAGES.find(lang => lang.id === selectedLanguage);
  const isPremium = hasDashboardAccess();

  // Get subscription plan details
  const planName = subscription?.subscription_plans?.name; // 'standard' or 'premium'
  const displayName = subscription?.subscription_plans?.display_name; // 'Standard Plan' or 'Premium Plan'
  const hasActiveSubscription = subscription?.status === 'active';

  const handleLanguageSelect = (languageId: string) => {
    setSelectedLanguage(languageId);
    setShowLanguageDropdown(false);
    // TODO: Implement actual language change with i18n
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSigningOut(true);
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const menuItems = [
    {
      id: 'edit',
      icon: 'card-outline',
      iconBg: '#10B981',
      title: 'Edit Profile',
      route: '/profile/edit',
    },
    ...(isPremium ? [{
      id: 'dashboard',
      icon: 'stats-chart-outline',
      iconBg: '#10B981',
      title: 'My Dashboard',
      route: '/dashboard',
    }] : []),
    // Only show subscription button if subscriptions are enabled and user doesn't have premium access
    ...(!isPremium && FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS ? [{
      id: 'subscription',
      icon: 'star',
      iconBg: '#F59E0B',
      title: 'Subscription Plans',
      route: '/subscription',
    }] : []),
    {
      id: 'support',
      icon: 'chatbubble-outline',
      iconBg: '#6B7280',
      title: 'Help & Support',
      route: '/support',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <Image
              source={{
                uri: profile?.profile_picture_url || 'https://via.placeholder.com/100',
              }}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.full_name || 'Sona Julie'}</Text>
              <View style={styles.badgeRow}>
                <Text style={styles.userRole}>{profile?.role || 'User'}</Text>
                {hasActiveSubscription && planName === 'premium' && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={14} color="#fff" />
                    <Text style={styles.premiumText}>Premium</Text>
                  </View>
                )}
                {hasActiveSubscription && planName === 'standard' && (
                  <View style={styles.standardBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                    <Text style={styles.standardText}>Standard</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.cardButton}>
            <Ionicons name="card-outline" size={24} color="#10B981" />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => router.push(item.route)}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon as any} size={24} color="#fff" />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}

          {/* Language Menu Item with Dropdown */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowLanguageDropdown(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="globe-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.menuTitle}>Language</Text>
            </View>
            <View style={styles.languageRight}>
              <Text style={styles.currentLanguage}>{currentLanguage?.name}</Text>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <View style={styles.signOutContainer}>
          <TouchableOpacity
            style={[styles.signOutButton, isSigningOut && styles.signOutButtonDisabled]}
            onPress={handleSignOut}
            activeOpacity={0.8}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={24} color="#fff" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Language Dropdown Modal */}
      <Modal
        visible={showLanguageDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Language</Text>
              <TouchableOpacity
                onPress={() => setShowLanguageDropdown(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={scale(24)} color="#666" />
              </TouchableOpacity>
            </View>

            {LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language.id}
                style={[
                  styles.languageOption,
                  selectedLanguage === language.id && styles.languageOptionActive,
                ]}
                onPress={() => handleLanguageSelect(language.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.languageName}>{language.name}</Text>
                {selectedLanguage === language.id && (
                  <Ionicons name="checkmark-circle" size={scale(24)} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl - spacing.sm,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  profileImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#e0e0e0',
    marginRight: spacing.base,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  userRole: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#2563EB',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xs / 2,
    borderRadius: spacing.lg,
    gap: spacing.xs,
  },
  premiumText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#fff',
  },
  standardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xs / 2,
    borderRadius: spacing.lg,
    gap: spacing.xs,
  },
  standardText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#fff',
  },
  cardButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.base,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: spacing.base,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    flex: 1,
  },
  menuIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  signOutContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxxl,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: spacing.base,
    borderRadius: spacing.base,
    gap: spacing.md,
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  languageRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currentLanguage: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: spacing.base,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  languageOptionActive: {
    backgroundColor: '#E8F5F0',
  },
  languageName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
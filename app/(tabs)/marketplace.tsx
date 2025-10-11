import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { wp, hp, spacing, fontSize, scale, isTablet } from '@/utils/responsive';
import { formatPhoneForWhatsApp } from '@/utils/phoneValidation';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import {
  fetchAllMarketplaceItems,
  fetchCategoryItems,
  searchMarketplaceItems,
  MarketplaceItem,
  MarketplaceCategory,
} from '@/lib/marketplace-api';

const CATEGORIES = [
  { id: 'all', name: 'All Items', icon: '📦' },
  { id: 'electronics', name: 'Electronics', icon: '💻' },
  { id: 'cars', name: 'Cars', icon: '🚗' },
  { id: 'house_items', name: 'House Items', icon: '🏠' },
  { id: 'fashion', name: 'Fashion', icon: '👕' },
  { id: 'cosmetics', name: 'Cosmetics', icon: '💄' },
  { id: 'businesses', name: 'Businesses', icon: '💼' },
  { id: 'properties_for_sale', name: 'Properties', icon: '🏘️' },
];

export default function MarketplaceScreen() {
  const { profile, initialized } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Load marketplace items
  useEffect(() => {
    // Wait for auth to initialize
    if (!initialized) return;

    // Redirect to login if user is not authenticated
    if (!profile) {
      router.replace('/(auth)/login');
      return;
    }

    loadItems();
  }, [selectedCategory, profile, initialized]);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);

      // If searching, use search function
      if (searchQuery.trim()) {
        const { data, error } = await searchMarketplaceItems(searchQuery, {
          category: selectedCategory !== 'all' ? selectedCategory as MarketplaceCategory : undefined,
          limit: 50,
        });

        if (error) throw error;
        setItems(data || []);
        return;
      }

      // Otherwise load by category
      if (selectedCategory === 'all') {
        const { data, error } = await fetchAllMarketplaceItems({
          limit: 50,
          orderBy: 'created_at',
          ascending: false,
        });

        if (error) throw error;
        console.log('Fetched marketplace items:', data?.length || 0);
        if (data && data.length > 0) {
          console.log('Sample item media:', JSON.stringify(data[0].media));
        }
        setItems(data || []);
      } else {
        const { data, error } = await fetchCategoryItems(selectedCategory as MarketplaceCategory, {
          limit: 50,
          orderBy: 'created_at',
          ascending: false,
        });

        if (error) throw error;
        console.log(`Fetched ${selectedCategory} items:`, data?.length || 0);
        if (data && data.length > 0) {
          console.log('Sample item media:', JSON.stringify(data[0].media));
        }
        setItems(data || []);
      }
    } catch (err) {
      console.error('Error loading marketplace items:', err);
      setError('Failed to load items. Please try again.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) return;

    const timeoutId = setTimeout(() => {
      loadItems();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Scroll to top and refresh when tab is pressed
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      // Scroll to top
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      // Refresh data
      loadItems();
    });

    return unsubscribe;
  }, [navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Title Row */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>Marketplace 🛒🛍️</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={28} color="#1a1a1a" />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>Discover student essentials</Text>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        {isSearchFocused && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setIsSearchFocused(false);
              setSearchQuery('');
              Keyboard.dismiss();
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
        )}
        <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories - All Scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
            ]}
            onPress={() => handleCategoryChange(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderItemCard = ({ item }: { item: MarketplaceItem }) => {
    // Get first image from media array, or use first video as fallback
    let imageUrl = item.media && item.media.length > 0
      ? item.media.find(m => m.media_type === 'image')?.media_url
      : null;

    // If no image, try to get first video
    const videoUrl = !imageUrl && item.media && item.media.length > 0
      ? item.media.find(m => m.media_type === 'video')?.media_url
      : null;

    const hasVideo = !!videoUrl;

    // Check if this is the user's own listing
    const isMyListing = profile?.id === item.seller_id;

    const handleWhatsAppContact = () => {
      const phoneNumber = item.contact_number;

      if (!phoneNumber) {
        alert('WhatsApp number not available for this item');
        return;
      }

      // Format phone number for WhatsApp (removes all non-numeric characters)
      const cleanNumber = formatPhoneForWhatsApp(phoneNumber);

      if (!cleanNumber || cleanNumber.length < 10) {
        alert('Invalid WhatsApp number for this item');
        return;
      }

      const message = `Hi, I'm interested in your ${item.title} listed for ${item.price.toLocaleString('fr-FR')} FCFA`;
      const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
      Linking.openURL(url).catch(() => {
        alert('WhatsApp is not installed on your device');
      });
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/marketplace/${item.id}?category=${item.category}`)}
        activeOpacity={0.9}
      >
        {/* Item Image/Video */}
        <View style={styles.imageContainer}>
          {imageUrl || videoUrl ? (
            <>
              <Image
                source={{ uri: imageUrl || videoUrl }}
                style={styles.itemImage}
                resizeMode="cover"
              />
              {hasVideo && (
                <View style={styles.videoOverlay}>
                  <Ionicons name="play-circle" size={48} color="#fff" />
                </View>
              )}
            </>
          ) : (
            <View style={[styles.itemImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={48} color="#ccc" />
              <Text style={styles.placeholderText}>No Media</Text>
            </View>
          )}
          {/* Status Badge */}
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {item.is_available ? 'For Sale' : 'Sold'}
            </Text>
          </View>
          {item.is_featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
        </View>

        {/* Item Details */}
        <View style={styles.cardContent}>
          {/* Title */}
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>

          {/* Price */}
          <Text style={styles.price}>{item.price.toLocaleString('fr-FR')} FCFA</Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.locationText}>{item.city}</Text>
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Category Badge and Action Button */}
          <View style={styles.bottomRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {CATEGORIES.find(cat => cat.id === item.category)?.name || item.category}
              </Text>
            </View>
            {isMyListing ? (
              <View style={styles.myListingBadge}>
                <Text style={styles.myListingText}>My listing</Text>
              </View>
            ) : item.contact_number ? (
              <TouchableOpacity
                style={styles.whatsappButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleWhatsAppContact();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                <Text style={styles.whatsappText}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.emptyTitle}>Loading marketplace...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Oops! Something went wrong</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadItems}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛍️</Text>
        <Text style={styles.emptyTitle}>No items available</Text>
        <Text style={styles.emptySubtitle}>
          {selectedCategory === 'all'
            ? 'Check back later for new listings'
            : `No ${CATEGORIES.find(c => c.id === selectedCategory)?.name} items available`}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {renderHeader()}
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItemCard}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={items.length === 0 ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: Platform.OS === 'android' ? 150 : 130,
  },
  emptyListContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'android' ? 150 : 130,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? spacing.lg : spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxxl - 4,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  notificationButton: {
    width: scale(44),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: '#EF4444',
    borderRadius: scale(10),
    minWidth: scale(18),
    height: scale(18),
    paddingHorizontal: scale(4),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: scale(10),
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: '#666',
    marginBottom: spacing.base,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md + spacing.xs / 2,
    borderRadius: spacing.xl,
    gap: spacing.sm + spacing.xs / 2,
  },
  searchBarFocused: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: '#1a1a1a',
    padding: 0,
  },
  categoriesScroll: {
    marginTop: spacing.md,
  },
  categoriesContent: {
    paddingRight: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  categoryIcon: {
    fontSize: fontSize.sm,
  },
  categoryText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#666',
  },
  categoryTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.base,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: isTablet() ? wp(80) : undefined,
    alignSelf: isTablet() ? 'center' : 'stretch',
    width: isTablet() ? wp(80) : undefined,
  },
  imageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: hp(25),
    backgroundColor: '#e0e0e0',
    borderTopLeftRadius: spacing.lg - 1,
    borderTopRightRadius: spacing.lg - 1,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  placeholderText: {
    fontSize: fontSize.sm,
    color: '#ccc',
    marginTop: spacing.xs,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xs / 2,
    borderRadius: spacing.sm,
  },
  statusText: {
    color: '#10B981',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  cardContent: {
    padding: spacing.base,
  },
  itemTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: spacing.sm,
    flex: 1,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  locationText: {
    fontSize: fontSize.base,
    color: '#666',
  },
  description: {
    fontSize: fontSize.base,
    color: '#666',
    lineHeight: fontSize.xl,
    marginBottom: spacing.md,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xs / 2,
    borderRadius: spacing.sm,
  },
  categoryBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  statText: {
    fontSize: fontSize.sm,
    color: '#999',
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  featuredText: {
    color: '#FFD700',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  myListingBadge: {
    backgroundColor: '#E8F5F0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
  },
  myListingText: {
    color: '#10B981',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  whatsappText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl + spacing.lg,
  },
  emptyIcon: {
    fontSize: scale(60),
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#666',
    marginTop: spacing.base,
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: '#999',
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.md,
    marginTop: spacing.lg,
  },
  retryText: {
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: '600',
  },
});
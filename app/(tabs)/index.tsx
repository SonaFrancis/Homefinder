import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RentalProperty } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { formatPrice } from '@/utils/validation';
import { wp, hp, spacing, fontSize, scale, isTablet } from '@/utils/responsive';
import { formatPhoneForWhatsApp } from '@/utils/phoneValidation';
import {
  fetchRentalProperties,
  fetchFeaturedProperties,
  incrementPropertyViewCount,
  incrementPropertyWhatsAppClick,
} from '@/lib/rental-api';
import { initializeNotificationAudio } from '@/utils/notificationSound';
import { supabase } from '@/lib/supabase';
import { useProperties, PropertyFilters } from '@/hooks/useProperties';
import { OptimizedImage } from '@/components/OptimizedImage';
import { PropertyCardSkeleton, SkeletonList } from '@/components/SkeletonLoader';

interface CityStreets {
  [city: string]: string[];
}

export default function RentalsScreen() {
  const { profile, user, initialized, loading: authLoading } = useAuthStore();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const startRealtimeSubscription = useNotificationStore((state) => state.startRealtimeSubscription);
  const stopRealtimeSubscription = useNotificationStore((state) => state.stopRealtimeSubscription);
  const refreshUnreadCount = useNotificationStore((state) => state.refreshUnreadCount);
  const cleanupOld = useNotificationStore((state) => state.cleanupOld);
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);

  // Filter modal states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [availableCities, setAvailableCities] = useState<CityStreets>({});
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedStreet, setSelectedStreet] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Additional filter states
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | null>(null);
  const [selectedBathrooms, setSelectedBathrooms] = useState<number | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedFurnishing, setSelectedFurnishing] = useState<string>('');

  // Hardcoded property types
  const propertyTypes = ['Studio', 'Room', 'Apartment', 'Shared Room', 'House'];

  // Build filters for React Query
  const [queryFilters, setQueryFilters] = useState<PropertyFilters>({});

  // React Query hook - automatic caching and background refetch
  const { data: properties = [], isLoading, error, refetch, isRefetching } = useProperties(queryFilters);

  useEffect(() => {
    // Wait for auth to initialize
    if (!initialized || authLoading) return;

    // Redirect to login if user is not authenticated and auth is done loading
    if (!profile) {
      router.replace('/(auth)/login');
      return;
    }

    // Initialize notification system
    initializeNotificationAudio();
    startRealtimeSubscription(profile.id);
    refreshUnreadCount(profile.id);
    cleanupOld(profile.id);

    return () => {
      stopRealtimeSubscription();
    };
  }, [profile?.id, initialized, authLoading]);

  // Scroll to top when tab is pressed
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      // Scroll to top
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      // Refresh data
      refetch();
    });

    return unsubscribe;
  }, [navigation, refetch]);

  // Update filters for React Query
  const updateFilters = useCallback((city?: string, street?: string, additionalFilters?: any, search?: string) => {
    const filters: PropertyFilters = {
      city: city || undefined,
      street: street || undefined,
      searchQuery: search || undefined,
      ...additionalFilters,
    };
    setQueryFilters(filters);
  }, []);

  const fetchAvailableLocations = async () => {
    try {
      // Fetch unique cities and streets from rental_properties
      const { data, error } = await supabase
        .from('rental_properties')
        .select('city, street')
        .eq('listing_status', 'approved')
        .not('city', 'is', null)
        .not('street', 'is', null);

      if (error) throw error;

      // Group streets by city
      const cityStreetsMap: CityStreets = {};

      data?.forEach((property) => {
        const city = property.city?.trim();
        const street = property.street?.trim();

        if (city && street) {
          if (!cityStreetsMap[city]) {
            cityStreetsMap[city] = [];
          }
          // Add street if it doesn't already exist for this city
          if (!cityStreetsMap[city].includes(street)) {
            cityStreetsMap[city].push(street);
          }
        }
      });

      setAvailableCities(cityStreetsMap);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleApplyFilter = useCallback(() => {
    setShowFilterModal(false);

    // Build filters object
    const filters: any = {};

    if (selectedPropertyType) filters.propertyType = selectedPropertyType;
    if (priceRange.min) filters.minPrice = parseFloat(priceRange.min);
    if (priceRange.max) filters.maxPrice = parseFloat(priceRange.max);
    if (selectedBedrooms !== null) filters.bedrooms = selectedBedrooms;
    if (selectedBathrooms !== null) filters.bathrooms = selectedBathrooms;
    if (selectedAmenities.length > 0) filters.amenities = selectedAmenities;
    if (selectedFurnishing) {
      filters.isFurnished = selectedFurnishing === 'Furnished' ? true : selectedFurnishing === 'Unfurnished' ? false : undefined;
    }

    updateFilters(
      selectedCity || undefined,
      selectedStreet || undefined,
      Object.keys(filters).length > 0 ? filters : undefined,
      searchQuery || undefined
    );
  }, [selectedCity, selectedStreet, selectedPropertyType, priceRange, selectedBedrooms, selectedBathrooms, selectedAmenities, selectedFurnishing, searchQuery, updateFilters]);

  const handleClearFilter = useCallback(() => {
    setSelectedCity('');
    setSelectedStreet('');
    setSelectedPropertyType('');
    setPriceRange({ min: '', max: '' });
    setSelectedBedrooms(null);
    setSelectedBathrooms(null);
    setSelectedAmenities([]);
    setSelectedFurnishing('');
    setSearchQuery('');
    setShowFilterModal(false);
    setQueryFilters({});
  }, []);

  const toggleAmenity = useCallback((amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  }, []);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const handlePropertyPress = useCallback(async (property: RentalProperty) => {
    // Increment view count
    await incrementPropertyViewCount(property.id);

    router.push(`/property/${property.id}`);
  }, []);

  const handleWhatsAppPress = useCallback(async (property: RentalProperty) => {
    try {
      // Increment WhatsApp clicks count
      await incrementPropertyWhatsAppClick(property.id);

      // Create deep link back to the property in the app
      const propertyLink = `https://yourapp.com/property/${property.id}`;

      // Get landlord's WhatsApp number
      const whatsappNumber = property.contact_number;

      if (!whatsappNumber) {
        alert('WhatsApp number not available for this property');
        return;
      }

      // Format phone number for WhatsApp (removes all non-numeric characters)
      const cleanNumber = formatPhoneForWhatsApp(whatsappNumber);

      if (!cleanNumber || cleanNumber.length < 10) {
        alert('Invalid WhatsApp number for this property');
        return;
      }

      // Create WhatsApp message with property link
      const message = `Hi, I'm interested in your property: ${property.title}\n\nView property: ${propertyLink}`;

      // Format WhatsApp URL
      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

      // Open WhatsApp
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        alert('WhatsApp is not installed on this device');
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      alert('Failed to open WhatsApp');
    }
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top Row: Profile, Greeting, Notification */}
      <View style={styles.topRow}>
        {/* Left: Profile Picture + Greeting */}
        <View style={styles.profileSection}>
          <OptimizedImage
            source={{
              uri: profile?.profile_picture_url || 'https://via.placeholder.com/50',
            }}
            style={styles.profileImage}
            contentFit="cover"
            priority="high"
          />
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting} numberOfLines={1}>
              Hi {profile?.full_name?.split(' ')[0] || 'Guest'}
            </Text>
            <Text style={styles.timeOfDay}>Good {getTimeOfDay()}</Text>
          </View>
        </View>

        {/* Right: Notification Bell */}
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={scale(26)} color="#1a1a1a" />
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
      <Text style={styles.subtitle}>Find your student home away from home</Text>

      {/* Search Bar with Filter */}
      <View style={styles.searchRow}>
        {isSearchFocused && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setIsSearchFocused(false);
              setSearchQuery('');
              Keyboard.dismiss();
              setQueryFilters({});
            }}
          >
            <Ionicons name="arrow-back" size={scale(24)} color="#1a1a1a" />
          </TouchableOpacity>
        )}
        <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
          <Ionicons name="search" size={scale(20)} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location, property type..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onSubmitEditing={() => updateFilters(selectedCity, selectedStreet, undefined, searchQuery)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setQueryFilters({});
            }}>
              <Ionicons name="close-circle" size={scale(20)} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            fetchAvailableLocations();
            setShowFilterModal(true);
          }}
        >
          <Ionicons name="options-outline" size={scale(24)} color="#10B981" />
          {(selectedCity || selectedStreet || selectedPropertyType || selectedBedrooms || selectedBathrooms || selectedAmenities.length > 0 || priceRange.min || priceRange.max || selectedFurnishing) && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPropertyCard = useCallback(({ item }: { item: RentalProperty }) => {
    return <PropertyCard property={item} profile={profile} userId={user?.id} onPress={handlePropertyPress} onWhatsAppPress={handleWhatsAppPress} />;
  }, [profile, user?.id, handlePropertyPress, handleWhatsAppPress]);

  const keyExtractor = useCallback((item: RentalProperty) => item.id, []);

  const renderEmpty = useCallback(() => {
    return <EmptyList isLoading={isLoading} error={error} onRetry={refetch} />;
  }, [isLoading, error, refetch]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {renderHeader()}

      {/* Show skeleton on initial load */}
      {isLoading && !properties.length ? (
        <SkeletonList count={5} type="property" />
      ) : (
        <FlatList
          ref={flatListRef}
          data={properties}
          renderItem={renderPropertyCard}
          keyExtractor={keyExtractor}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={properties.length === 0 ? styles.emptyListContent : styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              colors={['#10B981']}
              tintColor="#10B981"
            />
          }
          // Performance optimizations
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Filter Modal - Airbnb Style */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.closeButtonLeft}
              >
                <Ionicons name="close" size={scale(24)} color="#1a1a1a" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Search Filters</Text>
              <TouchableOpacity onPress={handleClearFilter}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Property Types */}
              <View style={styles.filterSectionNew}>
                <Text style={styles.sectionTitleNew}>Property Type</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.propertyTypeScrollContent}
                >
                  {propertyTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.periodChip,
                        selectedPropertyType === type && styles.periodChipActive,
                      ]}
                      onPress={() => setSelectedPropertyType(selectedPropertyType === type ? '' : type)}
                    >
                      <Text
                        style={[
                          styles.periodChipText,
                          selectedPropertyType === type && styles.periodChipTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Price Range */}
              <View style={styles.filterSectionNew}>
                <Text style={styles.sectionTitleNew}>Price Range (FCFA)</Text>
                <View style={styles.priceInputRow}>
                  <View style={styles.priceInputBox}>
                    <Ionicons name="cash-outline" size={scale(20)} color="#999" />
                    <TextInput
                      style={styles.priceInput}
                      placeholder="Min price"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={priceRange.min}
                      onChangeText={(text) => setPriceRange({ ...priceRange, min: text })}
                    />
                  </View>
                  <Text style={styles.priceToText}>to</Text>
                  <View style={styles.priceInputBox}>
                    <Ionicons name="cash-outline" size={scale(20)} color="#999" />
                    <TextInput
                      style={styles.priceInput}
                      placeholder="Max price"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={priceRange.max}
                      onChangeText={(text) => setPriceRange({ ...priceRange, max: text })}
                    />
                  </View>
                </View>
              </View>

              {/* Location */}
              <View style={styles.filterSectionNew}>
                <Text style={styles.sectionTitleNew}>City</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cityScrollContent}
                >
                  {Object.keys(availableCities).map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={[
                        styles.cityPill,
                        selectedCity === city && styles.cityPillActive,
                      ]}
                      onPress={() => {
                        setSelectedCity(selectedCity === city ? '' : city);
                        setSelectedStreet('');
                      }}
                    >
                      <Ionicons
                        name="location"
                        size={scale(16)}
                        color={selectedCity === city ? '#fff' : '#717171'}
                      />
                      <Text
                        style={[
                          styles.cityPillText,
                          selectedCity === city && styles.cityPillTextActive,
                        ]}
                      >
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {selectedCity && availableCities[selectedCity] && (
                  <>
                    <Text style={styles.subLabel}>Street in {selectedCity}</Text>
                    <View style={styles.streetGrid}>
                      {availableCities[selectedCity].map((street) => (
                        <TouchableOpacity
                          key={street}
                          style={[
                            styles.streetPill,
                            selectedStreet === street && styles.streetPillActive,
                          ]}
                          onPress={() => setSelectedStreet(selectedStreet === street ? '' : street)}
                        >
                          <Text
                            style={[
                              styles.streetPillText,
                              selectedStreet === street && styles.streetPillTextActive,
                            ]}
                          >
                            {street}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>

              {/* Bedrooms */}
              <View style={styles.filterSectionNew}>
                <Text style={styles.sectionTitleNew}>Bedrooms</Text>
                <View style={styles.bedroomsRow}>
                  {['Shared', 1, 2, 3, 4].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.bedroomBox,
                        selectedBedrooms === (num === 'Shared' ? 0 : num) && styles.bedroomBoxActive,
                      ]}
                      onPress={() => setSelectedBedrooms(selectedBedrooms === (num === 'Shared' ? 0 : num) ? null : (num === 'Shared' ? 0 : num))}
                    >
                      <Ionicons
                        name={num === 'Shared' ? 'people-outline' : 'bed-outline'}
                        size={scale(20)}
                        color={selectedBedrooms === (num === 'Shared' ? 0 : num) ? '#717171' : '#717171'}
                      />
                      <Text
                        style={[
                          styles.bedroomBoxText,
                          selectedBedrooms === (num === 'Shared' ? 0 : num) && styles.bedroomBoxTextActive,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Furnishing */}
              <View style={styles.filterSectionNew}>
                <Text style={styles.sectionTitleNew}>Furnishing</Text>
                <View style={styles.furnishingRow}>
                  {['Furnished', 'Unfurnished', 'Partly Furnished'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.furnishingBox,
                        selectedFurnishing === type && styles.furnishingBoxActive,
                      ]}
                      onPress={() => setSelectedFurnishing(selectedFurnishing === type ? '' : type)}
                    >
                      <Text
                        style={[
                          styles.furnishingText,
                          selectedFurnishing === type && styles.furnishingTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <TouchableOpacity
              style={styles.showResultsButton}
              onPress={handleApplyFilter}
            >
              <Text style={styles.showResultsText}>Show Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Memoized PropertyCard component
const PropertyCard = memo(({ property, profile, userId, onPress, onWhatsAppPress }: {
  property: RentalProperty;
  profile: any;
  userId?: string;
  onPress: (property: RentalProperty) => void;
  onWhatsAppPress: (property: RentalProperty) => void;
}) => {
  // Get first image, or fallback to first video
  let firstImage = property.rental_property_media?.find(m => m.media_type === 'image')?.media_url;
  const firstVideo = !firstImage ? property.rental_property_media?.find(m => m.media_type === 'video')?.media_url : null;
  const hasVideo = !!firstVideo;

  // Check if this is the user's own listing - try both profile.id and userId
  const isMyListing = property.landlord_id === (profile?.id || userId);

  const handlePress = useCallback(() => {
    onPress(property);
  }, [property, onPress]);

  const handleWhatsApp = useCallback((e: any) => {
    e.stopPropagation();
    onWhatsAppPress(property);
  }, [property, onWhatsAppPress]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Property Image/Video */}
      <View style={styles.imageContainer}>
        {firstImage || firstVideo ? (
          <>
            <OptimizedImage
              source={{ uri: firstImage || firstVideo }}
              style={styles.propertyImage}
              contentFit="cover"
              priority="normal"
            />
            {hasVideo && (
              <View style={styles.videoOverlay}>
                <Ionicons name="play-circle" size={48} color="#fff" />
              </View>
            )}
          </>
        ) : (
          <View style={[styles.propertyImage, styles.placeholderImage]}>
            <Ionicons name="home-outline" size={48} color="#ccc" />
            <Text style={styles.placeholderText}>No Media</Text>
          </View>
        )}
      {/* Availability Badge */}
      {property.is_available && (
        <View style={styles.availableBadge}>
          <Text style={styles.availableText}>Available</Text>
        </View>
      )}
      {/* Featured Badge */}
      {property.is_featured && (
        <View style={styles.featuredBadge}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      )}
    </View>

    {/* Property Details */}
    <View style={styles.cardContent}>
      {/* Title and Location */}
      <Text style={styles.propertyTitle} numberOfLines={1}>
        {property.title}
      </Text>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text style={styles.locationText}>{property.city}, {property.street || 'Akwa'}</Text>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {property.description}
      </Text>

      {/* Property Info */}
      <View style={styles.propertyInfo}>
        <Text style={styles.infoText}>{property.property_type}</Text>
        <Text style={styles.infoDot}>•</Text>
        <Text style={styles.infoText}>{property.bedrooms} bed</Text>
        <Text style={styles.infoDot}>•</Text>
        <Text style={styles.infoText}>{property.bathrooms} bath</Text>
        <Text style={styles.infoDot}>•</Text>
        <Text style={styles.infoText}>{property.square_meters}m²</Text>
      </View>

      {/* Furnished Status */}
      <Text style={styles.furnished}>{property.is_furnished ? 'Furnished' : 'Unfurnished'}</Text>

      {/* Price and Action Button */}
      <View style={styles.bottomRow}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatPrice(property.price)}<Text style={styles.priceUnit}>/month</Text></Text>
        </View>
        {isMyListing ? (
          <View style={styles.myListingBadge}>
            <Text style={styles.myListingText}>My Listing</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
            <Text style={styles.whatsappText}>WhatsApp</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  </TouchableOpacity>
);
}, (prevProps, nextProps) => {
  // Re-render if property ID, profile ID, or userId changes
  return prevProps.property.id === nextProps.property.id &&
         prevProps.profile?.id === nextProps.profile?.id &&
         prevProps.userId === nextProps.userId;
});

PropertyCard.displayName = 'PropertyCard';

// Empty list component
function EmptyList({ isLoading, error, onRetry }: { isLoading: boolean; error: any; onRetry: () => void }) {
  if (isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.emptyTitle}>Loading properties...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
        <Text style={styles.emptyTitle}>Oops! Something went wrong</Text>
        <Text style={styles.emptySubtitle}>{error.message || 'Failed to load properties'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="home-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No properties available</Text>
      <Text style={styles.emptySubtitle}>Check back later for new listings</Text>
    </View>
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
    paddingBottom: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  profileImage: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#e0e0e0',
    marginRight: spacing.md,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: fontSize.md,
    fontWeight: '400',
    color: '#666',
    marginBottom: spacing.xs / 2,
  },
  timeOfDay: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: '#10B981',
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
    minWidth: scale(20),
    height: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs / 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: fontSize.xs - 2,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.base,
    color: '#666',
    marginBottom: spacing.base,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  searchPlaceholder: {
    fontSize: fontSize.base,
    color: '#999',
  },
  filterButton: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: '#E8F5F0',
    justifyContent: 'center',
    alignItems: 'center',
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
  propertyImage: {
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
  availableBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xs / 2,
    borderRadius: spacing.sm,
  },
  availableText: {
    color: '#10B981',
    fontSize: fontSize.sm,
    fontWeight: '600',
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
  cardContent: {
    padding: spacing.base,
  },
  propertyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.xs + spacing.xs / 2,
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
    flex: 1,
  },
  description: {
    fontSize: fontSize.base,
    color: '#666',
    lineHeight: fontSize.xl,
    marginBottom: spacing.sm + spacing.xs / 2,
  },
  propertyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xs / 2,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  infoText: {
    fontSize: fontSize.sm,
    color: '#666',
  },
  infoDot: {
    fontSize: fontSize.sm,
    color: '#666',
  },
  furnished: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: spacing.md,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceContainer: {
    flex: 1,
    flexShrink: 1,
    marginRight: spacing.xs,
  },
  price: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#2563EB',
    flexWrap: 'wrap',
  },
  priceUnit: {
    fontSize: fontSize.base,
    fontWeight: '400',
    color: '#666',
  },
  myListingBadge: {
    backgroundColor: '#E8F5F0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
  },
  myListingText: {
    color: '#10B981',
    fontSize: fontSize.sm,
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
  filterBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#EF4444',
  },
  // Modal styles - New Design
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '95%',
    minHeight: '70%',
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: '#fff',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButtonLeft: {
    padding: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  resetText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#10B981',
  },
  modalContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
  },
  filterInfo: {
    padding: spacing.lg,
    textAlign: 'center',
    color: '#999',
  },
  // New Filter Sections
  filterSectionNew: {
    marginBottom: spacing.xl,
  },
  sectionTitleNew: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.md,
  },
  subLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  // Property Type Scroll
  propertyTypeScrollContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  // Rent Period
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  periodChip: {
    paddingHorizontal: spacing.base + spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: scale(12),
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  periodChipActive: {
    backgroundColor: '#fff',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  periodChipText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodChipTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  // Price Range
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  priceInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: '#1a1a1a',
  },
  priceToText: {
    fontSize: fontSize.sm,
    color: '#6B7280',
    fontWeight: '500',
  },
  // City Pills
  cityScrollContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: scale(20),
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  cityPillActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  cityPillText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: '#717171',
  },
  cityPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  // Street Pills
  streetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  streetPill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: scale(16),
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  streetPillActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  streetPillText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: '#717171',
  },
  streetPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  // Bedrooms
  bedroomsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bedroomBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base + spacing.xs,
    backgroundColor: '#fff',
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: spacing.xs / 2,
  },
  bedroomBoxActive: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  bedroomBoxText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#6B7280',
  },
  bedroomBoxTextActive: {
    color: '#1a1a1a',
  },
  // Furnishing
  furnishingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  furnishingBox: {
    flex: 1,
    paddingVertical: spacing.base,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  furnishingBoxActive: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  furnishingText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  furnishingTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  // Show Results Button
  showResultsButton: {
    backgroundColor: '#10B981',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.base,
    paddingVertical: spacing.base + spacing.xs,
    borderRadius: scale(12),
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  showResultsText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  // Price Range Styles
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  priceInputContainer: {
    flex: 1,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: scale(8),
    backgroundColor: '#fff',
  },
  priceSeparator: {
    width: scale(16),
    height: 1,
    backgroundColor: '#DDDDDD',
    marginHorizontal: spacing.sm,
  },
  priceLabel: {
    fontSize: fontSize.xs,
    color: '#717171',
    marginBottom: spacing.xs / 2,
  },
  priceValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#222',
  },
  pricePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#fff',
  },
  presetChipActive: {
    backgroundColor: '#222',
    borderColor: '#222',
  },
  presetChipText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: '#222',
  },
  presetChipTextActive: {
    color: '#fff',
  },
  // Rooms Styles
  roomsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  roomButton: {
    flex: 1,
    paddingVertical: spacing.base,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  roomButtonActive: {
    backgroundColor: '#222',
    borderColor: '#222',
  },
  roomButtonText: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: '#222',
  },
  roomButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  // Amenities Styles
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenityCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#fff',
    position: 'relative',
  },
  amenityCardActive: {
    backgroundColor: '#222',
    borderColor: '#222',
  },
  amenityCardText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: '#222',
    marginLeft: spacing.sm,
    flex: 1,
  },
  amenityCardTextActive: {
    color: '#fff',
  },
  amenityCheckmark: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
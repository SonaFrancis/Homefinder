import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { formatPrice, formatWhatsAppLink } from '@/utils/validation';
import { wp, hp, spacing, fontSize, scale, screen } from '@/utils/responsive';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ReviewModal } from '@/components/ReviewModal';
import { useAuthStore } from '@/store/authStore';

interface MarketplaceItem {
  id: string;
  seller_id: string;
  title?: string;
  description?: string;
  price?: number;
  city?: string;
  contact_number?: string;
  condition?: string;
  is_negotiable?: boolean;
  is_featured?: boolean;
  is_available?: boolean;
  category?: string;
  created_at?: string;
  profiles?: {
    id: string;
    full_name: string;
    profile_picture_url?: string;
    whatsapp_number?: string;
    phone_number?: string;
    is_verified: boolean;
    average_rating: number;
    total_reviews: number;
  };
  media?: Array<{
    id: string;
    media_type: string;
    media_url: string;
    display_order: number;
  }>;
  // Category-specific fields
  brand?: string;
  model?: string;
  make?: string;
  year?: number;
  size?: string;
  color?: string;
  warranty?: string;
}

const CATEGORY_TABLES: { [key: string]: string } = {
  electronics: 'electronics',
  fashion: 'fashion',
  cosmetics: 'cosmetics',
  house_items: 'house_items',
  cars: 'cars',
  properties: 'properties_for_sale',
  properties_for_sale: 'properties_for_sale',
  businesses: 'businesses',
};

const CATEGORY_MEDIA_TABLES: { [key: string]: string } = {
  electronics: 'electronics_media',
  fashion: 'fashion_media',
  cosmetics: 'cosmetics_media',
  house_items: 'house_items_media',
  cars: 'cars_media',
  properties: 'properties_for_sale_media',
  properties_for_sale: 'properties_for_sale_media',
  businesses: 'businesses_media',
};

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles: {
    full_name: string;
    profile_picture_url: string;
  };
}

export default function MarketplaceItemDetailScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const { profile } = useAuthStore();

  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id, category]);

  const fetchItem = async () => {
    try {
      console.log('Fetching item with category:', category);
      const tableName = CATEGORY_TABLES[category as string];
      const mediaTable = CATEGORY_MEDIA_TABLES[category as string];

      if (!tableName) {
        console.error('Invalid category:', category, 'Available categories:', Object.keys(CATEGORY_TABLES));
        throw new Error(`Invalid category: ${category}`);
      }

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          profiles!${tableName}_seller_id_fkey (*),
          ${mediaTable}:${mediaTable} (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform data to match interface
      const transformedData = {
        ...data,
        category: category as string,
        media: data[mediaTable],
      };

      setItem(transformedData);

      // Fetch reviews for the seller
      if (data?.seller_id) {
        fetchSellerReviews(data.seller_id);
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerReviews = async (sellerId: string) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles!reviews_reviewer_id_fkey (
            full_name,
            profile_picture_url
          )
        `)
        .eq('reviewed_user_id', sellerId)
        .eq('listing_type', 'marketplace')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setReviews(data || []);
      setReviewCount(data?.length || 0);

      // Calculate average rating
      if (data && data.length > 0) {
        const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleWhatsAppClick = async () => {
    if (!item?.profiles?.whatsapp_number && !item?.contact_number) {
      Alert.alert('Contact Unavailable', 'WhatsApp number not provided');
      return;
    }

    const phone = item.profiles?.whatsapp_number || item.contact_number;

    // Create detailed message with item information
    let message = `Hi, I'm interested in this item:

📍 *${item.title}*
💰 Price: ${formatPrice(item.price)}${item.is_negotiable ? ' (Negotiable)' : ''}
📌 Location: ${item.city || 'N/A'}`;

    // Add category-specific details
    if (category === 'electronics' && (item.brand || item.model)) {
      message += `\n🏷️ Brand: ${item.brand || 'N/A'}`;
      if (item.model) message += `\n📱 Model: ${item.model}`;
    } else if (category === 'cars' && (item.make || item.year)) {
      message += `\n🚗 Make: ${item.make || 'N/A'}`;
      if (item.year) message += `\n📅 Year: ${item.year}`;
    } else if (category === 'fashion' && (item.size || item.color)) {
      if (item.size) message += `\n👕 Size: ${item.size}`;
      if (item.color) message += `\n🎨 Color: ${item.color}`;
    }

    // Add condition
    if (item.condition) {
      message += `\n✨ Condition: ${item.condition}`;
    }

    // Add description snippet
    if (item.description) {
      message += `\n\n📝 Description: ${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}`;
    }

    message += `\n\nI'd like to get more information about this item. When can we discuss?`;

    const whatsappUrl = formatWhatsAppLink(phone, message);

    // Increment WhatsApp click counter
    const tableName = CATEGORY_TABLES[category as string];
    await supabase.rpc('increment_whatsapp_clicks', {
      listing_table: tableName,
      listing_uuid: item.id,
    });

    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      Linking.openURL(whatsappUrl);
    } else {
      Alert.alert('Error', 'WhatsApp is not installed on your device');
    }
  };

  const handleShare = async () => {
    if (!item) return;

    try {
      await Share.share({
        message: `Check out this item: ${item.title}\n\n${formatPrice(item.price)}\n\nView details in the app!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCall = () => {
    if (!item?.profiles?.phone_number && !item?.contact_number) {
      Alert.alert('Contact Unavailable', 'Phone number not provided');
      return;
    }

    const phone = item.profiles?.phone_number || item.contact_number;
    Linking.openURL(`tel:${phone}`);
  };

  const toggleFavorite = async () => {
    // TODO: Implement favorite functionality with database
    setIsFavorite(!isFavorite);
  };

  if (loading || !item) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading item...</Text>
      </SafeAreaView>
    );
  }

  const images = item.media?.filter(m => m.media_type === 'image') || [];
  const videos = item.media?.filter(m => m.media_type === 'video') || [];
  const isVerified = item.profiles?.is_verified;

  // Combine images and videos for gallery display
  const allMedia = [...images, ...videos];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Media Gallery (Images + Video Thumbnails) */}
        <View style={styles.galleryContainer}>
          {allMedia.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / screen.width);
                setCurrentImageIndex(index);
              }}
            >
              {allMedia.map((media, index) => (
                <View key={media.id} style={{ width: screen.width }}>
                  <Image
                    source={{ uri: media.media_url }}
                    style={[styles.galleryImage, { width: screen.width }]}
                    resizeMode="cover"
                  />
                  {media.media_type === 'video' && (
                    <TouchableOpacity
                      style={styles.videoPlayOverlay}
                      onPress={() => setSelectedVideoUrl(media.media_url)}
                    >
                      <View style={styles.playIconLarge}>
                        <Ionicons name="play-circle" size={scale(80)} color="#fff" />
                      </View>
                      <Text style={styles.videoLabel}>Tap to play video</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.galleryImage, { width: screen.width }]}>
              <Ionicons name="image-outline" size={scale(80)} color="#ccc" />
              <Text style={styles.noImageText}>No images available</Text>
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={scale(24)} color="#1a1a1a" />
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.actionButton} onPress={toggleFavorite}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={scale(24)}
                color={isFavorite ? '#EF4444' : '#1a1a1a'}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={scale(24)} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          {/* Media Counter */}
          {allMedia.length > 0 && (
            <View style={styles.imageCounter}>
              <Text style={styles.counterText}>
                {`${currentImageIndex + 1} / ${allMedia.length}`}
              </Text>
            </View>
          )}

          {/* Status Badges */}
          <View style={styles.badgesContainer}>
            {item.is_featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={scale(14)} color="#fff" />
                <Text style={styles.badgeText}>Featured</Text>
              </View>
            )}
            {item.is_available && (
              <View style={styles.availableBadge}>
                <Text style={styles.badgeText}>For Sale</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Price & Condition */}
          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              {item.price && (
                <Text style={styles.price}>{formatPrice(item.price)}</Text>
              )}
              {item.is_negotiable && (
                <Text style={styles.negotiableText}>Negotiable</Text>
              )}
            </View>
            {item.condition && (
              <View style={styles.conditionChip}>
                <Text style={styles.conditionText}>{item.condition}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{item.title || 'Untitled'}</Text>

          {/* Category & Location */}
          <View style={styles.metaRow}>
            {category && typeof category === 'string' && (
              <View style={styles.categoryBadge}>
                <Ionicons name="pricetag-outline" size={scale(16)} color="#10B981" />
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            )}
            {item.city && typeof item.city === 'string' && (
              <View style={styles.locationBadge}>
                <Ionicons name="location-outline" size={scale(16)} color="#007AFF" />
                <Text style={styles.locationText}>{item.city}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {item.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          )}

          {/* Item Specific Details */}
          {renderItemDetails(item, category as string)}

          {/* Posted Date */}
          {item.created_at && (
            <View style={styles.section}>
              <Text style={styles.postedText}>
                {`Posted ${new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}`}
              </Text>
            </View>
          )}

          {/* Seller Reviews */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <View style={styles.reviewsTitleRow}>
                <Text style={styles.reviewsSectionTitle}>Seller Reviews</Text>
                {reviewCount > 0 && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={scale(14)} color="#FFB800" />
                    <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
                    <Text style={styles.reviewCountText}>({reviewCount})</Text>
                  </View>
                )}
              </View>
              {/* Only show review button if user is not the seller */}
              {profile && item?.seller_id !== profile.id && (
                <TouchableOpacity
                  style={styles.addReviewButton}
                  onPress={() => setShowReviewModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={scale(20)} color="#10B981" />
                  <Text style={styles.addReviewText}>Review</Text>
                </TouchableOpacity>
              )}
            </View>

            {reviews.length === 0 ? (
              <View style={styles.noReviewsContainer}>
                <Ionicons name="chatbubble-outline" size={scale(48)} color="#ccc" />
                <Text style={styles.noReviewsText}>No reviews yet</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reviewsScrollContent}
              >
                {reviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Image
                        source={{
                          uri: review.profiles?.profile_picture_url || 'https://via.placeholder.com/40',
                        }}
                        style={styles.reviewerImage}
                      />
                      <View style={styles.reviewerInfo}>
                        <Text style={styles.reviewerName}>{review.profiles?.full_name}</Text>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={star}
                              name={star <= review.rating ? 'star' : 'star-outline'}
                              size={scale(14)}
                              color="#FFB800"
                            />
                          ))}
                        </View>
                      </View>
                      <Text style={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    {review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Seller Card */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerHeader}>
              <Image
                source={{
                  uri: item.profiles?.profile_picture_url || 'https://via.placeholder.com/60',
                }}
                style={styles.sellerImage}
              />
              <View style={styles.sellerInfo}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>{item.profiles?.full_name || 'Unknown Seller'}</Text>
                  {isVerified && (
                    <Ionicons name="checkmark-circle" size={scale(20)} color="#34C759" />
                  )}
                </View>
                <View style={styles.sellerRoleRow}>
                  <Text style={styles.sellerRole}>Seller</Text>
                  {isVerified && (
                    <View style={styles.verifiedBadgeSmall}>
                      <Ionicons name="shield-checkmark" size={scale(12)} color="#34C759" />
                      <Text style={styles.verifiedTextSmall}>Verified</Text>
                    </View>
                  )}
                </View>
                {item.profiles?.average_rating && item.profiles.average_rating > 0 && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={scale(16)} color="#FF9500" />
                    <Text style={styles.ratingText}>
                      {`${item.profiles.average_rating.toFixed(1)} (${item.profiles.total_reviews || 0} reviews)`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Contact Buttons */}
            <View style={styles.contactButtons}>
              <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                <Ionicons name="call" size={scale(20)} color="#007AFF" />
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsAppClick}>
                <Ionicons name="logo-whatsapp" size={scale(24)} color="#fff" />
                <Text style={styles.whatsappButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: spacing.xxxl + spacing.lg }} />
        </View>
      </ScrollView>

      {/* Video Player Modal */}
      {selectedVideoUrl && (
        <VideoPlayer
          visible={!!selectedVideoUrl}
          videoUrl={selectedVideoUrl}
          onClose={() => setSelectedVideoUrl(null)}
        />
      )}

      {/* Review Modal */}
      {item && (
        <ReviewModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          reviewedUserId={item.seller_id}
          reviewedUserName={item.profiles?.full_name || 'Seller'}
          userType="seller"
          onReviewSubmitted={() => {
            if (item.seller_id) {
              fetchSellerReviews(item.seller_id);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

function renderItemDetails(item: MarketplaceItem, category: string) {
  const details: Array<{ icon: string; label: string; value: string }> = [];

  // Helper function to safely add detail
  const addDetail = (condition: any, icon: string, label: string, value: any) => {
    if (condition && value !== null && value !== undefined && value !== '') {
      details.push({ icon, label, value: String(value) });
    }
  };

  // Category-specific details
  switch (category) {
    case 'electronics':
      addDetail(item.brand, 'business', 'Brand', item.brand);
      addDetail(item.model, 'phone-portrait', 'Model', item.model);
      addDetail(item.warranty, 'shield-checkmark', 'Warranty', item.warranty);
      break;

    case 'cars':
      addDetail(item.make, 'car', 'Make', item.make);
      addDetail(item.model, 'car-sport', 'Model', item.model);
      addDetail(item.year, 'calendar', 'Year', item.year);
      addDetail((item as any).mileage, 'speedometer', 'Mileage', (item as any).mileage ? `${(item as any).mileage} km` : null);
      addDetail((item as any).fuel_type, 'water', 'Fuel Type', (item as any).fuel_type);
      addDetail((item as any).transmission, 'settings', 'Transmission', (item as any).transmission);
      break;

    case 'fashion':
      addDetail(item.size, 'resize', 'Size', item.size);
      addDetail(item.color, 'color-palette', 'Color', item.color);
      addDetail(item.brand, 'business', 'Brand', item.brand);
      addDetail((item as any).material, 'brush', 'Material', (item as any).material);
      addDetail((item as any).gender, 'person', 'Gender', (item as any).gender);
      addDetail((item as any).made_in, 'flag', 'Made In', (item as any).made_in);
      break;

    case 'cosmetics':
      addDetail(item.brand, 'business', 'Brand', item.brand);
      addDetail((item as any).volume, 'flask', 'Volume', (item as any).volume);
      addDetail((item as any).scent_type, 'flower', 'Scent', (item as any).scent_type);
      addDetail((item as any).skin_type, 'person', 'Skin Type', (item as any).skin_type);
      addDetail((item as any).expiry_date, 'calendar', 'Expiry Date', (item as any).expiry_date ? new Date((item as any).expiry_date).toLocaleDateString() : null);
      addDetail((item as any).is_organic, 'leaf', 'Organic', 'Yes');
      addDetail((item as any).made_in, 'flag', 'Made In', (item as any).made_in);
      break;

    case 'house_items':
      addDetail(item.brand, 'business', 'Brand', item.brand);
      addDetail((item as any).category_type, 'grid', 'Category', (item as any).category_type);
      addDetail((item as any).made_in, 'flag', 'Made In', (item as any).made_in);
      break;

    case 'businesses':
      addDetail((item as any).business_type, 'briefcase', 'Business Type', (item as any).business_type);
      addDetail((item as any).year_established, 'calendar', 'Year Established', (item as any).year_established);
      addDetail((item as any).number_of_employees, 'people', 'Employees', (item as any).number_of_employees);
      addDetail((item as any).monthly_revenue, 'trending-up', 'Monthly Revenue', (item as any).monthly_revenue ? formatPrice((item as any).monthly_revenue) : null);
      addDetail((item as any).annual_revenue, 'stats-chart', 'Annual Revenue', (item as any).annual_revenue ? formatPrice((item as any).annual_revenue) : null);
      addDetail((item as any).location_address, 'location', 'Location', (item as any).location_address);
      break;

    case 'properties':
    case 'properties_for_sale':
      addDetail((item as any).property_type, 'home', 'Property Type', (item as any).property_type);
      addDetail((item as any).address, 'location', 'Address', (item as any).address);
      addDetail((item as any).bedrooms, 'bed', 'Bedrooms', (item as any).bedrooms);
      addDetail((item as any).bathrooms, 'water', 'Bathrooms', (item as any).bathrooms);
      break;
  }

  if (details.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Specifications</Text>
      <View style={styles.specsGrid}>
        {details.map((detail, index) => (
          <View key={index} style={styles.specItem}>
            <View style={styles.specIcon}>
              <Ionicons name={detail.icon as any} size={scale(20)} color="#10B981" />
            </View>
            <View style={styles.specContent}>
              <Text style={styles.specLabel}>{detail.label}</Text>
              <Text style={styles.specValue}>{detail.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: '#666',
  },
  galleryContainer: {
    height: hp(45),
    position: 'relative',
    backgroundColor: '#f5f5f5',
  },
  galleryImage: {
    height: hp(45),
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: '#999',
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  topActions: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    zIndex: 10,
  },
  actionButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  imageCounter: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xs / 2,
    borderRadius: scale(20),
  },
  counterText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  badgesContainer: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  featuredBadge: {
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xs / 2,
    borderRadius: scale(20),
    gap: spacing.xs,
  },
  availableBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xs / 2,
    borderRadius: scale(20),
  },
  badgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  content: {
    padding: spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.base,
  },
  price: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: '#2563EB',
  },
  negotiableText: {
    fontSize: fontSize.sm,
    color: '#10B981',
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  conditionChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: scale(20),
  },
  conditionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.md,
    lineHeight: fontSize.xxxl,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#E8F5F0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: scale(8),
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: '#10B981',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    fontSize: fontSize.base,
    color: '#007AFF',
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.md,
  },
  specsGrid: {
    gap: spacing.md,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: spacing.base,
    borderRadius: scale(12),
    gap: spacing.md,
  },
  specIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#E8F5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  specContent: {
    flex: 1,
  },
  specLabel: {
    fontSize: fontSize.sm,
    color: '#666',
    marginBottom: spacing.xs / 2,
  },
  specValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: fontSize.xl,
    color: '#666',
  },
  postedText: {
    fontSize: fontSize.sm,
    color: '#999',
  },
  sellerCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: scale(16),
    padding: spacing.lg,
    marginBottom: spacing.xs / 2,
  },
  sellerHeader: {
    flexDirection: 'row',
    marginBottom: spacing.base,
  },
  sellerImage: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: '#e0e0e0',
    marginRight: spacing.base,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xs / 2,
    marginBottom: spacing.xs,
  },
  sellerName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sellerRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sellerRole: {
    fontSize: fontSize.sm,
    color: '#666',
  },
  verifiedBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: scale(10),
  },
  verifiedTextSmall: {
    fontSize: fontSize.xs - 1,
    color: '#34C759',
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: '#666',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#fff',
    paddingVertical: spacing.base,
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  callButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#007AFF',
  },
  whatsappButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#25D366',
    paddingVertical: spacing.base,
    borderRadius: scale(12),
  },
  whatsappButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  videoThumbnail: {
    width: scale(200),
    height: scale(120),
    borderRadius: scale(12),
    marginRight: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: scale(-24),
    marginLeft: scale(-24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconLarge: {
    marginBottom: spacing.md,
  },
  videoLabel: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  reviewsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  reviewsSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: '#F0FDF4',
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#10B981',
  },
  addReviewText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#10B981',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: scale(12),
  },
  ratingText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  reviewCountText: {
    fontSize: fontSize.sm,
    color: '#666',
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  noReviewsText: {
    fontSize: fontSize.base,
    color: '#999',
    marginTop: spacing.md,
  },
  reviewsScrollContent: {
    gap: spacing.base,
    paddingRight: spacing.lg,
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: scale(12),
    padding: spacing.base,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    width: wp(75),
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  reviewerImage: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    marginRight: spacing.md,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: spacing.xs / 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.xs / 2,
  },
  reviewDate: {
    fontSize: fontSize.xs,
    color: '#999',
  },
  reviewComment: {
    fontSize: fontSize.sm,
    color: '#333',
    lineHeight: fontSize.lg,
  },
});

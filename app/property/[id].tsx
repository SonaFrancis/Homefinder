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
import { supabase, RentalProperty } from '@/lib/supabase';
import { formatPrice, formatWhatsAppLink } from '@/utils/validation';
import { wp, hp, spacing, fontSize, scale, screen } from '@/utils/responsive';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ReviewModal } from '@/components/ReviewModal';
import { useAuthStore } from '@/store/authStore';

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

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuthStore();
  const [property, setProperty] = useState<RentalProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('rental_properties')
        .select(`
          *,
          profiles!rental_properties_seller_id_fkey (*),
          rental_property_media (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProperty(data);

      // Fetch reviews for the landlord
      if (data?.landlord_id) {
        fetchLandlordReviews(data.landlord_id);
      }
    } catch (error) {
      console.error('Error fetching property:', error);
      Alert.alert('Error', 'Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLandlordReviews = async (landlordId: string) => {
    try {
      console.log('Fetching reviews for landlord:', landlordId);
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles!reviews_reviewer_id_fkey (
            full_name,
            profile_picture_url
          )
        `)
        .eq('reviewed_user_id', landlordId)
        .eq('listing_type', 'rental')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching reviews:', error);
        throw error;
      }

      console.log('Reviews fetched:', data?.length || 0);
      setReviews(data || []);
      setReviewCount(data?.length || 0);

      // Calculate average rating
      if (data && data.length > 0) {
        const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    } catch (error) {
      console.error('Error in fetchLandlordReviews:', error);
    }
  };

  const handleWhatsAppClick = async () => {
    const phone = property?.profiles?.whatsapp_number || property?.profiles?.phone_number;
    if (!phone) {
      Alert.alert('Contact Unavailable', 'WhatsApp number not provided');
      return;
    }

    // Create detailed message with property information
    const message = `Hi, I'm interested in this property:

📍 *${property.title}*
💰 Price: ${formatPrice(property.price)}/month
📌 Location: ${property.city}${property.area ? `, ${property.area}` : ''}
🏠 Type: ${property.property_type || 'N/A'}
🛏️ Bedrooms: ${property.bedrooms || 'N/A'}
🚿 Bathrooms: ${property.bathrooms || 'N/A'}

${property.description ? `📝 Description: ${property.description.substring(0, 100)}${property.description.length > 100 ? '...' : ''}` : ''}

I'd like to get more information about this property. When can we discuss?`;

    console.log('WhatsApp Message:', message);
    const whatsappUrl = formatWhatsAppLink(phone, message);
    console.log('WhatsApp URL:', whatsappUrl);

    // Increment WhatsApp click counter
    await supabase.rpc('increment_whatsapp_clicks', {
      listing_table: 'rental_properties',
      listing_uuid: property.id,
    });

    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      Linking.openURL(whatsappUrl);
    } else {
      Alert.alert('Error', 'WhatsApp is not installed on your device');
    }
  };

  const handleShare = async () => {
    if (!property) return;

    try {
      await Share.share({
        message: `Check out this property: ${property.title}\n\n${formatPrice(property.price)}/month\n\nView details in the app!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCall = () => {
    const phone = property?.profiles?.phone_number || property?.profiles?.whatsapp_number;
    if (!phone) {
      Alert.alert('Contact Unavailable', 'Phone number not provided');
      return;
    }

    Linking.openURL(`tel:${phone}`);
  };

  if (loading || !property) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading property...</Text>
      </SafeAreaView>
    );
  }

  const images = property.rental_property_media?.filter(m => m.media_type === 'image') || [];
  const videos = property.rental_property_media?.filter(m => m.media_type === 'video') || [];
  const isVerified = property.profiles?.is_verified;

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
              <Ionicons name="home-outline" size={scale(80)} color="#ccc" />
              <Text style={styles.noImageText}>No images available</Text>
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={scale(24)} color="#1a1a1a" />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={scale(24)} color="#1a1a1a" />
          </TouchableOpacity>

          {/* Media Counter */}
          {allMedia.length > 0 && (
            <View style={styles.imageCounter}>
              <Text style={styles.counterText}>
                {`${currentImageIndex + 1} / ${allMedia.length}`}
              </Text>
            </View>
          )}

          {/* Featured Badge */}
          {property.is_featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={scale(14)} color="#fff" />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Price & Property Type */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.price}>{formatPrice(property.price)}</Text>
              <Text style={styles.priceLabel}>per month</Text>
            </View>
            <View style={styles.typeChip}>
              <Text style={styles.typeText}>{property.property_type}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{property.title}</Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={scale(20)} color="#007AFF" />
            <Text style={styles.locationText}>
              {property.address || property.city}
            </Text>
          </View>

          {/* Landmarks */}
          {property.landmarks && (
            <View style={styles.landmarksRow}>
              <Ionicons name="navigate" size={scale(18)} color="#10B981" />
              <Text style={styles.landmarksText}>{property.landmarks}</Text>
            </View>
          )}

          {/* Property Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="bed" size={scale(24)} color="#007AFF" />
              </View>
              <Text style={styles.statValue}>{property.bedrooms}</Text>
              <Text style={styles.statLabel}>Bedrooms</Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="water" size={scale(24)} color="#007AFF" />
              </View>
              <Text style={styles.statValue}>{property.bathrooms}</Text>
              <Text style={styles.statLabel}>Bathrooms</Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="resize" size={scale(24)} color="#007AFF" />
              </View>
              <Text style={styles.statValue}>{property.square_meters}</Text>
              <Text style={styles.statLabel}>m²</Text>
            </View>

            {property.is_furnished && (
              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <Ionicons name="bed" size={scale(24)} color="#007AFF" />
                </View>
                <Text style={styles.statValue}>✓</Text>
                <Text style={styles.statLabel}>Furnished</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{property.description}</Text>
          </View>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {property.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityItem}>
                    <Ionicons name="checkmark-circle" size={scale(20)} color="#34C759" />
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Landlord Reviews */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <View style={styles.reviewsTitleRow}>
                <Text style={styles.reviewsSectionTitle}>Landlord Reviews</Text>
                {reviewCount > 0 && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={scale(14)} color="#FFB800" />
                    <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
                    <Text style={styles.reviewCountText}>({reviewCount})</Text>
                  </View>
                )}
              </View>
              {/* Only show review button if user is not the landlord */}
              {profile && property?.landlord_id !== profile.id && (
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

          {/* Landlord Card */}
          <View style={styles.landlordCard}>
            <View style={styles.landlordHeader}>
              <Image
                source={{
                  uri: property.profiles?.profile_picture_url || 'https://via.placeholder.com/60',
                }}
                style={styles.landlordImage}
              />
              <View style={styles.landlordInfo}>
                <View style={styles.landlordNameRow}>
                  <Text style={styles.landlordName}>{property.profiles?.full_name}</Text>
                  {isVerified && (
                    <Ionicons name="checkmark-circle" size={scale(20)} color="#34C759" />
                  )}
                </View>
                <View style={styles.landlordRoleRow}>
                  <Text style={styles.landlordRole}>
                    {property.profiles?.role === 'landlord' ? 'Landlord' : 'Seller'}
                  </Text>
                  {isVerified && (
                    <View style={styles.verifiedBadgeSmall}>
                      <Ionicons name="shield-checkmark" size={scale(12)} color="#34C759" />
                      <Text style={styles.verifiedTextSmall}>Verified</Text>
                    </View>
                  )}
                </View>
                {property.profiles?.average_rating > 0 && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={scale(16)} color="#FF9500" />
                    <Text style={styles.ratingText}>
                      {`${property.profiles.average_rating.toFixed(1)} (${property.profiles.total_reviews} reviews)`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Contact Buttons */}
            <View style={styles.contactButtons}>
              <TouchableOpacity
                style={styles.callButton}
                onPress={handleCall}
              >
                <Ionicons name="call" size={scale(20)} color="#007AFF" />
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.whatsappButton}
                onPress={handleWhatsAppClick}
              >
                <Ionicons name="logo-whatsapp" size={scale(24)} color="#fff" />
                <Text style={styles.whatsappButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: spacing.xxxl + spacing.xxl }} />
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
      {property && (
        <ReviewModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          reviewedUserId={property.landlord_id}
          reviewedUserName={property.profiles?.full_name || 'Landlord'}
          userType="landlord"
          onReviewSubmitted={() => {
            if (property.landlord_id) {
              fetchLandlordReviews(property.landlord_id);
            }
          }}
        />
      )}
    </SafeAreaView>
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
  },
  galleryImage: {
    height: hp(45),
    backgroundColor: '#e0e0e0',
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
  shareButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.lg,
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
  featuredBadge: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xs / 2,
    borderRadius: scale(20),
    gap: spacing.xs,
  },
  featuredText: {
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
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  price: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: '#007AFF',
  },
  priceLabel: {
    fontSize: fontSize.sm,
    color: '#666',
    marginTop: spacing.xs / 2,
  },
  typeChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: scale(20),
  },
  typeText: {
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xs / 2,
    marginBottom: spacing.sm,
  },
  locationText: {
    fontSize: fontSize.md,
    color: '#007AFF',
    fontWeight: '500',
  },
  landmarksRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + spacing.xs / 2,
    marginBottom: spacing.xl,
    paddingLeft: spacing.xs,
  },
  landmarksText: {
    fontSize: fontSize.sm,
    color: '#10B981',
    fontWeight: '500',
    flex: 1,
    lineHeight: fontSize.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: scale(16),
    padding: spacing.base,
    marginBottom: spacing.xl,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.xs / 2,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: '#666',
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
  description: {
    fontSize: fontSize.base,
    lineHeight: fontSize.xl,
    color: '#666',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: scale(8),
    width: '48%',
  },
  amenityText: {
    fontSize: fontSize.sm,
    color: '#1a1a1a',
    flex: 1,
  },
  videoThumbnail: {
    width: scale(200),
    height: scale(120),
    borderRadius: scale(12),
    marginRight: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  videoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: scale(-20),
    marginLeft: scale(-20),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  landlordCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: scale(16),
    padding: spacing.lg,
    marginBottom: spacing.xs / 2,
  },
  landlordHeader: {
    flexDirection: 'row',
    marginBottom: spacing.base,
  },
  landlordImage: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: '#e0e0e0',
    marginRight: spacing.base,
  },
  landlordInfo: {
    flex: 1,
  },
  landlordNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xs / 2,
    marginBottom: spacing.xs,
  },
  landlordName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  landlordRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  landlordRole: {
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
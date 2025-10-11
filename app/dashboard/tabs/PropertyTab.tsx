import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase, RentalProperty } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { spacing, fontSize, scale } from '@/utils/responsive';
import { useSubscriptionScenario } from '@/hooks/useSubscriptionScenario';
import { useQuotaGuard } from '@/hooks/useQuotaGuard';
import { SubscriptionStatusBanner } from '@/components/SubscriptionStatusBanner';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { getPhoneValidationError, PHONE_PLACEHOLDER } from '@/utils/phoneValidation';

interface MediaAsset {
  uri: string;
  type: 'image' | 'video';
}

const PROPERTY_TYPES = ['Apartment', 'Studio', 'Room', 'House', 'Shared Room'];
const FURNISHED_OPTIONS = ['Furnished', 'Semi-Furnished', 'Unfurnished'];

interface PropertyTabProps {
  onFormStateChange?: (isFormShown: boolean) => void;
  resetTrigger?: number;
}

export default function PropertyTab({ onFormStateChange, resetTrigger }: PropertyTabProps) {
  const { profile, subscription } = useAuthStore();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [listings, setListings] = useState<RentalProperty[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);

  // Get subscription scenario for permissions
  const { scenario } = useSubscriptionScenario(profile?.id);

  // Get upload limits and post quota based on subscription plan
  const getUploadLimits = () => {
    // If subscriptions disabled, return free access limits
    if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
      return {
        maxImages: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxImagesPerPost,
        maxVideos: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxVideosPerPost,
        planName: 'Beta Access'
      };
    }

    const plan = subscription?.subscription_plans;
    return {
      maxImages: plan?.max_images_per_post || 5,
      maxVideos: plan?.max_videos_per_post || 1,
      planName: plan?.display_name || 'Standard'
    };
  };

  const getPostQuota = () => {
    // If subscriptions disabled, return unlimited quota
    if (!FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS) {
      return {
        postsUsed: 0,
        maxPosts: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxPostsPerMonth,
        postsRemaining: FEATURE_FLAGS.FREE_ACCESS_LIMITS.maxPostsPerMonth,
        canPost: true
      };
    }

    const plan = subscription?.subscription_plans;
    const postsUsed = subscription?.posts_used_this_month || 0;
    const maxPosts = plan?.max_posts_per_month || 20;
    return {
      postsUsed,
      maxPosts,
      postsRemaining: maxPosts - postsUsed,
      canPost: postsUsed < maxPosts
    };
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Apartment',
    price: '',
    city: '',
    street: '',
    landmarks: '',
    bedrooms: '',
    bathrooms: '',
    squareMeters: '',
    furnished: 'Unfurnished',
    amenities: '',
    contactNumber: '',
  });

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      setShowForm(false);
    }
  }, [resetTrigger]);

  const fetchListings = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rental_properties')
        .select(`
          *,
          rental_property_media (*)
        `)
        .eq('landlord_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      Alert.alert('Error', 'Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  const pickMedia = async () => {
    // Check post quota before allowing media upload (only for new posts, not edits)
    if (!editingPropertyId) {
      const quota = getPostQuota();
      if (!quota.canPost) {
        Alert.alert(
          'Post Quota Exhausted',
          `You've used all ${quota.maxPosts} posts (${quota.postsUsed}/${quota.maxPosts}).\n\nRenew your subscription or upgrade to a higher plan to get more posts.`,
          [
            { text: 'OK', style: 'cancel' }
          ]
        );
        return;
      }
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos and videos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const MAX_VIDEO_SIZE = 15 * 1024 * 1024; // 15MB in bytes
      const limits = getUploadLimits();
      const newMedia: MediaAsset[] = [];

      for (const asset of result.assets) {
        const type = asset.type === 'video' ? 'video' : 'image';

        // Count existing and new media
        const existingImages = selectedMedia.filter(m => m.type === 'image').length;
        const existingVideos = selectedMedia.filter(m => m.type === 'video').length;
        const newImages = newMedia.filter(m => m.type === 'image').length;
        const newVideos = newMedia.filter(m => m.type === 'video').length;

        // Check image limit
        if (type === 'image' && (existingImages + newImages) >= limits.maxImages) {
          Alert.alert(
            'Image Limit Reached',
            `Your ${limits.planName} plan allows ${limits.maxImages} image${limits.maxImages > 1 ? 's' : ''} per post. Please remove existing images or upgrade your plan.`
          );
          continue;
        }

        // Check video limit
        if (type === 'video' && (existingVideos + newVideos) >= limits.maxVideos) {
          Alert.alert(
            'Video Limit Reached',
            `Your ${limits.planName} plan allows ${limits.maxVideos} video${limits.maxVideos > 1 ? 's' : ''} per post. Please remove existing video${limits.maxVideos > 1 ? 's' : ''} or upgrade your plan.`
          );
          continue;
        }

        // Check video file size
        if (type === 'video') {
          try {
            const fileInfo = await FileSystem.getInfoAsync(asset.uri);

            if (fileInfo.exists && fileInfo.size) {
              if (fileInfo.size > MAX_VIDEO_SIZE) {
                const sizeMB = (fileInfo.size / (1024 * 1024)).toFixed(2);
                Alert.alert(
                  'Video Too Large',
                  `The selected video is ${sizeMB}MB. Maximum allowed size is 15MB. Please select a smaller video or compress it.`
                );
                continue;
              }
            }
          } catch (error) {
            console.error('Error checking video size:', error);
            Alert.alert('Error', 'Could not verify video size. Please try again.');
            continue;
          }
        }

        newMedia.push({
          uri: asset.uri,
          type
        });
      }

      setSelectedMedia([...selectedMedia, ...newMedia]);
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(selectedMedia.filter((_, i) => i !== index));
  };

  const uploadMediaToStorage = async (media: MediaAsset, propertyId: string): Promise<string | null> => {
    try {
      // Get file extension
      let fileExt = media.uri.split('.').pop()?.toLowerCase() || 'jpg';

      // Handle Android content URIs - default to appropriate extension based on type
      if (!fileExt || fileExt.includes('?') || fileExt.length > 4) {
        fileExt = media.type === 'video' ? 'mp4' : 'jpg';
      }

      const fileName = `${propertyId}-${Date.now()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      console.log('Uploading media:', { uri: media.uri, type: media.type, fileExt });

      // Read file as base64 with error handling for Android
      let base64: string;
      try {
        base64 = await FileSystem.readAsStringAsync(media.uri, {
          encoding: 'base64',
        });
      } catch (readError) {
        console.error('Error reading file:', readError);
        throw new Error('Failed to read file. Please try again.');
      }

      if (!base64) {
        throw new Error('File is empty or could not be read');
      }

      console.log('File read successfully, size:', base64.length);

      // Determine content type
      const contentType = media.type === 'video'
        ? (fileExt === 'mov' ? 'video/quicktime' : 'video/mp4')
        : `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('rental-property-media')
        .upload(filePath, decode(base64), {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      console.log('Upload successful:', filePath);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('rental-property-media')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
      Alert.alert('Upload Error', error instanceof Error ? error.message : 'Failed to upload media');
      return null;
    }
  };

  const handleSubmit = async () => {
    // Check post quota (only for new posts, not edits)
    if (!editingPropertyId) {
      const quota = getPostQuota();
      if (!quota.canPost) {
        Alert.alert(
          'Post Limit Reached',
          `You've used all ${quota.maxPosts} posts (${quota.postsUsed}/${quota.maxPosts}).\n\nRenew your subscription or upgrade to a higher plan to get more posts.`,
          [
            { text: 'Upgrade Plan', onPress: () => {} },
            { text: 'OK', style: 'cancel' }
          ]
        );
        return;
      }
    }

    // Validation
    if (!formData.title.trim()) {
      Alert.alert('Required', 'Please enter property title');
      return;
    }
    if (!formData.price.trim()) {
      Alert.alert('Required', 'Please enter price');
      return;
    }
    if (!formData.city.trim()) {
      Alert.alert('Required', 'Please enter city');
      return;
    }
    if (!formData.contactNumber.trim()) {
      Alert.alert('Required', 'Please enter contact number');
      return;
    }

    // Validate contact number format
    const phoneError = getPhoneValidationError(formData.contactNumber);
    if (phoneError) {
      Alert.alert('Invalid Contact Number', phoneError);
      return;
    }

    if (selectedMedia.length === 0) {
      Alert.alert('Required', 'Please upload at least one photo or video');
      return;
    }
    if (!profile?.id) {
      Alert.alert('Error', 'You must be logged in to post');
      return;
    }

    setSubmitting(true);

    try {
      const amenitiesArray = formData.amenities
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);

      const propertyData = {
        landlord_id: profile.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        property_type: formData.type,
        price: parseInt(formData.price),
        city: formData.city.trim(),
        street: formData.street.trim() || null,
        landmarks: formData.landmarks.trim() || null,
        contact_number: formData.contactNumber.trim() || null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        square_meters: formData.squareMeters ? parseInt(formData.squareMeters) : null,
        amenities: amenitiesArray.length > 0 ? amenitiesArray : null,
        is_furnished: formData.furnished === 'Furnished',
        listing_status: 'approved',
        is_verified: false,
        is_available: true,
      };

      let property: any;
      let propertyError: any;

      if (editingPropertyId) {
        // Update existing property
        const { data, error } = await supabase
          .from('rental_properties')
          .update(propertyData)
          .eq('id', editingPropertyId)
          .select()
          .single();

        property = data;
        propertyError = error;
      } else {
        // Create new property
        const { data, error } = await supabase
          .from('rental_properties')
          .insert(propertyData)
          .select()
          .single();

        property = data;
        propertyError = error;
      }

      if (propertyError) throw propertyError;

      // 2. Upload media files
      const mediaUploadPromises = selectedMedia.map(async (media, index) => {
        const publicUrl = await uploadMediaToStorage(media, property.id);
        if (!publicUrl) return null;

        return {
          property_id: property.id,
          media_type: media.type,
          media_url: publicUrl,
          display_order: index,
        };
      });

      const mediaRecords = (await Promise.all(mediaUploadPromises)).filter(Boolean);

      // 3. Insert media records
      // LAYER 2: Database trigger will also validate quota
      if (mediaRecords.length > 0) {
        const { error: mediaError } = await supabase
          .from('rental_property_media')
          .insert(mediaRecords);

        if (mediaError) {
          // Catch quota errors from database trigger
          if (mediaError.message.includes('quota') || mediaError.message.includes('exceeded')) {
            Alert.alert('Upload Failed', 'Media quota exceeded. Please upgrade your plan.');
            throw mediaError;
          }
          throw mediaError;
        }
      }

      // 4. Increment post count for new posts (not edits)
      if (!editingPropertyId) {
        await supabase
          .from('user_subscriptions')
          .update({
            posts_used_this_month: (subscription?.posts_used_this_month || 0) + 1
          })
          .eq('user_id', profile.id)
          .eq('status', 'active');
      }

      // 5. Update profile WhatsApp number if provided
      if (formData.contactNumber && formData.contactNumber !== profile.whatsapp_number) {
        await supabase
          .from('profiles')
          .update({ whatsapp_number: formData.contactNumber })
          .eq('id', profile.id);
      }

      Alert.alert('Success', editingPropertyId ? 'Property updated successfully!' : 'Property listing submitted for review!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setFormData({
              title: '',
              description: '',
              type: 'Apartment',
              price: '',
              city: '',
              street: '',
              landmarks: '',
              bedrooms: '',
              bathrooms: '',
              squareMeters: '',
              furnished: 'Unfurnished',
              amenities: '',
              contactNumber: '',
            });
            setSelectedMedia([]);
            setEditingPropertyId(null);
            setShowForm(false);
            onFormStateChange?.(false);
            fetchListings();
          }
        }
      ]);
    } catch (error: any) {
      console.error('Error submitting property:', error);
      // Check for quota-related errors from database
      if (error.message && (error.message.includes('quota') || error.message.includes('limit'))) {
        Alert.alert('Quota Exceeded', 'Your listing quota is full. Please upgrade or wait for monthly reset.');
      } else {
        Alert.alert('Error', error.message || 'Failed to submit property listing');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this property listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('rental_properties')
                .delete()
                .eq('id', id);

              if (error) throw error;

              setListings(listings.filter(item => item.id !== id));
              Alert.alert('Success', 'Listing deleted successfully');
            } catch (error: any) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', 'Failed to delete listing');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (listing: RentalProperty) => {
    // Check if user can edit listings (Scenario 3: Grace period ended)
    if (scenario && !scenario.can_edit_listings) {
      Alert.alert(
        'Editing Disabled',
        'Your subscription has expired and the grace period has ended. Renew your subscription to edit your listings.',
        [
          { text: 'Renew Now', onPress: () => router.push('/subscription') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // Set editing mode
    setEditingPropertyId(listing.id);

    // Populate form with listing data
    setFormData({
      title: listing.title,
      description: listing.description,
      type: listing.property_type,
      price: listing.price.toString(),
      city: listing.city,
      street: listing.street || '',
      landmarks: listing.landmarks || '',
      bedrooms: listing.bedrooms?.toString() || '',
      bathrooms: listing.bathrooms?.toString() || '',
      squareMeters: listing.square_meters?.toString() || '',
      furnished: listing.is_furnished ? 'Furnished' : 'Unfurnished',
      amenities: listing.amenities?.join(', ') || '',
      contactNumber: listing.contact_number || profile?.whatsapp_number || '',
    });

    // Load existing media
    if (listing.rental_property_media && listing.rental_property_media.length > 0) {
      const existingMedia: MediaAsset[] = listing.rental_property_media.map(m => ({
        uri: m.media_url,
        type: m.media_type as 'image' | 'video',
      }));
      setSelectedMedia(existingMedia);
    } else {
      setSelectedMedia([]);
    }

    setShowForm(true);
    onFormStateChange?.(true);
  };

  if (showForm) {
    const quota = getPostQuota();
    const limits = getUploadLimits();

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Property Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="e.g., Modern 2 Bedroom Apartment in Buea"
              placeholderTextColor="#999"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Detailed description of your property..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Property Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Property Type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipsContainer}>
                {PROPERTY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      formData.type === type && styles.chipActive,
                    ]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        formData.type === type && styles.chipTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monthly Rent (FCFA) *</Text>
            <TextInput
              style={styles.input}
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
              placeholder="e.g., 80000"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          {/* City */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              placeholder="e.g., Buea, Douala"
              placeholderTextColor="#999"
            />
          </View>

          {/* Street */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street</Text>
            <TextInput
              style={styles.input}
              value={formData.street}
              onChangeText={(text) => setFormData({ ...formData, street: text })}
              placeholder="e.g., Molyko, Near UB"
              placeholderTextColor="#999"
            />
          </View>

          {/* Landmarks */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Landmarks</Text>
            <TextInput
              style={styles.input}
              value={formData.landmarks}
              onChangeText={(text) => setFormData({ ...formData, landmarks: text })}
              placeholder="e.g., Near University of Buea, Close to Total Station"
              placeholderTextColor="#999"
            />
          </View>

          {/* Bedrooms & Bathrooms */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Bedrooms</Text>
              <TextInput
                style={styles.input}
                value={formData.bedrooms}
                onChangeText={(text) => setFormData({ ...formData, bedrooms: text })}
                placeholder="e.g., 2"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Bathrooms</Text>
              <TextInput
                style={styles.input}
                value={formData.bathrooms}
                onChangeText={(text) => setFormData({ ...formData, bathrooms: text })}
                placeholder="e.g., 1"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Square Meters */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Square Meters</Text>
            <TextInput
              style={styles.input}
              value={formData.squareMeters}
              onChangeText={(text) => setFormData({ ...formData, squareMeters: text })}
              placeholder="e.g., 60"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          {/* Furnished */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Furnished Status</Text>
            <View style={styles.chipsContainer}>
              {FURNISHED_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.chip,
                    formData.furnished === option && styles.chipActive,
                  ]}
                  onPress={() => setFormData({ ...formData, furnished: option })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      formData.furnished === option && styles.chipTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amenities */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amenities</Text>
            <TextInput
              style={styles.input}
              value={formData.amenities}
              onChangeText={(text) => setFormData({ ...formData, amenities: text })}
              placeholder="e.g., WiFi, Parking, Security, etc."
              placeholderTextColor="#999"
            />
          </View>

          {/* Contact Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Number (WhatsApp) *</Text>
            <TextInput
              style={styles.input}
              value={formData.contactNumber}
              onChangeText={(text) => setFormData({ ...formData, contactNumber: text })}
              placeholder={PHONE_PLACEHOLDER}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          {/* Media Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Photos & Videos *</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickMedia}>
              <Ionicons name="cloud-upload-outline" size={scale(32)} color="#10B981" />
              <Text style={styles.uploadText}>Upload Photos or Videos</Text>
              <Text style={styles.uploadHint}>From your device gallery</Text>
              <Text style={styles.uploadLimit}>
                {(() => {
                  const limits = getUploadLimits();
                  return `Max ${limits.maxImages} image${limits.maxImages > 1 ? 's' : ''} & ${limits.maxVideos} video${limits.maxVideos > 1 ? 's' : ''} per post (15MB max per video)`;
                })()}
              </Text>
            </TouchableOpacity>

            {/* Media Preview */}
            {selectedMedia.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.mediaPreview}>
                  {selectedMedia.map((media, index) => (
                    <View key={index} style={styles.mediaItem}>
                      <Image source={{ uri: media.uri }} style={styles.mediaImage} />
                      {media.type === 'video' && (
                        <View style={styles.videoIndicator}>
                          <Ionicons name="play-circle" size={scale(32)} color="#fff" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeMedia(index)}
                      >
                        <Ionicons name="close-circle" size={scale(24)} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (submitting || (!editingPropertyId && !getPostQuota().canPost)) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={submitting || (!editingPropertyId && !getPostQuota().canPost)}
          >
            {submitting ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.submitButtonText}>Uploading...</Text>
              </>
            ) : (
              <>
                <Text style={styles.submitButtonText}>Post Property Listing</Text>
                <Ionicons name="checkmark-circle" size={scale(20)} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading your listings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Property Listings</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setShowForm(true);
            onFormStateChange?.(true);
          }}
        >
          <Ionicons name="add-circle" size={scale(24)} color="#10B981" />
          <Text style={styles.addButtonText}>Add Property</Text>
        </TouchableOpacity>
      </View>

      {/* Listings */}
      {listings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="home-outline" size={scale(64)} color="#ccc" />
          <Text style={styles.emptyTitle}>No properties listed yet</Text>
          <Text style={styles.emptyText}>
            Start by adding your first property listing
          </Text>
        </View>
      ) : (
        <View style={styles.listingsContainer}>
          {listings.map((listing) => {
            const firstMedia = listing.rental_property_media?.[0];
            const imageUrl = firstMedia?.media_url || 'https://via.placeholder.com/100';

            return (
              <View key={listing.id} style={styles.listingCard}>
                <View style={styles.imageContainer}>
                  <Image source={{ uri: imageUrl }} style={styles.listingImage} />
                  {!listing.is_available && (
                    <View style={styles.inactiveBadge}>
                      <Ionicons name="eye-off-outline" size={scale(12)} color="#fff" />
                      <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
                    </View>
                  )}
                </View>
                <View style={styles.listingInfo}>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {listing.title}
                  </Text>
                  <Text style={styles.listingPrice}>
                    {listing.price.toLocaleString('fr-FR')} FCFA/month
                  </Text>
                  <View style={styles.listingDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="location-outline" size={scale(14)} color="#666" />
                      <Text style={styles.detailText}>{listing.city}</Text>
                    </View>
                    {listing.bedrooms && (
                      <View style={styles.detailItem}>
                        <Ionicons name="bed-outline" size={scale(14)} color="#666" />
                        <Text style={styles.detailText}>{listing.bedrooms} Beds</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.editButton,
                        scenario && !scenario.can_edit_listings && styles.editButtonDisabled
                      ]}
                      onPress={() => handleEdit(listing)}
                      disabled={scenario && !scenario.can_edit_listings}
                    >
                      <Ionicons
                        name="create-outline"
                        size={scale(16)}
                        color={scenario && !scenario.can_edit_listings ? '#9CA3AF' : '#10B981'}
                      />
                      <Text style={[
                        styles.editButtonText,
                        scenario && !scenario.can_edit_listings && styles.editButtonTextDisabled
                      ]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(listing.id)}
                    >
                      <Ionicons name="trash-outline" size={scale(16)} color="#EF4444" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
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
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#E8F5F0',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
  },
  addButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#666',
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: '#999',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  listingsContainer: {
    padding: spacing.lg,
    gap: spacing.base,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android shadow
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: scale(100),
    height: scale(120),
  },
  listingImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  inactiveBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs,
    gap: spacing.xs / 2,
  },
  inactiveBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  listingInfo: {
    flex: 1,
    padding: spacing.md,
  },
  listingTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: spacing.xs,
  },
  listingPrice: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: spacing.sm,
  },
  listingDetails: {
    flexDirection: 'row',
    gap: spacing.base,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
  },
  editButton: {
    backgroundColor: '#E8F5F0',
  },
  editButtonDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.5,
  },
  editButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#10B981',
  },
  editButtonTextDisabled: {
    color: '#9CA3AF',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#EF4444',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  placeholder: {
    width: scale(40),
  },
  form: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: scale(100),
    textAlignVertical: 'top',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipActive: {
    backgroundColor: '#E8F5F0',
    borderColor: '#10B981',
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#666',
  },
  chipTextActive: {
    color: '#10B981',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  uploadButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: spacing.md,
    padding: spacing.xxxl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
  },
  uploadText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#10B981',
    marginTop: spacing.sm,
  },
  uploadHint: {
    fontSize: fontSize.sm,
    color: '#999',
    marginTop: spacing.xs,
  },
  uploadLimit: {
    fontSize: fontSize.xs,
    color: '#FF9500',
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  mediaPreview: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  mediaItem: {
    position: 'relative',
  },
  mediaImage: {
    width: scale(100),
    height: scale(100),
    borderRadius: spacing.sm,
    backgroundColor: '#e0e0e0',
  },
  videoIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: spacing.sm,
  },
  removeButton: {
    position: 'absolute',
    top: -spacing.sm,
    right: -spacing.sm,
    backgroundColor: '#fff',
    borderRadius: scale(12),
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#10B981',
    paddingVertical: spacing.base,
    borderRadius: spacing.md,
    marginTop: spacing.lg,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  loadingText: {
    fontSize: fontSize.base,
    color: '#666',
    marginTop: spacing.md,
  },
  quotaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    backgroundColor: '#F9FAFB',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quotaInfoCard: {
    backgroundColor: '#E8F5F0',
    padding: spacing.base,
    borderRadius: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  quotaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  quotaTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: '#10B981',
  },
  quotaText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: spacing.xs / 2,
  },
  quotaSubtext: {
    fontSize: fontSize.sm,
    color: '#666',
  },
});

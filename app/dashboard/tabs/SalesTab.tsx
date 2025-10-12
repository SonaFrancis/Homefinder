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
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { spacing, fontSize, scale } from '@/utils/responsive';
import {
  uploadMarketplaceMedia,
  createMarketplaceItem,
  updateMarketplaceItem,
  deleteMarketplaceItem,
  markItemAsSold,
  fetchUserMarketplaceItems,
  MarketplaceCategory,
} from '@/lib/marketplace-submit';
import { useSubscriptionScenario } from '@/hooks/useSubscriptionScenario';
import { useQuotaGuard } from '@/hooks/useQuotaGuard';
import { SubscriptionStatusBanner } from '@/components/SubscriptionStatusBanner';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { getPhoneValidationError, PHONE_PLACEHOLDER } from '@/utils/phoneValidation';
import { processVideo, showVideoValidationError, getVideoLimits } from '@/utils/videoProcessor';
import { VideoProcessingModal } from '@/components/VideoProcessingModal';

interface MediaAsset {
  uri: string;
  type: 'image' | 'video';
}

interface MarketplaceItemWithMedia {
  id: string;
  title: string;
  price: number;
  city: string;
  category_id: string;
  condition?: string;
  listing_status: string;
  [key: string]: any;
}

const CATEGORIES = [
  { id: 'electronics', name: 'Electronics', icon: 'laptop-outline' },
  { id: 'house_items', name: 'House Items', icon: 'home-outline' },
  { id: 'cars', name: 'Cars', icon: 'car-outline' },
  { id: 'properties_for_sale', name: 'Properties', icon: 'business-outline' },
  { id: 'fashion', name: 'Fashion', icon: 'shirt-outline' },
  { id: 'cosmetics', name: 'Cosmetics', icon: 'flower-outline' },
  { id: 'businesses', name: 'Businesses', icon: 'briefcase-outline' },
];

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];
const TRANSMISSION_TYPES = ['Automatic', 'Manual'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid'];
const GENDER_OPTIONS = ['Male', 'Female'];
const SKIN_TYPE_OPTIONS = ['All Skin Types', 'Dry', 'Oily', 'Combination', 'Sensitive'];

interface SalesTabProps {
  onCategoryChange?: (category: string) => void;
  resetTrigger?: number;
  onCategorySelectionChange?: (isSelecting: boolean) => void;
  showCategorySelectionExternal?: boolean;
}

export default function SalesTab({ onCategoryChange, resetTrigger, onCategorySelectionChange, showCategorySelectionExternal }: SalesTabProps) {
  const { profile, subscription } = useAuthStore();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [showCategorySelection, setShowCategorySelection] = useState(false);
  const [items, setItems] = useState<MarketplaceItemWithMedia[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [videoProcessingProgress, setVideoProcessingProgress] = useState(0);
  const [videoProcessingMessage, setVideoProcessingMessage] = useState('');

  // Subscription scenario for banner
  const {
    scenario,
    refresh: refreshScenario
  } = useSubscriptionScenario(profile?.id);

  // Get upload limits based on subscription plan
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

  // Get post quota function
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
    category: '',
    price: '',
    city: '',
    condition: 'Good',
    negotiable: false,
    contactNumber: '',
    // Electronics-specific fields
    warranty: '',
    // Car-specific fields
    carMake: '',
    carModel: '',
    year: '',
    mileage: '',
    transmission: '',
    fuelType: '',
    // Business-specific fields
    businessType: '',
    monthlyRevenue: '',
    annualRevenue: '',
    numberOfEmployees: '',
    yearEstablished: '',
    // Fashion-specific fields
    size: '',
    gender: '',
    color: '',
    material: '',
    madeInFashion: '',
    // Cosmetics-specific fields
    brand: '',
    volume: '',
    scentType: '',
    skinType: '',
    expiryDate: '',
    madeInCosmetics: '',
    isOrganic: false,
    // House Items-specific fields
    madeInHouseItems: '',
  });

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      setShowForm(false);
      setShowCategorySelection(false);
      onCategorySelectionChange?.(false);
    }
  }, [resetTrigger]);

  // Sync with external control of category selection
  useEffect(() => {
    if (showCategorySelectionExternal !== undefined) {
      setShowCategorySelection(showCategorySelectionExternal);
      // If showing category selection, hide the form
      if (showCategorySelectionExternal) {
        setShowForm(false);
      }
    }
  }, [showCategorySelectionExternal]);

  // Load user items on mount
  useEffect(() => {
    loadUserItems();
  }, [profile?.id]);

  const pickMedia = async () => {
    // Check post quota before allowing media upload (only for new posts, not edits)
    if (!editingItemId) {
      const quota = getPostQuota();
      if (!quota.canPost) {
        Alert.alert(
          'Post Quota Exhausted',
          `You've used all ${quota.maxPosts} posts (${quota.postsUsed}/${quota.maxPosts}).\n\nRenew your subscription or upgrade to a higher plan to get more posts.`,
          [{ text: 'OK', style: 'cancel' }]
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
      const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB in bytes
      const newMedia: MediaAsset[] = [];

      for (const asset of result.assets) {
        const type = asset.type === 'video' ? 'video' : 'image';

        // Count existing and new media
        const existingImages = selectedMedia.filter(m => m.type === 'image').length;
        const existingVideos = selectedMedia.filter(m => m.type === 'video').length;
        const newImages = newMedia.filter(m => m.type === 'image').length;
        const newVideos = newMedia.filter(m => m.type === 'video').length;

        // Check image limit (max 5 images)
        if (type === 'image' && (existingImages + newImages) >= 5) {
          Alert.alert(
            'Image Limit Reached',
            'You can upload maximum 5 images per post. Please remove some images first.'
          );
          continue;
        }

        // Check video limit (max 1 video)
        if (type === 'video' && (existingVideos + newVideos) >= 1) {
          Alert.alert(
            'Video Limit Reached',
            'You can only upload one video per listing. Please remove the existing video first.'
          );
          continue;
        }

        // Process and validate video
        if (type === 'video') {
          setVideoProcessing(true);
          setVideoProcessingProgress(0);
          setVideoProcessingMessage('Checking video...');

          try {
            const result = await processVideo(asset.uri, (progress, message) => {
              setVideoProcessingProgress(progress);
              setVideoProcessingMessage(message);
            });

            setVideoProcessing(false);

            if (!result.valid) {
              showVideoValidationError(result.reason || 'Video validation failed');
              continue;
            }

            // Use the processed video URI
            newMedia.push({ uri: result.uri!, type });
            continue;
          } catch (error) {
            setVideoProcessing(false);
            Alert.alert('Error', 'Could not process video. Please try again.');
            continue;
          }
        }

        newMedia.push({
          uri: asset.uri,
          type,
        });
      }

      setSelectedMedia([...selectedMedia, ...newMedia]);
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(selectedMedia.filter((_, i) => i !== index));
  };

  const loadUserItems = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await fetchUserMarketplaceItems(profile.id);
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading user items:', error);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    console.log('Category selected:', categoryId);
    setFormData({
      ...formData,
      category: categoryId,
      // Reset category-specific fields when changing category
      carMake: '',
      carModel: '',
      year: '',
      mileage: '',
      transmission: '',
      fuelType: '',
      businessType: '',
      monthlyRevenue: '',
      annualRevenue: '',
      numberOfEmployees: '',
      yearEstablished: '',
      size: '',
      gender: '',
      color: '',
      material: '',
      brand: '',
      volume: '',
      scentType: '',
      skinType: '',
    });
    setShowCategorySelection(false);
    setShowForm(true);
    onCategorySelectionChange?.(false);
    onCategoryChange?.(categoryId);
  };

  const handleSubmit = async () => {
    // Check post quota before submission (only for new posts, not edits)
    if (!editingItemId) {
      const quota = getPostQuota();
      if (!quota.canPost) {
        Alert.alert(
          'Post Limit Reached',
          `You've used all ${quota.maxPosts} posts (${quota.postsUsed}/${quota.maxPosts}).\n\nRenew your subscription or upgrade to Premium for more posts.`,
          [{ text: 'OK', style: 'cancel' }]
        );
        return;
      }
    }

    // Validation
    if (!formData.category) {
      Alert.alert('Required', 'Please select a category');
      return;
    }
    if (!formData.title.trim()) {
      Alert.alert('Required', 'Please enter item title');
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
      Alert.alert('Error', 'You must be logged in to post items');
      return;
    }

    console.log('Submitting with category:', formData.category);

    setSubmitting(true);

    try {
      let data: any;
      let error: any;

      if (editingItemId) {
        // Update existing item
        const result = await updateMarketplaceItem(
          formData.category as MarketplaceCategory,
          editingItemId,
          formData
        );
        data = result.data;
        error = result.error;

        if (error) throw error;

        // Check if there are new media files to upload (local file URIs)
        const newMedia = selectedMedia.filter(m => !m.uri.startsWith('http'));

        if (newMedia.length > 0) {
          console.log('Uploading new media for edit:', newMedia.length);

          // Upload new media
          const mediaUrls = await uploadMarketplaceMedia(
            newMedia,
            formData.category as MarketplaceCategory,
            profile.id
          );

          // Insert new media records
          if (mediaUrls.length > 0) {
            const mediaRecords = mediaUrls.map((url, index) => ({
              item_id: editingItemId,
              media_type: 'image',
              media_url: url,
              display_order: selectedMedia.length - newMedia.length + index + 1,
            }));

            const { error: mediaError } = await supabase
              .from(`${formData.category}_media`)
              .insert(mediaRecords);

            if (mediaError) {
              console.error('Error inserting new media:', mediaError);
            }
          }
        }
      } else {
        // Create new item - upload media first
        const mediaUrls = await uploadMarketplaceMedia(
          selectedMedia,
          formData.category as MarketplaceCategory,
          profile.id
        );

        // Create marketplace item
        const result = await createMarketplaceItem(
          formData.category as MarketplaceCategory,
          formData,
          profile.id,
          mediaUrls
        );
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      // Increment post count for new posts (not edits)
      if (!editingItemId) {
        await supabase
          .from('user_subscriptions')
          .update({
            posts_used_this_month: (subscription?.posts_used_this_month || 0) + 1
          })
          .eq('user_id', profile.id)
          .eq('status', 'active');
      }

      Alert.alert('Success', editingItemId ? 'Item updated successfully!' : 'Item posted to marketplace successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setFormData({
              title: '',
              description: '',
              category: formData.category,
              price: '',
              city: '',
              condition: '',
              negotiable: false,
            });
            setSelectedMedia([]);
            setEditingItemId(null);
            setShowForm(false);
            setShowCategorySelection(false);
            onCategoryChange?.('');
            onCategorySelectionChange?.(false);
            refreshScenario(); // Refresh to update quota count
            // Refresh items list
            loadUserItems();
          }
        }
      ]);
    } catch (error: any) {
      console.error('Error posting item:', error);
      // Check for quota-related errors from database
      if (error.message && (error.message.includes('quota') || error.message.includes('limit') || error.message.includes('post'))) {
        const quota = getPostQuota();
        Alert.alert(
          'Post Limit Reached',
          `Your post quota is full (${quota.postsUsed}/${quota.maxPosts}). Renew your subscription or upgrade to get more posts.`
        );
        refreshScenario(); // Refresh scenario to update UI
      } else {
        Alert.alert('Error', error.message || 'Failed to post item. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await deleteMarketplaceItem(
                item.category_id as MarketplaceCategory,
                id
              );

              if (error) throw error;

              // Update local state
              setItems(items.filter(item => item.id !== id));
              Alert.alert('Success', 'Item deleted successfully');
            } catch (error: any) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', error.message || 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (item: any) => {
    // Check if user can edit listings (Scenario 3: Grace period ended)
    if (scenario && !scenario.can_edit_listings) {
      Alert.alert(
        'Editing Disabled',
        'Your subscription has expired and the grace period has ended. Renew your subscription to edit your items.',
        [
          { text: 'Renew Now', onPress: () => router.push('/subscription') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // Set editing mode
    setEditingItemId(item.id);

    // Populate form with item data
    setFormData({
      title: item.title,
      description: item.description || '',
      category: item.category_id,
      price: item.price.toString(),
      city: item.city,
      condition: item.condition || '',
      negotiable: false,
      contactNumber: item.contact_number || '',
      // Add category-specific fields as needed
      carMake: item.make || '',
      carModel: item.model || '',
      year: item.year?.toString() || '',
      mileage: item.mileage?.toString() || '',
      transmission: item.transmission || '',
      fuelType: item.fuel_type || '',
      businessType: item.business_type || '',
      brand: item.brand || '',
      size: item.size || '',
      gender: item.gender || '',
      // ... add other fields as needed
    });

    // Load existing media
    if (item.media && item.media.length > 0) {
      const existingMedia: MediaAsset[] = item.media.map((m: any) => ({
        uri: m.media_url,
        type: m.media_type as 'image' | 'video',
      }));
      setSelectedMedia(existingMedia);
    }

    setShowCategorySelection(false);
    setShowForm(true);
    onCategorySelectionChange?.(false);
  };

  const handleMarkAsSold = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const isSold = item.listing_status === 'sold' || !item.is_available;
    const actionText = isSold ? 'Mark as Available' : 'Mark as Sold';
    const confirmText = isSold ? 'Mark this item as available again?' : 'Mark this item as sold?';

    Alert.alert(
      actionText,
      confirmText,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          onPress: async () => {
            try {
              const { error } = await markItemAsSold(
                item.category_id as MarketplaceCategory,
                id,
                !isSold
              );

              if (error) throw error;

              // Refresh items list
              await loadUserItems();
              Alert.alert('Success', `Item marked as ${!isSold ? 'sold' : 'available'}`);
            } catch (error: any) {
              console.error('Error updating item status:', error);
              Alert.alert('Error', error.message || 'Failed to update item status');
            }
          }
        }
      ]
    );
  };

  if (showForm) {
    const selectedCategory = CATEGORIES.find(cat => cat.id === formData.category);
    const quota = getPostQuota();
    const limits = getUploadLimits();

    return (
      <>
        <VideoProcessingModal
          visible={videoProcessing}
          progress={videoProcessingProgress}
          message={videoProcessingMessage}
        />
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder={
                formData.category === 'cars' ? 'e.g., Mercedes G Wagon' :
                formData.category === 'electronics' ? 'e.g., Laptop HP EliteBook 840 G3' :
                formData.category === 'house_items' ? 'e.g., Wooden Dining Table' :
                formData.category === 'properties' ? 'e.g., 2 Bedroom Apartment in Molyko' :
                formData.category === 'fashion' ? 'e.g., Nike Air Max Sneakers' :
                formData.category === 'cosmetics' ? 'e.g., Chanel Perfume' :
                formData.category === 'businesses' ? 'e.g., Small Restaurant in Buea' :
                'e.g., Item Title'
              }
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
              placeholder="Detailed description of your item..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Electronics-Specific Fields */}
          {formData.category === 'electronics' && (
            <>
              {/* Warranty */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Warranty</Text>
                <TextInput
                  style={styles.input}
                  value={formData.warranty}
                  onChangeText={(text) => setFormData({ ...formData, warranty: text })}
                  placeholder="e.g., 6 months, 1 year, No warranty"
                  placeholderTextColor="#999"
                />
              </View>
            </>
          )}

          {/* House Items-Specific Fields */}
          {formData.category === 'house_items' && (
            <>
              {/* Made In */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Made In (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.madeInHouseItems}
                  onChangeText={(text) => setFormData({ ...formData, madeInHouseItems: text })}
                  placeholder="e.g., China, Germany, Local"
                  placeholderTextColor="#999"
                />
              </View>
            </>
          )}

          {/* Car-Specific Fields */}
          {formData.category === 'cars' && (
            <>
              {/* Car Make */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Make (Brand) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.carMake}
                  onChangeText={(text) => setFormData({ ...formData, carMake: text })}
                  placeholder="e.g., Toyota, Honda, Mercedes"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Car Model */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Model *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.carModel}
                  onChangeText={(text) => setFormData({ ...formData, carModel: text })}
                  placeholder="e.g., Camry, Accord, C-Class"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Year & Mileage */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Year *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.year}
                    onChangeText={(text) => setFormData({ ...formData, year: text })}
                    placeholder="e.g., 2015"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Mileage (km)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.mileage}
                    onChangeText={(text) => setFormData({ ...formData, mileage: text })}
                    placeholder="e.g., 85000"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Transmission */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Transmission *</Text>
                <View style={styles.chipsContainer}>
                  {TRANSMISSION_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chip,
                        formData.transmission === type && styles.chipActive,
                      ]}
                      onPress={() => setFormData({ ...formData, transmission: type })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.transmission === type && styles.chipTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Fuel Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fuel Type *</Text>
                <View style={styles.chipsContainer}>
                  {FUEL_TYPES.map((fuel) => (
                    <TouchableOpacity
                      key={fuel}
                      style={[
                        styles.chip,
                        formData.fuelType === fuel && styles.chipActive,
                      ]}
                      onPress={() => setFormData({ ...formData, fuelType: fuel })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.fuelType === fuel && styles.chipTextActive,
                        ]}
                      >
                        {fuel}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Business-Specific Fields */}
          {formData.category === 'businesses' && (
            <>
              {/* Business Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Type *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.businessType}
                  onChangeText={(text) => setFormData({ ...formData, businessType: text })}
                  placeholder="e.g., Restaurant, Retail Store, Salon"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Year Established */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Year Established *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.yearEstablished}
                  onChangeText={(text) => setFormData({ ...formData, yearEstablished: text })}
                  placeholder="e.g., 2018"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              {/* Monthly Revenue */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Monthly Revenue (FCFA)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.monthlyRevenue}
                  onChangeText={(text) => setFormData({ ...formData, monthlyRevenue: text })}
                  placeholder="e.g., 500000"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              {/* Annual Revenue */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Annual Revenue (FCFA)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.annualRevenue}
                  onChangeText={(text) => setFormData({ ...formData, annualRevenue: text })}
                  placeholder="e.g., 6000000"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              {/* Number of Employees */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Number of Employees</Text>
                <TextInput
                  style={styles.input}
                  value={formData.numberOfEmployees}
                  onChangeText={(text) => setFormData({ ...formData, numberOfEmployees: text })}
                  placeholder="e.g., 5"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
            </>
          )}

          {/* Fashion-Specific Fields */}
          {formData.category === 'fashion' && (
            <>
              {/* Size */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Size</Text>
                <TextInput
                  style={styles.input}
                  value={formData.size}
                  onChangeText={(text) => setFormData({ ...formData, size: text })}
                  placeholder="e.g., S, M, L, XL, 42, 10"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Gender */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.chipsContainer}>
                  {GENDER_OPTIONS.map((genderOption) => (
                    <TouchableOpacity
                      key={genderOption}
                      style={[
                        styles.chip,
                        formData.gender === genderOption && styles.chipActive,
                      ]}
                      onPress={() => setFormData({ ...formData, gender: genderOption })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.gender === genderOption && styles.chipTextActive,
                        ]}
                      >
                        {genderOption}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Color */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Color Available</Text>
                <TextInput
                  style={styles.input}
                  value={formData.color}
                  onChangeText={(text) => setFormData({ ...formData, color: text })}
                  placeholder="e.g., Black, Blue, Red"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Material */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Material</Text>
                <TextInput
                  style={styles.input}
                  value={formData.material}
                  onChangeText={(text) => setFormData({ ...formData, material: text })}
                  placeholder="e.g., Cotton, Leather, Polyester"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Made In */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Made In</Text>
                <TextInput
                  style={styles.input}
                  value={formData.madeInFashion}
                  onChangeText={(text) => setFormData({ ...formData, madeInFashion: text })}
                  placeholder="e.g., China, USA, Italy"
                  placeholderTextColor="#999"
                />
              </View>
            </>
          )}

          {/* Cosmetics-Specific Fields */}
          {formData.category === 'cosmetics' && (
            <>
              {/* Brand */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Brand</Text>
                <TextInput
                  style={styles.input}
                  value={formData.brand}
                  onChangeText={(text) => setFormData({ ...formData, brand: text })}
                  placeholder="e.g., Chanel, Dior, MAC"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Volume/Size */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Volume/Size</Text>
                <TextInput
                  style={styles.input}
                  value={formData.volume}
                  onChangeText={(text) => setFormData({ ...formData, volume: text })}
                  placeholder="e.g., 50ml, 100ml, 200g"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Scent Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Scent/Fragrance</Text>
                <TextInput
                  style={styles.input}
                  value={formData.scentType}
                  onChangeText={(text) => setFormData({ ...formData, scentType: text })}
                  placeholder="e.g., Floral, Citrus, Woody, Unscented"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Skin Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Suitable For</Text>
                <View style={styles.chipsContainer}>
                  {SKIN_TYPE_OPTIONS.map((skinType) => (
                    <TouchableOpacity
                      key={skinType}
                      style={[
                        styles.chip,
                        formData.skinType === skinType && styles.chipActive,
                      ]}
                      onPress={() => setFormData({ ...formData, skinType })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.skinType === skinType && styles.chipTextActive,
                        ]}
                      >
                        {skinType}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Expiry Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  value={formData.expiryDate}
                  onChangeText={(text) => setFormData({ ...formData, expiryDate: text })}
                  placeholder="e.g., 2026-12-31"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Made In */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Made In</Text>
                <TextInput
                  style={styles.input}
                  value={formData.madeInCosmetics}
                  onChangeText={(text) => setFormData({ ...formData, madeInCosmetics: text })}
                  placeholder="e.g., France, USA, Japan"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Is Organic */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData({ ...formData, isOrganic: !formData.isOrganic })}
              >
                <Ionicons
                  name={formData.isOrganic ? 'checkbox' : 'square-outline'}
                  size={scale(20)}
                  color={formData.isOrganic ? '#10B981' : '#999'}
                />
                <Text style={styles.checkboxLabel}>Organic Product</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Condition */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Condition *</Text>
            <View style={styles.chipsContainer}>
              {CONDITIONS.map((condition) => (
                <TouchableOpacity
                  key={condition}
                  style={[
                    styles.chip,
                    formData.condition === condition && styles.chipActive,
                  ]}
                  onPress={() => setFormData({ ...formData, condition })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      formData.condition === condition && styles.chipTextActive,
                    ]}
                  >
                    {condition}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price (FCFA) *</Text>
            <TextInput
              style={styles.input}
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
              placeholder="e.g., 150000"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setFormData({ ...formData, negotiable: !formData.negotiable })}
            >
              <Ionicons
                name={formData.negotiable ? 'checkbox' : 'square-outline'}
                size={scale(20)}
                color={formData.negotiable ? '#10B981' : '#999'}
              />
              <Text style={styles.checkboxLabel}>Price is negotiable</Text>
            </TouchableOpacity>
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
              <Text style={styles.uploadLimit}>Max 5 images & 1 video per post (max 20MB, 30s - auto-compressed)</Text>
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
              (submitting || (!editingItemId && !getPostQuota().canPost)) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={submitting || (!editingItemId && !getPostQuota().canPost)}
          >
            {submitting ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.submitButtonText}>Uploading...</Text>
              </>
            ) : (
              <>
                <Text style={styles.submitButtonText}>Post to Marketplace</Text>
                <Ionicons name="checkmark-circle" size={scale(20)} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      </>
    );
  }

  if (showCategorySelection) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategorySelect(category.id)}
              >
                <View style={styles.categoryIconContainer}>
                  <Ionicons name={category.icon as any} size={scale(32)} color="#10B981" />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Ionicons name="chevron-forward" size={scale(20)} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Marketplace Items</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setShowCategorySelection(true);
            onCategorySelectionChange?.(true);
          }}
        >
          <Ionicons name="add-circle" size={scale(24)} color="#10B981" />
          <Text style={styles.addButtonText}>Sell Item</Text>
        </TouchableOpacity>
      </View>

      {/* Items */}
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={scale(64)} color="#ccc" />
          <Text style={styles.emptyTitle}>No items listed yet</Text>
          <Text style={styles.emptyText}>
            Start selling by adding your first item
          </Text>
        </View>
      ) : (
        <View style={styles.listingsContainer}>
          {items.map((item) => {
            // Get the first media URL from the media array
            const imageUrl = item.media && item.media.length > 0
              ? item.media[0].media_url
              : 'https://via.placeholder.com/150';

            return (
              <View key={item.id} style={styles.listingCard}>
                <View style={styles.imageContainer}>
                  <Image source={{ uri: imageUrl }} style={styles.listingImage} />
                  {!item.is_available && (
                    <View style={styles.inactiveBadge}>
                      <Ionicons name="eye-off-outline" size={scale(12)} color="#fff" />
                      <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
                    </View>
                  )}
                </View>
                <View style={styles.listingInfo}>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.listingPrice}>
                    {item.price.toLocaleString('fr-FR')} FCFA
                  </Text>
                  <View style={styles.listingDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="location-outline" size={scale(14)} color="#666" />
                      <Text style={styles.detailText}>{item.city}</Text>
                    </View>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {CATEGORIES.find(c => c.id === item.category_id)?.name || item.category_id}
                      </Text>
                    </View>
                  </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.editButton,
                      scenario && !scenario.can_edit_listings && styles.editButtonDisabled
                    ]}
                    onPress={() => handleEdit(item)}
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
                    style={[styles.actionButton, styles.soldButton]}
                    onPress={() => handleMarkAsSold(item.id)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={scale(16)} color="#2563EB" />
                    <Text style={styles.soldButtonText}>Sold</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={scale(16)} color="#EF4444" />
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
    height: scale(140),
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
    color: '#2563EB',
    marginBottom: spacing.sm,
  },
  listingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs,
  },
  categoryBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
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
    paddingHorizontal: spacing.sm,
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
  soldButton: {
    backgroundColor: '#EEF2FF',
  },
  soldButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#2563EB',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.sm,
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
  categoryList: {
    flex: 1,
  },
  categoryGrid: {
    padding: spacing.lg,
    gap: spacing.base,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: spacing.base,
  },
  categoryIconContainer: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#E8F5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#1a1a1a',
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  checkboxLabel: {
    fontSize: fontSize.base,
    color: '#666',
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
    marginBottom: spacing.xxxl * 2, // Extra margin to move button above navigation menu
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
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

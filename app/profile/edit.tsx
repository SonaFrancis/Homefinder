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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { spacing, fontSize, scale, wp } from '@/utils/responsive';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { getPhoneValidationError, formatPhoneForDisplay, PHONE_PLACEHOLDER } from '@/utils/phoneValidation';

export default function EditProfileScreen() {
  const { profile, setProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState(profile?.profile_picture_url || '');

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone_number || '',
    whatsapp: profile?.whatsapp_number || '',
    city: profile?.city || '',
    bio: profile?.bio || '',
  });

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isSubscribed: false,
    plan: 'Free',
    planType: '', // 'standard' or 'premium'
    expiryDate: '',
  });

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', profile.id)
        .single();

      if (data && !error) {
        const endDate = new Date(data.end_date);
        const isActive = endDate > new Date();

        // Format date to show only date, not time
        const formattedDate = endDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        setSubscriptionStatus({
          isSubscribed: isActive,
          plan: data.subscription_plans?.display_name || 'Premium',
          planType: data.subscription_plans?.name || '', // 'standard' or 'premium'
          expiryDate: formattedDate,
        });
      }
    } catch (error) {
      console.log('No active subscription');
    }
  };

  const uploadProfileImage = async (uri: string): Promise<string | null> => {
    try {
      console.log('Starting image upload:', uri);

      // Handle file extension for Android compatibility
      let fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';

      // Handle Android content URIs
      if (!fileExt || fileExt.includes('?') || fileExt.length > 4) {
        fileExt = 'jpg';
      }

      const fileName = `${profile?.id}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${profile?.id}/${fileName}`;

      console.log('Reading file as base64...');
      // Read file as base64 with error handling
      let base64: string;
      try {
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
      } catch (readError) {
        console.error('Error reading file:', readError);
        throw new Error('Failed to read image file. Please try selecting a different image.');
      }

      if (!base64) {
        throw new Error('Failed to read file as base64');
      }

      console.log('File read successfully, size:', base64.length, 'uploading to Supabase...');

      // Determine content type
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

      // Upload to Supabase storage (using profile-pictures bucket)
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, decode(base64), {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      console.log('Upload successful, getting public URL...');
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      console.log('Public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', error instanceof Error ? error.message : 'Failed to upload image');
      return null;
    }
  };

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const imageUri = result.assets[0].uri;

        const publicUrl = await uploadProfileImage(imageUri);

        if (publicUrl) {
          setProfileImageUri(publicUrl);

          // Update profile in database
          const { error } = await supabase
            .from('profiles')
            .update({ profile_picture_url: publicUrl })
            .eq('id', profile?.id);

          if (error) {
            console.error('Profile update error:', error);
            Alert.alert('Error', 'Failed to update profile picture in database');
          } else {
            Alert.alert('Success', 'Profile picture updated successfully!');
          }
        }

        setUploading(false);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    // Validation
    if (!formData.fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name');
      return;
    }

    // Validate phone number
    const phoneValidationError = getPhoneValidationError(formData.phone);
    if (phoneValidationError) {
      Alert.alert('Invalid Phone Number', phoneValidationError);
      setPhoneError(phoneValidationError);
      return;
    }

    // Validate WhatsApp number
    const whatsappValidationError = getPhoneValidationError(formData.whatsapp);
    if (whatsappValidationError) {
      Alert.alert('Invalid WhatsApp Number', whatsappValidationError);
      setWhatsappError(whatsappValidationError);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName.trim(),
          phone_number: formData.phone.trim() || null,
          whatsapp_number: formData.whatsapp.trim() || null,
          city: formData.city.trim() || null,
          bio: formData.bio.trim() || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Update local state
      setProfile({
        ...profile,
        full_name: formData.fullName.trim(),
        phone_number: formData.phone.trim() || undefined,
        whatsapp_number: formData.whatsapp.trim() || undefined,
        city: formData.city.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        profile_picture_url: profileImageUri,
      });

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={scale(24)} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Image Section */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: profileImageUri || 'https://via.placeholder.com/120',
              }}
              style={styles.profileImage}
            />
            <TouchableOpacity
              style={styles.editImageButton}
              onPress={handleImagePicker}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={scale(20)} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.imageHint}>
            {uploading ? 'Uploading...' : 'Tap to change profile picture'}
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={scale(20)} color="#999" />
              <TextInput
                style={styles.input}
                value={formData.fullName}
                onChangeText={(text) =>
                  setFormData({ ...formData, fullName: text })
                }
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={scale(20)} color="#999" />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={scale(20)} color="#999" />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => {
                  setFormData({ ...formData, phone: text });
                  setPhoneError(null);
                }}
                placeholder={PHONE_PLACEHOLDER}
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
            {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
            <Text style={styles.helperText}>International format with country code (optional)</Text>
          </View>

          {/* WhatsApp Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="logo-whatsapp" size={scale(20)} color="#999" />
              <TextInput
                style={styles.input}
                value={formData.whatsapp}
                onChangeText={(text) => {
                  setFormData({ ...formData, whatsapp: text });
                  setWhatsappError(null);
                }}
                placeholder={PHONE_PLACEHOLDER}
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
            {whatsappError && <Text style={styles.errorText}>{whatsappError}</Text>}
            <Text style={styles.helperText}>Required for property listings (international format)</Text>
          </View>

          {/* City */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={scale(20)} color="#999" />
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={(text) =>
                  setFormData({ ...formData, city: text })
                }
                placeholder="Enter your city"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Bio */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <View style={[styles.inputContainer, styles.bioContainer]}>
              <Ionicons
                name="document-text-outline"
                size={scale(20)}
                color="#999"
                style={styles.bioIcon}
              />
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={formData.bio}
                onChangeText={(text) =>
                  setFormData({ ...formData, bio: text })
                }
                placeholder="Tell us about yourself..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <Text style={styles.charCount}>{formData.bio.length} / 200</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.saveButtonText}>Saving...</Text>
            </>
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Account Status Section - Only show when subscriptions are enabled */}
        {FEATURE_FLAGS.ENABLE_SUBSCRIPTIONS && (
        <View style={styles.accountStatusSection}>
          <Text style={styles.sectionTitle}>Account Status</Text>

          {/* Subscription Card */}
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <View style={styles.subscriptionIconContainer}>
                <Ionicons name="star" size={scale(24)} color="#10B981" />
              </View>
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionTitle}>
                  {subscriptionStatus.isSubscribed ? 'Active Subscription' : 'No Active Subscription'}
                </Text>
                <Text style={styles.subscriptionPlan}>
                  {subscriptionStatus.isSubscribed
                    ? subscriptionStatus.plan
                    : 'Free Plan'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  subscriptionStatus.isSubscribed
                    ? styles.statusBadgeActive
                    : styles.statusBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    subscriptionStatus.isSubscribed
                      ? styles.statusTextActive
                      : styles.statusTextInactive,
                  ]}
                >
                  {subscriptionStatus.isSubscribed ? 'Active' : 'Expired'}
                </Text>
              </View>
            </View>

            {subscriptionStatus.isSubscribed && (
              <View style={styles.subscriptionDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={scale(18)} color="#666" />
                  <Text style={styles.detailText}>
                    Expires: {subscriptionStatus.expiryDate}
                  </Text>
                </View>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={styles.subscriptionButton}
              onPress={() => router.push('/subscription')}
            >
              <Text style={styles.subscriptionButtonText}>
                {subscriptionStatus.isSubscribed
                  ? subscriptionStatus.planType === 'standard'
                    ? 'Upgrade to Premium'
                    : 'Manage Subscription'
                  : 'Upgrade to Premium'}
              </Text>
              <Ionicons name="arrow-forward" size={scale(18)} color="#10B981" />
            </TouchableOpacity>
          </View>

          {/* Benefits List */}
          {subscriptionStatus.isSubscribed && (
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>
                {subscriptionStatus.planType === 'premium' ? 'Your Premium Benefits' : 'Your Plan Benefits'}
              </Text>
              <View style={styles.benefitsList}>
                {(subscriptionStatus.planType === 'premium'
                  ? [
                      'Up to 25 posts per month',
                      '5 images per post',
                      '2 videos per post',
                      'Analytics dashboard access',
                      'Priority support',
                      'Verified badge',
                    ]
                  : [
                      'Up to 20 posts per month',
                      '5 images per post',
                      '1 video per post',
                      'Basic dashboard access',
                      'Standard support',
                    ]
                ).map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={scale(20)} color="#10B981" />
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
        )}
      </ScrollView>
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
  placeholder: {
    width: scale(40),
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: '#e0e0e0',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  imageHint: {
    fontSize: fontSize.sm,
    color: '#999',
    marginTop: spacing.md,
  },
  form: {
    paddingHorizontal: spacing.lg,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    color: '#1a1a1a',
  },
  bioContainer: {
    alignItems: 'flex-start',
    minHeight: scale(100),
  },
  bioIcon: {
    marginTop: spacing.xs,
  },
  bioInput: {
    minHeight: scale(80),
    paddingTop: 0,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: '#999',
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: '#10B981',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxxl,
    paddingVertical: spacing.base,
    borderRadius: spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  accountStatusSection: {
    marginTop: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.lg,
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: spacing.base,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: spacing.base,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  subscriptionIconContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#E8F5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: spacing.xs / 2,
  },
  subscriptionPlan: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#10B981',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
  },
  statusBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextInactive: {
    color: '#EF4444',
  },
  subscriptionDetails: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: fontSize.base,
    color: '#666',
  },
  subscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    backgroundColor: '#E8F5F0',
  },
  subscriptionButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#10B981',
  },
  benefitsContainer: {
    marginTop: spacing.lg,
  },
  benefitsTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: spacing.md,
  },
  benefitsList: {
    gap: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  benefitText: {
    fontSize: fontSize.base,
    color: '#666',
    flex: 1,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: '#EF4444',
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: '#999',
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
});

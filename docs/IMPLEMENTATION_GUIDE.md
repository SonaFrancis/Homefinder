# Cameroon Rental & Marketplace App - Implementation Guide

## 📋 Project Overview

A React Native mobile app for landlords, students, and small businesses in Cameroon with subscription-based listing management.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Add your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Supabase

1. Create a new Supabase project
2. Run the SQL migration from `supabase_schema.sql` in the SQL Editor
3. Create storage buckets:
   - `profile-pictures` (public, 5MB limit)
   - `rental-property-media` (public, 50MB limit)
   - `marketplace-item-media` (public, 50MB limit)

4. Set up storage policies in Supabase Dashboard:

```sql
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id IN ('profile-pictures', 'rental-property-media', 'marketplace-item-media') );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id IN ('profile-pictures', 'rental-property-media', 'marketplace-item-media')
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 4. Run the App

```bash
npm start
# Then press 'a' for Android or 'i' for iOS
```

## 📁 Project Structure

```
app/
├── (auth)/                    # Authentication screens
│   ├── login.tsx
│   └── signup.tsx
├── (tabs)/                    # Main tab navigation
│   ├── index.tsx             # For Rent tab
│   ├── marketplace.tsx       # Marketplace tab
│   └── profile.tsx           # Profile tab
├── property/
│   ├── [id].tsx              # Property detail
│   └── create.tsx            # Create property
├── marketplace/
│   ├── [id].tsx              # Item detail
│   └── create.tsx            # Create marketplace item
├── subscription/
│   └── plans.tsx             # Subscription plans
└── _layout.tsx               # Root layout

lib/
└── supabase.ts               # Supabase client & types

store/
└── authStore.ts              # Zustand auth store

utils/
├── mediaUtils.ts             # Image/video handling
└── validation.ts             # Form validation

components/                    # Reusable UI components
```

## 🔑 Key Features Implementation

### 1. Bottom Tab Navigation

Create `app/(tabs)/_layout.tsx`:

```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'For Rent',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### 2. For Rent Tab (Property Listings)

Create `app/(tabs)/index.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, RentalProperty } from '@/lib/supabase';
import { formatPrice } from '@/utils/validation';

export default function ForRentScreen() {
  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('rental_properties')
        .select(`
          *,
          profiles (*),
          rental_property_media (*)
        `)
        .eq('listing_status', 'approved')
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProperty = ({ item }: { item: RentalProperty }) => {
    const firstImage = item.rental_property_media?.[0]?.media_url;
    const isVerified = item.profiles?.is_verified;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/property/${item.id}`)}
      >
        <Image
          source={{ uri: firstImage || 'https://via.placeholder.com/300' }}
          style={styles.image}
        />
        {item.is_featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.price}>{formatPrice(item.price)}/month</Text>
          <View style={styles.details}>
            <Text style={styles.detailText}>
              {item.bedrooms} bed • {item.bathrooms} bath
            </Text>
            <Text style={styles.location}>{item.city}</Text>
          </View>
          <View style={styles.landlordInfo}>
            <Text style={styles.landlordName}>
              {item.profiles?.full_name}
            </Text>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={properties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchProperties}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  featuredText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  landlordInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  landlordName: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  verifiedBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
```

### 3. Property Detail Page with WhatsApp Integration

Create `app/property/[id].tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, RentalProperty } from '@/lib/supabase';
import { formatPrice, formatWhatsAppLink } from '@/utils/validation';

const { width } = Dimensions.get('window');

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams();
  const [property, setProperty] = useState<RentalProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchProperty();
    incrementViewCount();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('rental_properties')
        .select(`
          *,
          profiles (*),
          rental_property_media (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProperty(data);
    } catch (error) {
      console.error('Error fetching property:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    await supabase.rpc('increment', {
      table_name: 'rental_properties',
      row_id: id,
      column_name: 'views_count',
    });
  };

  const handleWhatsAppClick = async () => {
    if (!property?.profiles?.whatsapp_number) return;

    const message = `Hi, I'm interested in your property: ${property.title}`;
    const whatsappUrl = formatWhatsAppLink(
      property.profiles.whatsapp_number,
      message
    );

    // Increment WhatsApp click counter
    await supabase
      .from('rental_properties')
      .update({ whatsapp_clicks: (property.whatsapp_clicks || 0) + 1 })
      .eq('id', property.id);

    Linking.openURL(whatsappUrl);
  };

  if (loading || !property) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  const images = property.rental_property_media?.filter(m => m.media_type === 'image') || [];
  const isVerified = property.profiles?.is_verified;

  return (
    <ScrollView style={styles.container}>
      {/* Image Gallery */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentImageIndex(index);
        }}
      >
        {images.map((media, index) => (
          <Image
            key={media.id}
            source={{ uri: media.media_url }}
            style={styles.image}
          />
        ))}
      </ScrollView>

      {/* Image Indicator */}
      <View style={styles.imageIndicator}>
        <Text style={styles.imageIndicatorText}>
          {currentImageIndex + 1} / {images.length}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Price and Featured Badge */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(property.price)}/month</Text>
          {property.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{property.title}</Text>

        {/* Property Details */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="bed" size={20} color="#666" />
            <Text style={styles.detailText}>{property.bedrooms} Beds</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="water" size={20} color="#666" />
            <Text style={styles.detailText}>{property.bathrooms} Baths</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="resize" size={20} color="#666" />
            <Text style={styles.detailText}>{property.square_meters}m²</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#1a1a1a" />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>
          <Text style={styles.locationText}>{property.address || property.city}</Text>
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
                  <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Landlord Info */}
        <View style={styles.landlordSection}>
          <View style={styles.landlordHeader}>
            <Image
              source={{
                uri: property.profiles?.profile_picture_url || 'https://via.placeholder.com/50',
              }}
              style={styles.landlordImage}
            />
            <View style={styles.landlordInfo}>
              <View style={styles.landlordNameRow}>
                <Text style={styles.landlordName}>{property.profiles?.full_name}</Text>
                {isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
              <Text style={styles.landlordRole}>
                {property.profiles?.role === 'landlord' ? 'Landlord' : 'Agent'}
              </Text>
            </View>
          </View>

          {/* WhatsApp Button */}
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={handleWhatsAppClick}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#fff" />
            <Text style={styles.whatsappButtonText}>Contact via WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  image: {
    width,
    height: 300,
    backgroundColor: '#e0e0e0',
  },
  imageIndicator: {
    position: 'absolute',
    top: 260,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  featuredBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  featuredText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#666',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '45%',
  },
  amenityText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  landlordSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 24,
    marginTop: 24,
  },
  landlordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  landlordImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
  },
  landlordInfo: {
    flex: 1,
  },
  landlordNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  landlordName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  landlordRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  whatsappButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 4. Subscription System with Gate

Create `app/subscription/plans.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase, SubscriptionPlanData } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils/validation';

export default function SubscriptionPlansScreen() {
  const { user, fetchSubscription } = useAuthStore();
  const [plans, setPlans] = useState<SubscriptionPlanData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlanData) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to subscribe');
      return;
    }

    // In production, integrate with your payment provider (MTN Mobile Money, Orange Money, etc.)
    Alert.alert(
      'Subscribe to ' + plan.display_name,
      `Price: ${formatPrice(plan.price)}\n\nProceed to payment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              // Create subscription record
              const startDate = new Date();
              const endDate = new Date();
              endDate.setDate(endDate.getDate() + plan.duration_days);

              const { error } = await supabase
                .from('user_subscriptions')
                .insert({
                  user_id: user.id,
                  plan_id: plan.id,
                  status: 'active',
                  start_date: startDate.toISOString(),
                  end_date: endDate.toISOString(),
                  payment_method: 'mobile_money',
                });

              if (error) throw error;

              await fetchSubscription();
              Alert.alert('Success', 'Subscription activated!');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Subscribe to post your properties and items
        </Text>
      </View>

      {plans.map((plan) => (
        <View key={plan.id} style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{plan.display_name}</Text>
            <Text style={styles.planPrice}>{formatPrice(plan.price)}</Text>
            <Text style={styles.planDuration}>per month</Text>
          </View>

          <View style={styles.planFeatures}>
            <FeatureItem text={`${plan.max_listings} listings per month`} />
            <FeatureItem text={`${plan.image_quota_per_month} images per month`} />
            <FeatureItem text={`${plan.video_quota_per_month} videos per month`} />
            <FeatureItem text={`Up to ${plan.max_images_per_listing} images per listing`} />
            <FeatureItem text={`Up to ${plan.max_videos_per_listing} videos per listing`} />
            {plan.featured_listing && <FeatureItem text="Featured listings" highlight />}
            {plan.priority_support && <FeatureItem text="Priority support" highlight />}
          </View>

          <TouchableOpacity
            style={[
              styles.subscribeButton,
              plan.name === 'premium' && styles.premiumButton,
            ]}
            onPress={() => handleSubscribe(plan)}
          >
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

function FeatureItem({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.checkmark}>✓</Text>
      <Text style={[styles.featureText, highlight && styles.featureHighlight]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  planCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  planDuration: {
    fontSize: 14,
    color: '#666',
  },
  planFeatures: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  checkmark: {
    fontSize: 18,
    color: '#34C759',
  },
  featureText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  featureHighlight: {
    fontWeight: '600',
    color: '#007AFF',
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  premiumButton: {
    backgroundColor: '#FF9500',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 5. Subscription Gate for Dashboard

Create `components/SubscriptionGate.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { hasActiveSubscription } = useAuthStore();

  if (!hasActiveSubscription()) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>Subscription Required</Text>
          <Text style={styles.message}>
            Subscribe to post your properties or marketplace items
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/subscription/plans')}
          >
            <Text style={styles.buttonText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    maxWidth: 400,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

## 🔐 Security Best Practices

1. **Row Level Security (RLS)**: All tables have RLS enabled in the schema
2. **Authentication**: Supabase Auth handles user sessions securely
3. **File Storage**: Users can only upload/delete their own media files
4. **Subscription Validation**: Database triggers enforce subscription limits
5. **Admin Verification**: Listings require admin approval before appearing

## 📱 Production Deployment

### 1. Build for Production

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

### 2. Submit to Stores

```bash
# Google Play Store
eas submit --platform android

# Apple App Store
eas submit --platform ios
```

## 🎨 Customization Tips

1. **Colors**: Update primary color in all stylesheets (#007AFF)
2. **Branding**: Replace app icons in `assets/` folder
3. **Payment**: Integrate MTN Mobile Money or Orange Money API
4. **Notifications**: Add push notifications with Expo Notifications
5. **Analytics**: Integrate Firebase Analytics or Mixpanel

## 🐛 Common Issues

### Issue: "Active subscription required"
**Solution**: Ensure user has an active subscription with `end_date > NOW()`

### Issue: Images not uploading
**Solution**: Check Supabase storage bucket policies and quotas

### Issue: WhatsApp not opening
**Solution**: Ensure phone numbers are properly formatted (+237...)

## 📞 Support

For issues or questions:
1. Check the implementation guide
2. Review Supabase logs
3. Test with Expo Go app first
4. Check React Native/Expo documentation

---

**Made with ❤️ for Cameroon** 🇨🇲
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Custom storage adapter for React Native using SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Enhanced session management for production
    flowType: 'pkce', // More secure auth flow
    debug: __DEV__, // Enable debug logs in development
  },
});

// Database Types
export type UserRole = 'student' | 'landlord' | 'seller' | 'admin';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';
export type SubscriptionPlan = 'standard' | 'premium';
export type ListingStatus = 'pending' | 'approved' | 'rejected';
export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  profile_picture_url?: string;
  role: UserRole;
  city?: string;
  bio?: string;
  whatsapp_number?: string;
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  average_rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanData {
  id: string;
  name: SubscriptionPlan;
  display_name: string;
  price: number;
  duration_days: number;
  max_listings: number;
  max_posts_per_month: number;
  image_quota_per_month: number;
  video_quota_per_month: number;
  max_images_per_listing: number;
  max_videos_per_listing: number;
  max_images_per_post: number;
  max_videos_per_post: number;
  featured_listing: boolean;
  priority_support: boolean;
  description?: string;
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date?: string;
  end_date?: string;
  listings_used: number;
  images_used_this_month: number;
  videos_used_this_month: number;
  posts_used_this_month: number;
  current_month_start: string;
  last_quota_reset: string;
  payment_reference?: string;
  payment_method?: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  subscription_plans?: SubscriptionPlanData;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export interface RentalProperty {
  id: string;
  landlord_id: string;
  subscription_id?: string;
  title: string;
  description: string;
  property_type: string;
  price: number;
  city: string;
  address?: string;
  street?: string;
  landmarks?: string;
  contact_number?: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  amenities?: string[];
  is_furnished: boolean;
  is_featured: boolean;
  is_available: boolean;
  listing_status: ListingStatus;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  views_count: number;
  whatsapp_clicks: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  rental_property_media?: MediaItem[];
}

export interface MarketplaceItem {
  id: string;
  seller_id: string;
  subscription_id?: string;
  category_id: string;
  title: string;
  description: string;
  price: number;
  city: string;
  condition?: string;
  brand?: string;
  is_negotiable: boolean;
  is_featured: boolean;
  is_available: boolean;
  listing_status: ListingStatus;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  views_count: number;
  whatsapp_clicks: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  marketplace_categories?: MarketplaceCategory;
  marketplace_item_media?: MediaItem[];
}

export interface MediaItem {
  id: string;
  property_id?: string;
  item_id?: string;
  media_type: 'image' | 'video';
  media_url: string;
  thumbnail_url?: string;
  file_size?: number;
  display_order: number;
  created_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  property_id?: string;
  marketplace_item_id?: string;
  rating: number;
  comment?: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface SupportMessage {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: SupportStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to?: string;
  resolved_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}
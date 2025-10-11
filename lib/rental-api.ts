import { supabase, RentalProperty } from './supabase';

export interface RentalFilters {
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  isFurnished?: boolean;
  amenities?: string[];
}

export interface RentalSortOptions {
  orderBy?: 'created_at' | 'price' | 'views_count' | 'bedrooms';
  ascending?: boolean;
}

/**
 * Fetch all rental properties
 */
export async function fetchRentalProperties(
  options?: {
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'price' | 'views_count' | 'bedrooms';
    ascending?: boolean;
    filters?: RentalFilters;
    city?: string;
    street?: string;
  }
) {
  const {
    limit = 50,
    offset = 0,
    orderBy = 'created_at',
    ascending = false,
    filters,
    city,
    street,
  } = options || {};

  try {
    let query = supabase
      .from('rental_properties')
      .select(`
        *,
        landlord:profiles!landlord_id(
          id,
          full_name,
          phone_number,
          whatsapp_number,
          profile_picture_url,
          average_rating,
          total_reviews,
          is_verified
        ),
        rental_property_media(
          id,
          media_type,
          media_url,
          display_order
        )
      `)
      .eq('listing_status', 'approved')
      .eq('is_available', true)
      .order(orderBy, { ascending })
      .range(offset, offset + limit - 1);

    // Apply direct city/street filters (for location filtering)
    if (city) {
      query = query.eq('city', city);
    }
    if (street) {
      query = query.eq('street', street);
    }

    // Apply filters
    if (filters) {
      if (filters.city) {
        query = query.eq('city', filters.city);
      }
      if (filters.propertyType) {
        query = query.eq('property_type', filters.propertyType);
      }
      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.bedrooms !== undefined) {
        query = query.gte('bedrooms', filters.bedrooms);
      }
      if (filters.bathrooms !== undefined) {
        query = query.gte('bathrooms', filters.bathrooms);
      }
      if (filters.isFurnished !== undefined) {
        query = query.eq('is_furnished', filters.isFurnished);
      }
      if (filters.amenities && filters.amenities.length > 0) {
        query = query.contains('amenities', filters.amenities);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data as RentalProperty[], error: null };
  } catch (error) {
    console.error('Error fetching rental properties:', error);
    return { data: null, error };
  }
}

/**
 * Fetch a single rental property by ID
 */
export async function fetchRentalProperty(propertyId: string) {
  try {
    const { data, error } = await supabase
      .from('rental_properties')
      .select(`
        *,
        landlord:profiles!landlord_id(
          id,
          full_name,
          phone_number,
          whatsapp_number,
          profile_picture_url,
          average_rating,
          total_reviews,
          is_verified,
          city
        ),
        rental_property_media(
          id,
          media_type,
          media_url,
          display_order
        )
      `)
      .eq('id', propertyId)
      .single();

    if (error) throw error;

    return { data: data as RentalProperty, error: null };
  } catch (error) {
    console.error('Error fetching rental property:', error);
    return { data: null, error };
  }
}

/**
 * Fetch featured rental properties
 */
export async function fetchFeaturedProperties(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('rental_properties')
      .select(`
        *,
        landlord:profiles!landlord_id(
          id,
          full_name,
          phone_number,
          whatsapp_number,
          profile_picture_url,
          average_rating,
          total_reviews,
          is_verified
        ),
        rental_property_media(
          id,
          media_type,
          media_url,
          display_order
        )
      `)
      .eq('listing_status', 'approved')
      .eq('is_available', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { data: data as RentalProperty[], error: null };
  } catch (error) {
    console.error('Error fetching featured properties:', error);
    return { data: null, error };
  }
}

/**
 * Search rental properties
 */
export async function searchRentalProperties(
  searchQuery: string,
  options?: {
    filters?: RentalFilters;
    limit?: number;
  }
) {
  const { filters, limit = 50 } = options || {};

  try {
    let query = supabase
      .from('rental_properties')
      .select(`
        *,
        landlord:profiles!landlord_id(
          id,
          full_name,
          phone_number,
          whatsapp_number,
          profile_picture_url,
          average_rating,
          total_reviews,
          is_verified
        ),
        rental_property_media(
          id,
          media_type,
          media_url,
          display_order
        )
      `)
      .eq('listing_status', 'approved')
      .eq('is_available', true)
      .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,street.ilike.%${searchQuery}%,property_type.ilike.%${searchQuery}%`)
      .limit(limit);

    // Apply filters
    if (filters) {
      if (filters.city) {
        query = query.eq('city', filters.city);
      }
      if (filters.propertyType) {
        query = query.eq('property_type', filters.propertyType);
      }
      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.bedrooms !== undefined) {
        query = query.gte('bedrooms', filters.bedrooms);
      }
      if (filters.bathrooms !== undefined) {
        query = query.gte('bathrooms', filters.bathrooms);
      }
      if (filters.isFurnished !== undefined) {
        query = query.eq('is_furnished', filters.isFurnished);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data as RentalProperty[], error: null };
  } catch (error) {
    console.error('Error searching rental properties:', error);
    return { data: null, error };
  }
}

/**
 * Get user's own rental properties
 */
export async function fetchUserRentalProperties(userId: string) {
  try {
    const { data, error } = await supabase
      .from('rental_properties')
      .select(`
        *,
        rental_property_media(
          id,
          media_type,
          media_url,
          display_order
        )
      `)
      .eq('landlord_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: data as RentalProperty[], error: null };
  } catch (error) {
    console.error('Error fetching user rental properties:', error);
    return { data: null, error };
  }
}

/**
 * Increment view count for a rental property
 */
export async function incrementPropertyViewCount(propertyId: string) {
  try {
    const { error } = await supabase.rpc('increment_views', {
      listing_table: 'rental_properties',
      listing_uuid: propertyId,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return { error };
  }
}

/**
 * Increment WhatsApp click count for a rental property
 */
export async function incrementPropertyWhatsAppClick(propertyId: string) {
  try {
    const { error } = await supabase.rpc('increment_whatsapp_clicks', {
      listing_table: 'rental_properties',
      listing_uuid: propertyId,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error incrementing WhatsApp click count:', error);
    return { error };
  }
}

/**
 * Get available cities with property counts
 */
export async function getAvailableCities() {
  try {
    const { data, error } = await supabase
      .from('rental_properties')
      .select('city')
      .eq('listing_status', 'approved')
      .eq('is_available', true);

    if (error) throw error;

    // Count properties per city
    const cityCounts = (data || []).reduce((acc: Record<string, number>, item) => {
      const city = item.city;
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});

    // Convert to array and sort by count
    const cities = Object.entries(cityCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    return { data: cities, error: null };
  } catch (error) {
    console.error('Error fetching available cities:', error);
    return { data: null, error };
  }
}

/**
 * Get available property types
 */
export async function getPropertyTypes() {
  try {
    const { data, error } = await supabase
      .from('rental_properties')
      .select('property_type')
      .eq('listing_status', 'approved')
      .eq('is_available', true);

    if (error) throw error;

    // Get unique property types
    const types = [...new Set((data || []).map(item => item.property_type))].filter(Boolean);

    return { data: types, error: null };
  } catch (error) {
    console.error('Error fetching property types:', error);
    return { data: null, error };
  }
}

/**
 * Get price range statistics
 */
export async function getPriceRange() {
  try {
    const { data, error } = await supabase
      .from('rental_properties')
      .select('price')
      .eq('listing_status', 'approved')
      .eq('is_available', true)
      .order('price', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return { data: { min: 0, max: 0, avg: 0 }, error: null };
    }

    const prices = data.map(item => item.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    return { data: { min, max, avg }, error: null };
  } catch (error) {
    console.error('Error fetching price range:', error);
    return { data: null, error };
  }
}

/**
 * Add a property to favorites
 */
export async function addToFavorites(userId: string, propertyId: string) {
  try {
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        listing_type: 'rental',
        listing_id: propertyId,
      });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return { error };
  }
}

/**
 * Remove a property from favorites
 */
export async function removeFromFavorites(userId: string, propertyId: string) {
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_type', 'rental')
      .eq('listing_id', propertyId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return { error };
  }
}

/**
 * Get user's favorite properties
 */
export async function getFavoriteProperties(userId: string) {
  try {
    const { data: favorites, error: favError } = await supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)
      .eq('listing_type', 'rental');

    if (favError) throw favError;

    if (!favorites || favorites.length === 0) {
      return { data: [], error: null };
    }

    const propertyIds = favorites.map(f => f.listing_id);

    const { data, error } = await supabase
      .from('rental_properties')
      .select(`
        *,
        landlord:profiles!landlord_id(
          id,
          full_name,
          phone_number,
          whatsapp_number,
          profile_picture_url,
          average_rating,
          total_reviews,
          is_verified
        ),
        rental_property_media(
          id,
          media_type,
          media_url,
          display_order
        )
      `)
      .in('id', propertyIds);

    if (error) throw error;

    return { data: data as RentalProperty[], error: null };
  } catch (error) {
    console.error('Error fetching favorite properties:', error);
    return { data: null, error };
  }
}

/**
 * Check if property is favorited by user
 */
export async function isPropertyFavorited(userId: string, propertyId: string) {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_type', 'rental')
      .eq('listing_id', propertyId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error

    return { data: !!data, error: null };
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return { data: false, error };
  }
}

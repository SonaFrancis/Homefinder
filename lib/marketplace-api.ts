import { supabase } from './supabase';

export type MarketplaceCategory =
  | 'electronics'
  | 'cars'
  | 'house_items'
  | 'fashion'
  | 'cosmetics'
  | 'businesses'
  | 'properties_for_sale';

export interface MarketplaceItem {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  city: string;
  category: MarketplaceCategory;
  condition?: string;
  is_available: boolean;
  is_featured: boolean;
  listing_status: 'pending' | 'approved' | 'rejected';
  views_count: number;
  whatsapp_clicks: number;
  created_at: string;
  contact_number?: string;

  // Category-specific fields
  brand?: string;
  model?: string;
  warranty?: string;
  size?: string;
  color?: string;
  material?: string;
  gender?: string;
  made_in?: string;
  volume?: string;
  scent_type?: string;
  skin_type?: string;
  expiry_date?: string;
  is_organic?: boolean;
  make?: string;
  year?: number;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  business_type?: string;
  year_established?: number;
  number_of_employees?: number;
  monthly_revenue?: number;
  annual_revenue?: number;
  location_address?: string;

  // Media
  media?: {
    id: string;
    media_type: 'image' | 'video';
    media_url: string;
    display_order: number;
  }[];

  // Seller info
  seller?: {
    id: string;
    full_name: string;
    phone_number?: string;
    whatsapp_number?: string;
    profile_picture_url?: string;
    average_rating: number;
    total_reviews: number;
  };
}

/**
 * Fetch all marketplace items across all categories
 */
export async function fetchAllMarketplaceItems(options?: {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'price' | 'views_count';
  ascending?: boolean;
}) {
  const { limit = 50, offset = 0, orderBy = 'created_at', ascending = false } = options || {};

  try {
    // Fetch from all category tables
    const [electronics, cars, houseItems, fashion, cosmetics, businesses, properties] = await Promise.all([
      fetchCategoryItems('electronics', { limit, offset, orderBy, ascending }),
      fetchCategoryItems('cars', { limit, offset, orderBy, ascending }),
      fetchCategoryItems('house_items', { limit, offset, orderBy, ascending }),
      fetchCategoryItems('fashion', { limit, offset, orderBy, ascending }),
      fetchCategoryItems('cosmetics', { limit, offset, orderBy, ascending }),
      fetchCategoryItems('businesses', { limit, offset, orderBy, ascending }),
      fetchCategoryItems('properties_for_sale', { limit, offset, orderBy, ascending }),
    ]);

    // Combine all items
    const allItems = [
      ...(electronics.data || []),
      ...(cars.data || []),
      ...(houseItems.data || []),
      ...(fashion.data || []),
      ...(cosmetics.data || []),
      ...(businesses.data || []),
      ...(properties.data || []),
    ];

    // Sort combined items
    allItems.sort((a, b) => {
      const aVal = a[orderBy] || 0;
      const bVal = b[orderBy] || 0;
      return ascending ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return {
      data: allItems.slice(0, limit),
      error: null,
    };
  } catch (error) {
    console.error('Error fetching all marketplace items:', error);
    return {
      data: null,
      error,
    };
  }
}

/**
 * Fetch items from a specific category
 */
export async function fetchCategoryItems(
  category: MarketplaceCategory,
  options?: {
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'price' | 'views_count';
    ascending?: boolean;
    city?: string;
  }
) {
  const { limit = 50, offset = 0, orderBy = 'created_at', ascending = false, city } = options || {};

  try {
    // Get the table name
    const tableName = category;
    const mediaTableName = `${category}_media`;

    // Build query
    let query = supabase
      .from(tableName)
      .select(`
        *,
        seller:profiles!seller_id(
          id,
          full_name,
          phone_number,
          whatsapp_number,
          profile_picture_url,
          average_rating,
          total_reviews
        ),
        media:${mediaTableName}(
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

    // Filter by city if provided
    if (city) {
      query = query.eq('city', city);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data to include category
    const items: MarketplaceItem[] = (data || []).map((item: any) => ({
      ...item,
      category,
    }));

    return { data: items, error: null };
  } catch (error) {
    console.error(`Error fetching ${category} items:`, error);
    return { data: null, error };
  }
}

/**
 * Fetch a single marketplace item by ID and category
 */
export async function fetchMarketplaceItem(category: MarketplaceCategory, id: string) {
  try {
    const tableName = category;
    const mediaTableName = `${category}_media`;

    const { data, error } = await supabase
      .from(tableName)
      .select(`
        *,
        seller:profiles!seller_id(
          id,
          full_name,
          phone_number,
          whatsapp_number,
          profile_picture_url,
          average_rating,
          total_reviews
        ),
        media:${mediaTableName}(
          id,
          media_type,
          media_url,
          display_order
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      data: { ...data, category } as MarketplaceItem,
      error: null,
    };
  } catch (error) {
    console.error(`Error fetching marketplace item:`, error);
    return { data: null, error };
  }
}

/**
 * Increment view count for a marketplace item
 */
export async function incrementViewCount(category: MarketplaceCategory, id: string) {
  try {
    const { error } = await supabase.rpc('increment_views', {
      listing_table: category,
      listing_uuid: id,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return { error };
  }
}

/**
 * Increment WhatsApp click count for a marketplace item
 */
export async function incrementWhatsAppClick(category: MarketplaceCategory, id: string) {
  try {
    const { error } = await supabase.rpc('increment_whatsapp_clicks', {
      listing_table: category,
      listing_uuid: id,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error incrementing WhatsApp click count:', error);
    return { error };
  }
}

/**
 * Search marketplace items across all categories
 */
export async function searchMarketplaceItems(
  searchQuery: string,
  options?: {
    category?: MarketplaceCategory;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
  }
) {
  const { category, city, minPrice, maxPrice, limit = 50 } = options || {};

  try {
    if (category) {
      // Search in specific category
      const tableName = category;
      const mediaTableName = `${category}_media`;

      let query = supabase
        .from(tableName)
        .select(`
          *,
          seller:profiles!seller_id(
            id,
            full_name,
            phone_number,
            whatsapp_number,
            profile_picture_url,
            average_rating,
            total_reviews
          ),
          media:${mediaTableName}(
            id,
            media_type,
            media_url,
            display_order
          )
        `)
        .eq('listing_status', 'approved')
        .eq('is_available', true)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(limit);

      if (city) query = query.eq('city', city);
      if (minPrice !== undefined) query = query.gte('price', minPrice);
      if (maxPrice !== undefined) query = query.lte('price', maxPrice);

      const { data, error } = await query;

      if (error) throw error;

      return {
        data: (data || []).map((item: any) => ({ ...item, category })),
        error: null,
      };
    } else {
      // Search across all categories
      const categories: MarketplaceCategory[] = [
        'electronics',
        'cars',
        'house_items',
        'fashion',
        'cosmetics',
        'businesses',
        'properties_for_sale',
      ];

      const results = await Promise.all(
        categories.map(cat =>
          searchMarketplaceItems(searchQuery, {
            ...options,
            category: cat,
          })
        )
      );

      const allItems = results.flatMap(r => r.data || []);

      return {
        data: allItems.slice(0, limit),
        error: null,
      };
    }
  } catch (error) {
    console.error('Error searching marketplace items:', error);
    return { data: null, error };
  }
}

/**
 * Get user's own marketplace listings
 */
export async function fetchUserMarketplaceListings(userId: string) {
  try {
    const categories: MarketplaceCategory[] = [
      'electronics',
      'cars',
      'house_items',
      'fashion',
      'cosmetics',
      'businesses',
      'properties_for_sale',
    ];

    const results = await Promise.all(
      categories.map(async category => {
        const tableName = category;
        const mediaTableName = `${category}_media`;

        const { data, error } = await supabase
          .from(tableName)
          .select(`
            *,
            media:${mediaTableName}(
              id,
              media_type,
              media_url,
              display_order
            )
          `)
          .eq('seller_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((item: any) => ({ ...item, category }));
      })
    );

    const allListings = results.flat();

    // Sort by creation date
    allListings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      data: allListings,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching user listings:', error);
    return { data: null, error };
  }
}

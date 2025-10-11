import { supabase } from './supabase';

// =====================================================
// RENTAL PROPERTY SUBMISSION
// =====================================================

export interface RentalPropertyData {
  title: string;
  description: string;
  property_type: string;
  price: number;
  city: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  amenities?: string[];
  is_furnished: boolean;
}

export interface MediaUpload {
  uri: string;
  type: 'image' | 'video';
  fileName: string;
}

/**
 * Submit a new rental property
 */
export async function submitRentalProperty(
  landlordId: string,
  propertyData: RentalPropertyData,
  media: MediaUpload[]
) {
  try {
    // 1. Create the rental property
    const { data: property, error: propertyError } = await supabase
      .from('rental_properties')
      .insert({
        landlord_id: landlordId,
        ...propertyData,
        listing_status: 'pending', // Will need admin approval
        is_available: true,
        is_featured: false,
      })
      .select()
      .single();

    if (propertyError) throw propertyError;

    // 2. Upload media files
    if (media && media.length > 0) {
      const mediaResults = await uploadPropertyMedia(property.id, media);

      if (mediaResults.error) {
        console.error('Error uploading media:', mediaResults.error);
      }
    }

    return { data: property, error: null };
  } catch (error) {
    console.error('Error submitting rental property:', error);
    return { data: null, error };
  }
}

/**
 * Upload media for rental property
 */
async function uploadPropertyMedia(propertyId: string, media: MediaUpload[]) {
  try {
    const uploadedMedia = [];

    for (let i = 0; i < media.length; i++) {
      const item = media[i];
      const fileExt = item.fileName.split('.').pop();
      const fileName = `${propertyId}/${Date.now()}_${i}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('rental-property-media')
        .upload(fileName, {
          uri: item.uri,
          type: item.type === 'image' ? 'image/jpeg' : 'video/mp4',
          name: fileName,
        } as any);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('rental-property-media')
        .getPublicUrl(fileName);

      // Save media record to database
      const { error: mediaError } = await supabase
        .from('rental_property_media')
        .insert({
          property_id: propertyId,
          media_type: item.type,
          media_url: urlData.publicUrl,
          display_order: i,
        });

      if (mediaError) throw mediaError;

      uploadedMedia.push(urlData.publicUrl);
    }

    return { data: uploadedMedia, error: null };
  } catch (error) {
    console.error('Error uploading property media:', error);
    return { data: null, error };
  }
}

// =====================================================
// MARKETPLACE ITEM SUBMISSION
// =====================================================

export interface MarketplaceItemData {
  title: string;
  description: string;
  price: number;
  city: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  is_negotiable?: boolean;

  // Category-specific fields
  [key: string]: any;
}

/**
 * Submit a new marketplace item
 */
export async function submitMarketplaceItem(
  sellerId: string,
  category: string,
  itemData: MarketplaceItemData,
  media: MediaUpload[]
) {
  try {
    const tableName = category;
    const mediaTableName = `${category}_media`;

    // 1. Create the marketplace item
    const { data: item, error: itemError } = await supabase
      .from(tableName)
      .insert({
        seller_id: sellerId,
        ...itemData,
        listing_status: 'pending', // Will need admin approval
        is_available: true,
        is_featured: false,
      })
      .select()
      .single();

    if (itemError) throw itemError;

    // 2. Upload media files
    if (media && media.length > 0) {
      const mediaResults = await uploadMarketplaceMedia(item.id, category, mediaTableName, media);

      if (mediaResults.error) {
        console.error('Error uploading media:', mediaResults.error);
      }
    }

    return { data: item, error: null };
  } catch (error) {
    console.error('Error submitting marketplace item:', error);
    return { data: null, error };
  }
}

/**
 * Upload media for marketplace item
 */
async function uploadMarketplaceMedia(
  itemId: string,
  category: string,
  mediaTableName: string,
  media: MediaUpload[]
) {
  try {
    const uploadedMedia = [];

    for (let i = 0; i < media.length; i++) {
      const item = media[i];
      const fileExt = item.fileName.split('.').pop();
      const fileName = `${category}/${itemId}/${Date.now()}_${i}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('marketplace-media')
        .upload(fileName, {
          uri: item.uri,
          type: item.type === 'image' ? 'image/jpeg' : 'video/mp4',
          name: fileName,
        } as any);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('marketplace-media')
        .getPublicUrl(fileName);

      // Save media record to database
      const { error: mediaError } = await supabase
        .from(mediaTableName)
        .insert({
          item_id: itemId,
          media_type: item.type,
          media_url: urlData.publicUrl,
          display_order: i,
        });

      if (mediaError) throw mediaError;

      uploadedMedia.push(urlData.publicUrl);
    }

    return { data: uploadedMedia, error: null };
  } catch (error) {
    console.error('Error uploading marketplace media:', error);
    return { data: null, error };
  }
}

// =====================================================
// UPDATE LISTING
// =====================================================

/**
 * Update rental property
 */
export async function updateRentalProperty(
  propertyId: string,
  updates: Partial<RentalPropertyData>
) {
  try {
    const { data, error } = await supabase
      .from('rental_properties')
      .update(updates)
      .eq('id', propertyId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error updating rental property:', error);
    return { data: null, error };
  }
}

/**
 * Update marketplace item
 */
export async function updateMarketplaceItem(
  category: string,
  itemId: string,
  updates: Partial<MarketplaceItemData>
) {
  try {
    const { data, error } = await supabase
      .from(category)
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error updating marketplace item:', error);
    return { data: null, error };
  }
}

// =====================================================
// DELETE LISTING
// =====================================================

/**
 * Delete rental property
 */
export async function deleteRentalProperty(propertyId: string) {
  try {
    // Delete media from storage first
    const { data: mediaFiles } = await supabase
      .from('rental_property_media')
      .select('media_url')
      .eq('property_id', propertyId);

    if (mediaFiles && mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        const fileName = file.media_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('rental-property-media')
            .remove([`${propertyId}/${fileName}`]);
        }
      }
    }

    // Delete property (media records will cascade delete)
    const { error } = await supabase
      .from('rental_properties')
      .delete()
      .eq('id', propertyId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting rental property:', error);
    return { error };
  }
}

/**
 * Delete marketplace item
 */
export async function deleteMarketplaceItem(category: string, itemId: string) {
  try {
    const mediaTableName = `${category}_media`;

    // Delete media from storage first
    const { data: mediaFiles } = await supabase
      .from(mediaTableName)
      .select('media_url')
      .eq('item_id', itemId);

    if (mediaFiles && mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        const fileName = file.media_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('marketplace-media')
            .remove([`${category}/${itemId}/${fileName}`]);
        }
      }
    }

    // Delete item (media records will cascade delete)
    const { error } = await supabase
      .from(category)
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting marketplace item:', error);
    return { error };
  }
}

// =====================================================
// MARK AS SOLD/UNAVAILABLE
// =====================================================

/**
 * Mark rental property as unavailable
 */
export async function markPropertyUnavailable(propertyId: string) {
  try {
    const { error } = await supabase
      .from('rental_properties')
      .update({ is_available: false })
      .eq('id', propertyId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error marking property as unavailable:', error);
    return { error };
  }
}

/**
 * Mark marketplace item as sold
 */
export async function markItemSold(category: string, itemId: string) {
  try {
    const { error } = await supabase
      .from(category)
      .update({ is_available: false })
      .eq('id', itemId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error marking item as sold:', error);
    return { error };
  }
}

// =====================================================
// GET USER'S LISTINGS
// =====================================================

/**
 * Get user's rental properties with all statuses
 */
export async function getUserRentalProperties(landlordId: string) {
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
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user properties:', error);
    return { data: null, error };
  }
}

/**
 * Get user's marketplace items across all categories
 */
export async function getUserMarketplaceItems(sellerId: string) {
  try {
    const categories = [
      'electronics',
      'cars',
      'fashion',
      'cosmetics',
      'house_items',
      'businesses',
      'properties_for_sale',
    ];

    const results = await Promise.all(
      categories.map(async (category) => {
        const mediaTableName = `${category}_media`;

        const { data, error } = await supabase
          .from(category)
          .select(`
            *,
            media:${mediaTableName}(
              id,
              media_type,
              media_url,
              display_order
            )
          `)
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((item: any) => ({ ...item, category }));
      })
    );

    const allItems = results.flat();
    allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: allItems, error: null };
  } catch (error) {
    console.error('Error fetching user items:', error);
    return { data: null, error };
  }
}

import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export type MarketplaceCategory =
  | 'electronics'
  | 'cars'
  | 'house_items'
  | 'fashion'
  | 'cosmetics'
  | 'businesses'
  | 'properties_for_sale';

/**
 * Convert form values to database enum format
 */
export const convertToDbFormat = {
  condition: (value: string): string => value.toLowerCase().replace(/ /g, '_'),
  gender: (value: string): string => value.toLowerCase(),
  transmission: (value: string): string => value.toLowerCase(),
  fuelType: (value: string): string => value.toLowerCase(),
  /**
   * Convert various date formats to PostgreSQL-compatible format (YYYY-MM-DD)
   * Supports: DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD
   */
  date: (value: string): string | null => {
    if (!value || !value.trim()) return null;

    const trimmed = value.trim();

    // Already in correct format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // Handle DD/MM/YY or DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmyMatch) {
      let [, day, month, year] = dmyMatch;

      // Pad day and month with leading zeros
      day = day.padStart(2, '0');
      month = month.padStart(2, '0');

      // Convert 2-digit year to 4-digit year
      if (year.length === 2) {
        const currentYear = new Date().getFullYear();
        const currentCentury = Math.floor(currentYear / 100) * 100;
        const yearNum = parseInt(year);
        // If year is less than current year's last 2 digits + 20, assume current century
        // Otherwise assume previous century
        year = (yearNum <= (currentYear % 100) + 20)
          ? String(currentCentury + yearNum)
          : String(currentCentury - 100 + yearNum);
      }

      return `${year}-${month}-${day}`;
    }

    // If we can't parse it, return null
    console.warn(`Could not parse date: ${value}`);
    return null;
  },
};

/**
 * Upload media files to Supabase storage
 */
export async function uploadMarketplaceMedia(
  files: { uri: string; type: 'image' | 'video' }[],
  category: MarketplaceCategory,
  sellerId: string
): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (const file of files) {
    try {
      console.log('Uploading file:', file.uri);

      // Read file as base64 with Android compatibility
      let base64: string;
      try {
        base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: 'base64',
        });
      } catch (readError) {
        console.error('Error reading file:', readError);
        throw new Error('Failed to read file. Please ensure the file exists and you have permission to access it.');
      }

      if (!base64) {
        throw new Error('Failed to read file as base64');
      }

      console.log('File read successfully, base64 length:', base64.length);

      // Generate unique filename with proper extension handling for Android
      let fileExt = file.uri.split('.').pop()?.toLowerCase() || 'jpg';

      // Handle Android content URIs - default to appropriate extension based on type
      if (!fileExt || fileExt.includes('?') || fileExt.length > 4) {
        fileExt = file.type === 'video' ? 'mp4' : 'jpg';
      }

      const fileName = `${sellerId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${category}/${fileName}`;

      console.log('Uploading to path:', filePath);

      // Determine proper content type
      const contentType = file.type === 'video'
        ? (fileExt === 'mov' ? 'video/quicktime' : 'video/mp4')
        : `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('marketplace-media')
        .upload(filePath, decode(base64), {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('marketplace-media')
        .getPublicUrl(filePath);

      console.log('Upload successful, URL:', urlData.publicUrl);
      uploadedUrls.push(urlData.publicUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  return uploadedUrls;
}

/**
 * Create marketplace item in database
 */
export async function createMarketplaceItem(
  category: MarketplaceCategory,
  formData: any,
  sellerId: string,
  mediaUrls: string[]
) {
  try {
    // Prepare base data common to all categories
    const baseData: any = {
      seller_id: sellerId,
      title: formData.title.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price),
      city: formData.city.trim(),
      condition: formData.condition ? convertToDbFormat.condition(formData.condition) : null,
      is_available: true,
      listing_status: 'approved', // Auto-approve as per your workflow
      contact_number: formData.contactNumber?.trim() || null,
    };

    // Add category-specific fields
    let categoryData: any = {};

    switch (category) {
      case 'electronics':
        categoryData = {
          brand: formData.brand?.trim() || null,
          model: formData.model?.trim() || null,
          warranty: formData.warranty?.trim() || null,
        };
        break;

      case 'fashion':
        categoryData = {
          size: formData.size?.trim() || null,
          color: formData.color?.trim() || null,
          material: formData.material?.trim() || null,
          gender: formData.gender ? convertToDbFormat.gender(formData.gender) : null,
          brand: formData.brand?.trim() || null,
          made_in: formData.madeInFashion?.trim() || null,
        };
        break;

      case 'cosmetics':
        categoryData = {
          brand: formData.brand?.trim() || null,
          volume: formData.volume?.trim() || null,
          scent_type: formData.scentType?.trim() || null,
          skin_type: formData.skinType?.trim() || null,
          expiry_date: formData.expiryDate ? convertToDbFormat.date(formData.expiryDate) : null,
          is_organic: formData.isOrganic || false,
          made_in: formData.madeInCosmetics?.trim() || null,
        };
        break;

      case 'house_items':
        categoryData = {
          brand: formData.brand?.trim() || null,
          category_type: formData.categoryType?.trim() || null,
          made_in: formData.madeInHouseItems?.trim() || null,
        };
        break;

      case 'cars':
        categoryData = {
          make: formData.carMake?.trim() || null,
          model: formData.carModel?.trim() || null,
          year: formData.year ? parseInt(formData.year) : null,
          mileage: formData.mileage ? parseInt(formData.mileage) : null,
          fuel_type: formData.fuelType ? convertToDbFormat.fuelType(formData.fuelType) : null,
          transmission: formData.transmission ? convertToDbFormat.transmission(formData.transmission) : null,
        };
        break;

      case 'businesses':
        categoryData = {
          business_type: formData.businessType?.trim() || null,
          year_established: formData.yearEstablished ? parseInt(formData.yearEstablished) : null,
          number_of_employees: formData.numberOfEmployees ? parseInt(formData.numberOfEmployees) : null,
          monthly_revenue: formData.monthlyRevenue ? parseFloat(formData.monthlyRevenue) : null,
          annual_revenue: formData.annualRevenue ? parseFloat(formData.annualRevenue) : null,
        };
        break;

      case 'properties_for_sale':
        categoryData = {
          property_type: formData.propertyType?.trim() || null,
          address: formData.address?.trim() || null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        };
        break;
    }

    // Combine base data and category-specific data
    const itemData = { ...baseData, ...categoryData };

    // Insert item into category table
    const { data: item, error: itemError } = await supabase
      .from(category)
      .insert(itemData)
      .select()
      .single();

    if (itemError) throw itemError;

    // Insert media records
    if (mediaUrls.length > 0) {
      const mediaRecords = mediaUrls.map((url, index) => ({
        item_id: item.id, // All media tables use 'item_id' as foreign key
        media_type: 'image',
        media_url: url,
        display_order: index + 1,
      }));

      const { error: mediaError } = await supabase
        .from(`${category}_media`)
        .insert(mediaRecords);

      if (mediaError) {
        console.error('Error inserting media:', mediaError);
        // Don't throw - item is created, just log the media error
      }
    }

    return { data: item, error: null };
  } catch (error) {
    console.error('Error creating marketplace item:', error);
    return { data: null, error };
  }
}

/**
 * Update marketplace item
 */
export async function updateMarketplaceItem(
  category: MarketplaceCategory,
  itemId: string,
  formData: any
) {
  try {
    // Prepare base data common to all categories
    const baseData: any = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price),
      city: formData.city.trim(),
      condition: formData.condition ? convertToDbFormat.condition(formData.condition) : null,
      contact_number: formData.contactNumber?.trim() || null,
    };

    // Add category-specific fields (same as create)
    let categoryData: any = {};

    switch (category) {
      case 'electronics':
        categoryData = {
          brand: formData.brand?.trim() || null,
          model: formData.model?.trim() || null,
          warranty: formData.warranty?.trim() || null,
        };
        break;

      case 'fashion':
        categoryData = {
          size: formData.size?.trim() || null,
          color: formData.color?.trim() || null,
          material: formData.material?.trim() || null,
          gender: formData.gender ? convertToDbFormat.gender(formData.gender) : null,
          brand: formData.brand?.trim() || null,
          made_in: formData.madeInFashion?.trim() || null,
        };
        break;

      case 'cosmetics':
        categoryData = {
          brand: formData.brand?.trim() || null,
          volume: formData.volume?.trim() || null,
          scent_type: formData.scentType?.trim() || null,
          skin_type: formData.skinType?.trim() || null,
          expiry_date: formData.expiryDate ? convertToDbFormat.date(formData.expiryDate) : null,
          is_organic: formData.isOrganic || false,
          made_in: formData.madeInCosmetics?.trim() || null,
        };
        break;

      case 'house_items':
        categoryData = {
          brand: formData.brand?.trim() || null,
          category_type: formData.categoryType?.trim() || null,
          made_in: formData.madeInHouseItems?.trim() || null,
        };
        break;

      case 'cars':
        categoryData = {
          make: formData.carMake?.trim() || null,
          model: formData.carModel?.trim() || null,
          year: formData.year ? parseInt(formData.year) : null,
          mileage: formData.mileage ? parseInt(formData.mileage) : null,
          fuel_type: formData.fuelType ? convertToDbFormat.fuelType(formData.fuelType) : null,
          transmission: formData.transmission ? convertToDbFormat.transmission(formData.transmission) : null,
        };
        break;

      case 'businesses':
        categoryData = {
          business_type: formData.businessType?.trim() || null,
          year_established: formData.yearEstablished ? parseInt(formData.yearEstablished) : null,
          number_of_employees: formData.numberOfEmployees ? parseInt(formData.numberOfEmployees) : null,
          monthly_revenue: formData.monthlyRevenue ? parseFloat(formData.monthlyRevenue) : null,
          annual_revenue: formData.annualRevenue ? parseFloat(formData.annualRevenue) : null,
        };
        break;

      case 'properties_for_sale':
        categoryData = {
          property_type: formData.propertyType?.trim() || null,
          address: formData.address?.trim() || null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        };
        break;
    }

    // Combine base data and category-specific data
    const itemData = { ...baseData, ...categoryData };

    // Update item in category table
    const { data: item, error: itemError } = await supabase
      .from(category)
      .update(itemData)
      .eq('id', itemId)
      .select()
      .single();

    if (itemError) throw itemError;

    return { data: item, error: null };
  } catch (error) {
    console.error('Error updating marketplace item:', error);
    return { data: null, error };
  }
}

/**
 * Delete marketplace item
 */
export async function deleteMarketplaceItem(
  category: MarketplaceCategory,
  itemId: string
) {
  try {
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

/**
 * Mark item as sold/unavailable
 */
export async function markItemAsSold(
  category: MarketplaceCategory,
  itemId: string,
  isSold: boolean
) {
  try {
    const { error } = await supabase
      .from(category)
      .update({ is_available: !isSold })
      .eq('id', itemId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error updating item status:', error);
    return { error };
  }
}

/**
 * Fetch user's marketplace items across all categories
 */
export async function fetchUserMarketplaceItems(userId: string) {
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
      categories.map(async (category) => {
        const mediaTable = `${category}_media`;
        const { data, error } = await supabase
          .from(category)
          .select(`
            *,
            media:${mediaTable}(
              id,
              media_type,
              media_url,
              display_order
            )
          `)
          .eq('seller_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error(`Error fetching ${category}:`, error);
          return [];
        }

        return (data || []).map(item => ({
          ...item,
          category_id: category,
        }));
      })
    );

    // Flatten and sort by created_at
    const allItems = results.flat().sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { data: allItems, error: null };
  } catch (error) {
    console.error('Error fetching user marketplace items:', error);
    return { data: null, error };
  }
}

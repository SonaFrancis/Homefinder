import { MarketplaceCategory } from './marketplace-api';

/**
 * Format price to FCFA currency format
 */
export function formatPrice(price: number): string {
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

/**
 * Get category display name
 */
export function getCategoryName(category: MarketplaceCategory): string {
  const categoryMap: Record<MarketplaceCategory, string> = {
    electronics: 'Electronics',
    cars: 'Cars',
    house_items: 'House Items',
    fashion: 'Fashion',
    cosmetics: 'Cosmetics',
    businesses: 'Businesses',
    properties_for_sale: 'Properties',
  };

  return categoryMap[category] || category;
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: MarketplaceCategory): string {
  const iconMap: Record<MarketplaceCategory, string> = {
    electronics: '💻',
    cars: '🚗',
    house_items: '🏠',
    fashion: '👕',
    cosmetics: '💄',
    businesses: '💼',
    properties_for_sale: '🏘️',
  };

  return iconMap[category] || '📦';
}

/**
 * Format condition text
 */
export function formatCondition(condition?: string): string {
  if (!condition) return '';

  const conditionMap: Record<string, string> = {
    new: 'Brand New',
    like_new: 'Like New',
    good: 'Good Condition',
    fair: 'Fair Condition',
    poor: 'Poor Condition',
  };

  return conditionMap[condition] || condition;
}

/**
 * Get time ago string from timestamp
 */
export function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffMs / 604800000);
  const diffMonths = Math.floor(diffMs / 2592000000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Format large numbers (e.g., views count)
 */
export function formatCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}

/**
 * Get first media URL from media array
 */
export function getFirstMediaUrl(
  media?: Array<{ media_type: 'image' | 'video'; media_url: string }>
): string | null {
  if (!media || media.length === 0) return null;

  const firstImage = media.find(m => m.media_type === 'image');
  return firstImage?.media_url || null;
}

/**
 * Validate price range
 */
export function isInPriceRange(price: number, min?: number, max?: number): boolean {
  if (min !== undefined && price < min) return false;
  if (max !== undefined && price > max) return false;
  return true;
}

/**
 * Sort items by different criteria
 */
export function sortItems<T extends { created_at: string; price: number; views_count: number }>(
  items: T[],
  sortBy: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'popular'
): T[] {
  const sorted = [...items];

  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case 'price_low':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price_high':
      return sorted.sort((a, b) => b.price - a.price);
    case 'popular':
      return sorted.sort((a, b) => b.views_count - a.views_count);
    default:
      return sorted;
  }
}

/**
 * Build WhatsApp URL for contacting seller
 */
export function buildWhatsAppUrl(
  phoneNumber: string,
  itemTitle: string,
  itemPrice: number
): string {
  // Remove all non-digit characters from phone number
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  // Add Cameroon country code if not present
  const fullNumber = cleanNumber.startsWith('237') ? cleanNumber : `237${cleanNumber}`;

  // Build message
  const message = encodeURIComponent(
    `Hello! I'm interested in your listing: "${itemTitle}" priced at ${formatPrice(itemPrice)}. Is it still available?`
  );

  return `https://wa.me/${fullNumber}?text=${message}`;
}

/**
 * Get category-specific fields display
 */
export function getCategorySpecificInfo(item: any, category: MarketplaceCategory): string[] {
  const info: string[] = [];

  switch (category) {
    case 'electronics':
      if (item.brand) info.push(`Brand: ${item.brand}`);
      if (item.model) info.push(`Model: ${item.model}`);
      if (item.warranty) info.push(`Warranty: ${item.warranty}`);
      break;

    case 'cars':
      if (item.make) info.push(`Make: ${item.make}`);
      if (item.model) info.push(`Model: ${item.model}`);
      if (item.year) info.push(`Year: ${item.year}`);
      if (item.mileage) info.push(`Mileage: ${item.mileage.toLocaleString()} km`);
      if (item.fuel_type) info.push(`Fuel: ${item.fuel_type}`);
      if (item.transmission) info.push(`Transmission: ${item.transmission}`);
      break;

    case 'fashion':
      if (item.brand) info.push(`Brand: ${item.brand}`);
      if (item.size) info.push(`Size: ${item.size}`);
      if (item.color) info.push(`Color: ${item.color}`);
      if (item.material) info.push(`Material: ${item.material}`);
      if (item.gender) info.push(`Gender: ${item.gender}`);
      break;

    case 'cosmetics':
      if (item.brand) info.push(`Brand: ${item.brand}`);
      if (item.volume) info.push(`Volume: ${item.volume}`);
      if (item.scent_type) info.push(`Scent: ${item.scent_type}`);
      if (item.skin_type) info.push(`Skin Type: ${item.skin_type}`);
      if (item.is_organic) info.push('Organic');
      break;

    case 'house_items':
      if (item.brand) info.push(`Brand: ${item.brand}`);
      if (item.material) info.push(`Material: ${item.material}`);
      if (item.made_in) info.push(`Made in: ${item.made_in}`);
      break;

    case 'businesses':
      if (item.business_type) info.push(`Type: ${item.business_type}`);
      if (item.year_established) info.push(`Established: ${item.year_established}`);
      if (item.number_of_employees) info.push(`Employees: ${item.number_of_employees}`);
      if (item.monthly_revenue) info.push(`Monthly Revenue: ${formatPrice(item.monthly_revenue)}`);
      break;

    case 'properties_for_sale':
      if (item.property_type) info.push(`Type: ${item.property_type}`);
      if (item.bedrooms) info.push(`${item.bedrooms} beds`);
      if (item.bathrooms) info.push(`${item.bathrooms} baths`);
      break;
  }

  return info;
}

/**
 * Validate Cameroon phone number
 */
export function isValidCameroonPhone(phone: string): boolean {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Check if it's a valid Cameroon number (9 digits or 12 with country code)
  if (cleaned.length === 9) {
    // Should start with 6
    return cleaned.startsWith('6');
  } else if (cleaned.length === 12) {
    // Should start with 237
    return cleaned.startsWith('237');
  }

  return false;
}

/**
 * Get listing status color
 */
export function getStatusColor(status: 'pending' | 'approved' | 'rejected'): string {
  const colorMap = {
    pending: '#FFA500',
    approved: '#10B981',
    rejected: '#EF4444',
  };

  return colorMap[status];
}

/**
 * Get listing status text
 */
export function getStatusText(status: 'pending' | 'approved' | 'rejected'): string {
  const textMap = {
    pending: 'Pending Review',
    approved: 'Active',
    rejected: 'Rejected',
  };

  return textMap[status];
}

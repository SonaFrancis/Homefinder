/**
 * Validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }

  return { isValid: true };
}

/**
 * Validate phone number (Cameroon format)
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  // Cameroon phone numbers: +237 6XX XXX XXX or 6XX XXX XXX
  const phoneRegex = /^(\+237)?6[0-9]{8}$/;

  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  const cleanedPhone = phone.replace(/\s/g, '');

  if (!phoneRegex.test(cleanedPhone)) {
    return { isValid: false, error: 'Invalid Cameroon phone number format' };
  }

  return { isValid: true };
}

/**
 * Validate WhatsApp number (Cameroon format)
 */
export function validateWhatsAppNumber(phone: string): ValidationResult {
  return validatePhoneNumber(phone);
}

/**
 * Validate price
 */
export function validatePrice(price: string | number): ValidationResult {
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(priceNum)) {
    return { isValid: false, error: 'Price must be a valid number' };
  }

  if (priceNum < 0) {
    return { isValid: false, error: 'Price cannot be negative' };
  }

  if (priceNum === 0) {
    return { isValid: false, error: 'Price must be greater than 0' };
  }

  return { isValid: true };
}

/**
 * Validate property title
 */
export function validateTitle(title: string, minLength: number = 10, maxLength: number = 100): ValidationResult {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: 'Title is required' };
  }

  if (title.trim().length < minLength) {
    return { isValid: false, error: `Title must be at least ${minLength} characters` };
  }

  if (title.length > maxLength) {
    return { isValid: false, error: `Title must not exceed ${maxLength} characters` };
  }

  return { isValid: true };
}

/**
 * Validate description
 */
export function validateDescription(description: string, minLength: number = 20, maxLength: number = 2000): ValidationResult {
  if (!description || description.trim().length === 0) {
    return { isValid: false, error: 'Description is required' };
  }

  if (description.trim().length < minLength) {
    return { isValid: false, error: `Description must be at least ${minLength} characters` };
  }

  if (description.length > maxLength) {
    return { isValid: false, error: `Description must not exceed ${maxLength} characters` };
  }

  return { isValid: true };
}

/**
 * Validate city (Cameroon cities)
 */
export const CAMEROON_CITIES = [
  'Yaoundé',
  'Douala',
  'Bamenda',
  'Bafoussam',
  'Garoua',
  'Maroua',
  'Ngaoundéré',
  'Bertoua',
  'Ebolowa',
  'Kribi',
  'Limbe',
  'Buea',
  'Kumba',
  'Dschang',
  'Foumban',
];

export function validateCity(city: string): ValidationResult {
  if (!city) {
    return { isValid: false, error: 'City is required' };
  }

  if (!CAMEROON_CITIES.includes(city)) {
    return { isValid: false, error: 'Please select a valid city' };
  }

  return { isValid: true };
}

/**
 * Validate number of rooms
 */
export function validateRooms(rooms: string | number, fieldName: string = 'Rooms'): ValidationResult {
  const roomsNum = typeof rooms === 'string' ? parseInt(rooms, 10) : rooms;

  if (isNaN(roomsNum)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }

  if (roomsNum < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative` };
  }

  if (roomsNum > 50) {
    return { isValid: false, error: `${fieldName} seems too large` };
  }

  return { isValid: true };
}

/**
 * Validate square meters
 */
export function validateSquareMeters(sqm: string | number): ValidationResult {
  const sqmNum = typeof sqm === 'string' ? parseFloat(sqm) : sqm;

  if (isNaN(sqmNum)) {
    return { isValid: false, error: 'Square meters must be a valid number' };
  }

  if (sqmNum <= 0) {
    return { isValid: false, error: 'Square meters must be greater than 0' };
  }

  if (sqmNum > 10000) {
    return { isValid: false, error: 'Square meters seems too large' };
  }

  return { isValid: true };
}

/**
 * Validate amenities list
 */
export function validateAmenities(amenities: string[]): ValidationResult {
  if (!amenities || amenities.length === 0) {
    return { isValid: false, error: 'Please add at least one amenity' };
  }

  if (amenities.length > 30) {
    return { isValid: false, error: 'Too many amenities (max 30)' };
  }

  return { isValid: true };
}

/**
 * Validate media count
 */
export function validateMediaCount(
  imageCount: number,
  videoCount: number,
  maxImages: number,
  maxVideos: number
): ValidationResult {
  if (imageCount === 0 && videoCount === 0) {
    return { isValid: false, error: 'Please add at least one image or video' };
  }

  if (imageCount > maxImages) {
    return { isValid: false, error: `Maximum ${maxImages} images allowed` };
  }

  if (videoCount > maxVideos) {
    return { isValid: false, error: `Maximum ${maxVideos} videos allowed` };
  }

  return { isValid: true };
}

/**
 * Validate full name
 */
export function validateFullName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Full name is required' };
  }

  if (name.trim().length < 3) {
    return { isValid: false, error: 'Full name must be at least 3 characters' };
  }

  if (name.length > 100) {
    return { isValid: false, error: 'Full name is too long' };
  }

  return { isValid: true };
}

/**
 * Format price with currency
 */
export function formatPrice(price: number): string {
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('237')) {
    const number = cleaned.substring(3);
    return `+237 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
  }

  return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
}

/**
 * Format WhatsApp link
 */
export function formatWhatsAppLink(phone: string, message?: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const countryCode = cleaned.startsWith('237') ? cleaned : `237${cleaned}`;

  const encodedMessage = message ? encodeURIComponent(message) : '';

  return `https://wa.me/${countryCode}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
}
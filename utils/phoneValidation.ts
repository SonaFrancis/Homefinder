/**
 * Phone number validation utilities
 * Supports international phone numbers with optional + prefix
 */

/**
 * Validates if a phone number is in correct format
 * Accepts formats:
 * - 237676237346 (country code + number, no +)
 * - +237676237346 (with + prefix)
 * - Minimum 10 digits, maximum 15 digits
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all spaces, dashes, parentheses
  const cleaned = phone.trim().replace(/[\s\-()]/g, '');

  // Check if it matches international format
  // Optional + at start, then 10-15 digits
  const phoneRegex = /^\+?\d{10,15}$/;

  return phoneRegex.test(cleaned);
};

/**
 * Formats phone number for WhatsApp link
 * Removes all non-numeric characters including +
 * Returns just the digits
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove all non-numeric characters (including +, spaces, dashes, etc.)
  return phone.replace(/[^0-9]/g, '');
};

/**
 * Formats phone number for display
 * Keeps the + if present, removes other special characters
 */
export const formatPhoneForDisplay = (phone: string): string => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove spaces, dashes, parentheses but keep +
  const cleaned = phone.trim().replace(/[\s\-()]/g, '');

  // Ensure + is only at the start
  if (cleaned.includes('+')) {
    const withoutPlus = cleaned.replace(/\+/g, '');
    return '+' + withoutPlus;
  }

  return cleaned;
};

/**
 * Get phone number validation error message
 */
export const getPhoneValidationError = (phone: string): string | null => {
  if (!phone || phone.trim() === '') {
    return null; // Empty is okay, it's optional
  }

  const cleaned = phone.trim().replace(/[\s\-()]/g, '');

  if (!/^\+?\d+$/.test(cleaned)) {
    return 'Phone number can only contain digits and optional + at the start';
  }

  const digitsOnly = cleaned.replace(/\+/g, '');

  if (digitsOnly.length < 10) {
    return 'Phone number must be at least 10 digits';
  }

  if (digitsOnly.length > 15) {
    return 'Phone number cannot exceed 15 digits';
  }

  return null;
};

/**
 * Example formats for placeholder text
 */
export const PHONE_PLACEHOLDER = '+237676237346';
export const PHONE_HELPER_TEXT = 'Enter international format with country code (e.g., +237676237346)';

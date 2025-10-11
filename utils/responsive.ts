/**
 * Responsive utilities for cross-device compatibility
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11 Pro)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Responsive width based on screen size
 */
export const wp = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

/**
 * Responsive height based on screen size
 */
export const hp = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

/**
 * Scale size for different screen sizes
 */
export const scale = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Scale font size for different screen sizes
 */
export const scaleFont = (size: number): number => {
  const scaledSize = (SCREEN_WIDTH / BASE_WIDTH) * size;
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
};

/**
 * Moderate scale - less aggressive scaling
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

/**
 * Check if device is small (< 375px wide)
 */
export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375;
};

/**
 * Check if device is tablet
 */
export const isTablet = (): boolean => {
  return SCREEN_WIDTH >= 768;
};

/**
 * Check if device has notch (iPhone X and newer)
 */
export const hasNotch = (): boolean => {
  if (Platform.OS === 'android') return false;

  const { height, width } = Dimensions.get('window');
  const aspectRatio = height / width;

  return (
    (height >= 812 && width >= 375) || // iPhone X, XS, 11 Pro, 12 Mini
    (height >= 896 && width >= 414) || // iPhone XR, XS Max, 11, 11 Pro Max
    (height >= 844 && width >= 390) || // iPhone 12, 12 Pro, 13, 13 Pro
    (height >= 926 && width >= 428)    // iPhone 12 Pro Max, 13 Pro Max, 14 Plus
  );
};

/**
 * Get safe area insets
 */
export const getSafeAreaInsets = () => {
  if (Platform.OS === 'ios' && hasNotch()) {
    return {
      top: 44,
      bottom: 34,
      left: 0,
      right: 0,
    };
  } else if (Platform.OS === 'ios') {
    return {
      top: 20,
      bottom: 0,
      left: 0,
      right: 0,
    };
  } else {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };
  }
};

/**
 * Centralized spacing system
 */
export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  base: scale(16),
  lg: scale(20),
  xl: scale(24),
  xxl: scale(32),
  xxxl: scale(40),
};

/**
 * Centralized font sizes
 */
export const fontSize = {
  xs: scaleFont(10),
  sm: scaleFont(12),
  base: scaleFont(14),
  md: scaleFont(16),
  lg: scaleFont(18),
  xl: scaleFont(20),
  xxl: scaleFont(24),
  xxxl: scaleFont(32),
  huge: scaleFont(40),
};

/**
 * Get responsive image dimensions
 */
export const getImageDimensions = (aspectRatio: number, maxWidth?: number) => {
  const width = maxWidth || SCREEN_WIDTH;
  const height = width / aspectRatio;

  return { width, height };
};

/**
 * Get responsive card width for grids
 */
export const getCardWidth = (columns: number, spacing: number = 16): number => {
  return (SCREEN_WIDTH - spacing * (columns + 1)) / columns;
};

/**
 * Screen dimensions
 */
export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};

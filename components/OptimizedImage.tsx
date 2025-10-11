/**
 * Optimized Image Component
 *
 * WHY: React Native's <Image> is slow and doesn't cache properly
 * expo-image provides:
 * - Disk caching (images load instantly after first view)
 * - Memory caching
 * - Placeholder support (blurhash/thumbhash)
 * - Better performance (60 FPS)
 * - Progressive loading
 *
 * USAGE:
 * <OptimizedImage source={{ uri: imageUrl }} style={styles.image} />
 */

import React, { memo } from 'react';
import { Image as ExpoImage, ImageProps as ExpoImageProps } from 'expo-image';
import { StyleSheet } from 'react-native';

interface OptimizedImageProps extends Partial<ExpoImageProps> {
  source: { uri: string } | number;
  style?: any;
  placeholder?: string; // Blurhash string
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  priority?: 'low' | 'normal' | 'high';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized image component using expo-image
 * Memoized to prevent unnecessary re-renders
 */
function OptimizedImageComponent({
  source,
  style,
  placeholder,
  contentFit = 'cover',
  priority = 'normal',
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  return (
    <ExpoImage
      source={source}
      style={style}
      contentFit={contentFit}
      placeholder={placeholder || PLACEHOLDER_BLURHASH}
      placeholderContentFit="cover"
      transition={200} // Smooth fade-in transition
      priority={priority}
      cachePolicy="memory-disk" // Cache in both memory and disk
      onLoad={onLoad}
      onError={onError}
      {...props}
    />
  );
}

// Memoize component to prevent re-renders when props don't change
export const OptimizedImage = memo(OptimizedImageComponent);

/**
 * Default placeholder (light gray blurhash)
 * You can generate custom blurhashes for better UX
 * See: https://blurha.sh/
 */
const PLACEHOLDER_BLURHASH = 'L6PZfSjE.AyE_3t7t7R**0o#DgR4';

const styles = StyleSheet.create({
  // Add default styles if needed
});

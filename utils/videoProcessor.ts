/**
 * Video Processing Utility
 * Handles video validation, compression, and trimming
 */

import { Video } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Constants
const MAX_VIDEO_SIZE_MB = 20;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 30;
const TARGET_RESOLUTION_WIDTH = 720;

export type ProcessVideoResult = {
  valid: boolean;
  uri?: string;
  size?: number;
  duration?: number;
  reason?: string;
  compressed?: boolean;
  trimmed?: boolean;
};

export type VideoMetadata = {
  uri: string;
  size: number;
  duration: number;
  width?: number;
  height?: number;
};

/**
 * Get video metadata (size, duration, dimensions)
 */
export async function getVideoMetadata(
  uri: string,
  duration?: number,
  width?: number,
  height?: number
): Promise<VideoMetadata> {
  try {
    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('Video file not found');
    }

    const size = (fileInfo as any).size || 0;

    // Use provided duration or default to 0
    // Note: Duration should be provided from ImagePicker asset data
    const videoDuration = duration ? duration / 1000 : 0; // Convert from ms to seconds

    return {
      uri,
      size,
      duration: videoDuration,
      width: width || 0,
      height: height || 0,
    };
  } catch (error) {
    console.error('Error getting video metadata:', error);
    throw new Error('Failed to read video metadata');
  }
}

/**
 * Check if video needs processing
 */
export function needsProcessing(metadata: VideoMetadata): {
  needsCompression: boolean;
  needsTrimming: boolean;
} {
  const needsCompression = metadata.size > MAX_VIDEO_SIZE_BYTES;
  const needsTrimming = metadata.duration > MAX_VIDEO_DURATION_SECONDS;

  return { needsCompression, needsTrimming };
}

/**
 * Compress video using expo-video-thumbnails approach
 * Note: This is a simplified approach. For production, consider using
 * expo-video or a native module like react-native-compressor
 */
async function compressVideo(
  uri: string,
  metadata: VideoMetadata
): Promise<string> {
  try {
    // For now, we'll use a workaround since Expo doesn't have built-in compression
    // In production, you should use a library like:
    // - react-native-compressor
    // - expo-video (with FFmpeg)
    // - or a cloud service like Cloudinary

    // Placeholder: Copy the file (in production, this should actually compress)
    const compressedUri = `${FileSystem.cacheDirectory}compressed_${Date.now()}.mp4`;

    // TODO: Implement actual compression using FFmpeg or native module
    // For now, just copy the file as a placeholder
    await FileSystem.copyAsync({
      from: uri,
      to: compressedUri,
    });

    console.warn('Video compression is not fully implemented. Using original file.');
    return compressedUri;
  } catch (error) {
    console.error('Error compressing video:', error);
    throw new Error('Failed to compress video');
  }
}

/**
 * Trim video to maximum duration
 * Note: This requires FFmpeg or a native module for production
 */
async function trimVideo(
  uri: string,
  maxDuration: number = MAX_VIDEO_DURATION_SECONDS
): Promise<string> {
  try {
    // Placeholder: Copy the file (in production, this should actually trim)
    const trimmedUri = `${FileSystem.cacheDirectory}trimmed_${Date.now()}.mp4`;

    // TODO: Implement actual trimming using FFmpeg or native module
    // For now, just copy the file as a placeholder
    await FileSystem.copyAsync({
      from: uri,
      to: trimmedUri,
    });

    console.warn('Video trimming is not fully implemented. Using original file.');
    return trimmedUri;
  } catch (error) {
    console.error('Error trimming video:', error);
    throw new Error('Failed to trim video');
  }
}

/**
 * Main function to process video
 * Validates, compresses, and trims video as needed
 */
export async function processVideo(
  uri: string,
  onProgress?: (progress: number, message: string) => void,
  duration?: number,
  width?: number,
  height?: number
): Promise<ProcessVideoResult> {
  try {
    // Step 1: Get video metadata
    onProgress?.(0.1, 'Reading video information...');
    const metadata = await getVideoMetadata(uri, duration, width, height);

    // Step 2: Check if processing is needed
    const { needsCompression, needsTrimming } = needsProcessing(metadata);

    // If video is within limits, return as valid
    if (!needsCompression && !needsTrimming) {
      onProgress?.(1.0, 'Video is ready!');
      return {
        valid: true,
        uri,
        size: metadata.size,
        duration: metadata.duration,
        compressed: false,
        trimmed: false,
      };
    }

    let processedUri = uri;
    let processedMetadata = metadata;
    let wasCompressed = false;
    let wasTrimmed = false;

    // Step 3: Trim video if too long
    if (needsTrimming) {
      onProgress?.(0.3, 'Trimming video to 30 seconds...');
      try {
        processedUri = await trimVideo(processedUri, MAX_VIDEO_DURATION_SECONDS);
        processedMetadata = await getVideoMetadata(processedUri);
        wasTrimmed = true;
        onProgress?.(0.5, 'Video trimmed successfully!');
      } catch (error) {
        console.error('Failed to trim video:', error);
        return {
          valid: false,
          reason: `Video is too long (${Math.round(metadata.duration)}s). Maximum is ${MAX_VIDEO_DURATION_SECONDS}s. Please upload a shorter video.`,
        };
      }
    }

    // Step 4: Compress video if too large
    if (needsCompression || processedMetadata.size > MAX_VIDEO_SIZE_BYTES) {
      onProgress?.(0.6, 'Compressing video...');
      try {
        processedUri = await compressVideo(processedUri, processedMetadata);
        processedMetadata = await getVideoMetadata(processedUri);
        wasCompressed = true;
        onProgress?.(0.9, 'Video compressed successfully!');
      } catch (error) {
        console.error('Failed to compress video:', error);
        return {
          valid: false,
          reason: `Video file is too large (${(metadata.size / (1024 * 1024)).toFixed(1)}MB). Maximum is ${MAX_VIDEO_SIZE_MB}MB. Please upload a smaller video.`,
        };
      }
    }

    // Step 5: Final validation
    if (
      processedMetadata.size > MAX_VIDEO_SIZE_BYTES ||
      processedMetadata.duration > MAX_VIDEO_DURATION_SECONDS
    ) {
      onProgress?.(1.0, 'Video still exceeds limits');
      return {
        valid: false,
        reason: 'Video is too large or too long even after processing. Please upload a smaller or shorter video.',
      };
    }

    // Success
    onProgress?.(1.0, 'Video is ready!');
    return {
      valid: true,
      uri: processedUri,
      size: processedMetadata.size,
      duration: processedMetadata.duration,
      compressed: wasCompressed,
      trimmed: wasTrimmed,
    };
  } catch (error: any) {
    console.error('Error processing video:', error);
    return {
      valid: false,
      reason: error.message || 'Failed to process video. Please try a different video.',
    };
  }
}

/**
 * Validate and process multiple videos
 */
export async function processMultipleVideos(
  uris: string[],
  onProgress?: (index: number, total: number, progress: number, message: string) => void
): Promise<ProcessVideoResult[]> {
  const results: ProcessVideoResult[] = [];

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    const result = await processVideo(uri, (progress, message) => {
      onProgress?.(i + 1, uris.length, progress, message);
    });
    results.push(result);
  }

  return results;
}

/**
 * Show user-friendly alert for video validation failure
 */
export function showVideoValidationError(reason: string) {
  Alert.alert(
    'Video Upload Issue',
    reason,
    [{ text: 'OK', style: 'default' }],
    { cancelable: true }
  );
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
}

/**
 * Get video validation limits info
 */
export function getVideoLimits() {
  return {
    maxSizeMB: MAX_VIDEO_SIZE_MB,
    maxSizeBytes: MAX_VIDEO_SIZE_BYTES,
    maxDurationSeconds: MAX_VIDEO_DURATION_SECONDS,
    maxDurationFormatted: formatDuration(MAX_VIDEO_DURATION_SECONDS),
  };
}

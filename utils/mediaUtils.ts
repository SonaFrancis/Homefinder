import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { supabase } from '@/lib/supabase';

const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1080;
const IMAGE_QUALITY = 0.8;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;

export interface MediaUploadResult {
  url: string;
  thumbnailUrl?: string;
  fileSize: number;
  type: 'image' | 'video';
}

/**
 * Request camera and media library permissions
 */
export async function requestMediaPermissions(): Promise<boolean> {
  const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
  const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  return cameraPermission.granted && libraryPermission.granted;
}

/**
 * Compress and resize image
 */
export async function compressImage(uri: string): Promise<string> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: MAX_IMAGE_WIDTH,
            height: MAX_IMAGE_HEIGHT,
          },
        },
      ],
      {
        compress: IMAGE_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return manipResult.uri;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Failed to compress image');
  }
}

/**
 * Generate video thumbnail
 */
export async function generateVideoThumbnail(videoUri: string): Promise<string> {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 1000, // Get thumbnail at 1 second
    });
    return uri;
  } catch (error) {
    console.error('Error generating video thumbnail:', error);
    throw new Error('Failed to generate video thumbnail');
  }
}

/**
 * Get file size in MB
 */
export async function getFileSize(uri: string): Promise<number> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size / (1024 * 1024); // Convert to MB
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
}

/**
 * Validate file size
 */
export function validateFileSize(sizeMB: number, type: 'image' | 'video'): boolean {
  const maxSize = type === 'image' ? MAX_IMAGE_SIZE_MB : MAX_VIDEO_SIZE_MB;
  return sizeMB <= maxSize;
}

/**
 * Pick image from library or camera
 */
export async function pickImage(useCamera: boolean = false): Promise<string | null> {
  try {
    let result;

    if (useCamera) {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
    }

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const uri = result.assets[0].uri;

    // Check file size
    const sizeMB = await getFileSize(uri);
    if (!validateFileSize(sizeMB, 'image')) {
      throw new Error(`Image size must be less than ${MAX_IMAGE_SIZE_MB}MB`);
    }

    // Compress image
    const compressedUri = await compressImage(uri);
    return compressedUri;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
}

/**
 * Pick multiple images
 */
export async function pickMultipleImages(maxImages: number = 10): Promise<string[]> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxImages,
      quality: 1,
    });

    if (result.canceled || !result.assets) {
      return [];
    }

    const compressedImages: string[] = [];

    for (const asset of result.assets) {
      // Check file size
      const sizeMB = await getFileSize(asset.uri);
      if (!validateFileSize(sizeMB, 'image')) {
        console.warn(`Skipping image: size exceeds ${MAX_IMAGE_SIZE_MB}MB`);
        continue;
      }

      // Compress image
      const compressedUri = await compressImage(asset.uri);
      compressedImages.push(compressedUri);
    }

    return compressedImages;
  } catch (error) {
    console.error('Error picking multiple images:', error);
    throw error;
  }
}

/**
 * Pick video from library
 */
export async function pickVideo(): Promise<string | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const uri = result.assets[0].uri;

    // Check file size
    const sizeMB = await getFileSize(uri);
    if (!validateFileSize(sizeMB, 'video')) {
      throw new Error(`Video size must be less than ${MAX_VIDEO_SIZE_MB}MB`);
    }

    return uri;
  } catch (error) {
    console.error('Error picking video:', error);
    throw error;
  }
}

/**
 * Upload media file to Supabase Storage
 */
export async function uploadMedia(
  uri: string,
  bucket: 'rental-property-media' | 'marketplace-item-media' | 'profile-pictures',
  userId: string,
  type: 'image' | 'video'
): Promise<MediaUploadResult> {
  try {
    // Get file extension
    const fileExtension = uri.split('.').pop() || 'jpg';
    const fileName = `${userId}/${Date.now()}.${fileExtension}`;

    // Convert URI to blob
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileSize = blob.size;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: type === 'image' ? 'image/jpeg' : 'video/mp4',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    let thumbnailUrl: string | undefined;

    // Generate thumbnail for video
    if (type === 'video') {
      const thumbnailUri = await generateVideoThumbnail(uri);
      const thumbnailFileName = `${userId}/thumbnails/${Date.now()}.jpg`;

      const thumbnailResponse = await fetch(thumbnailUri);
      const thumbnailBlob = await thumbnailResponse.blob();

      const { data: thumbnailData, error: thumbnailError } = await supabase.storage
        .from(bucket)
        .upload(thumbnailFileName, thumbnailBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (!thumbnailError && thumbnailData) {
        const { data: { publicUrl: thumbnailPublicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(thumbnailData.path);

        thumbnailUrl = thumbnailPublicUrl;
      }
    }

    return {
      url: publicUrl,
      thumbnailUrl,
      fileSize,
      type,
    };
  } catch (error) {
    console.error('Error uploading media:', error);
    throw new Error('Failed to upload media');
  }
}

/**
 * Delete media file from Supabase Storage
 */
export async function deleteMedia(
  url: string,
  bucket: 'rental-property-media' | 'marketplace-item-media' | 'profile-pictures'
): Promise<void> {
  try {
    // Extract file path from URL
    const path = url.split(`${bucket}/`)[1];

    if (!path) {
      throw new Error('Invalid media URL');
    }

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting media:', error);
    throw error;
  }
}

/**
 * Batch upload multiple images
 */
export async function uploadMultipleImages(
  uris: string[],
  bucket: 'rental-property-media' | 'marketplace-item-media',
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<MediaUploadResult[]> {
  const results: MediaUploadResult[] = [];

  for (let i = 0; i < uris.length; i++) {
    try {
      const result = await uploadMedia(uris[i], bucket, userId, 'image');
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, uris.length);
      }
    } catch (error) {
      console.error(`Error uploading image ${i + 1}:`, error);
      // Continue with next image
    }
  }

  return results;
}
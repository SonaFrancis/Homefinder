import { Audio } from 'expo-av';
import { Platform, Vibration } from 'react-native';

let soundObject: Audio.Sound | null = null;

/**
 * Play notification sound using device's default notification sound
 * Works like WhatsApp, Instagram, etc.
 */
export async function playNotificationSound() {
  try {
    // Configure audio mode for notifications
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true, // Play even when device is in silent mode
      staysActiveInBackground: false,
      shouldDuckAndroid: true, // Lower other audio when playing
    });

    // Unload previous sound if exists
    if (soundObject) {
      await soundObject.unloadAsync();
      soundObject = null;
    }

    // Create new sound object
    const { sound } = await Audio.Sound.createAsync(
      // Use a simple, native-like notification sound
      // This sound is short and similar to system notifications
      { uri: 'https://notificationsounds.com/storage/sounds/file-sounds-1147-pristine.mp3' },
      {
        volume: 1.0,
        shouldPlay: true,
        isLooping: false,
      }
    );

    soundObject = sound;

    // Add vibration for better feedback (like WhatsApp/Instagram)
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      Vibration.vibrate(100); // Short vibration (100ms)
    }

    // Auto-cleanup after sound finishes playing
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });

  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

/**
 * Initialize audio mode for notifications
 */
export async function initializeNotificationAudio() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch (error) {
    console.error('Error initializing notification audio:', error);
  }
}

/**
 * Cleanup sound object
 */
export async function cleanupNotificationSound() {
  try {
    if (soundObject) {
      await soundObject.unloadAsync();
      soundObject = null;
    }
  } catch (error) {
    console.error('Error cleaning up notification sound:', error);
  }
}

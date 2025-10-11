import { createAsync, setAudioModeAsync } from 'expo-audio';
import type { AudioSource, AudioPlayer } from 'expo-audio';

let soundObject: AudioPlayer | null = null;

/**
 * Play notification sound
 * Uses a simple beep sound that works across all platforms
 */
export async function playNotificationSound() {
  try {
    // Unload previous sound if exists
    if (soundObject) {
      await soundObject.release();
    }

    // Create and load the sound
    const sound = await createAsync(
      // Using a notification sound URI
      // For custom sound: require('../assets/sounds/notification.mp3')
      { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3' } as AudioSource,
      { volume: 0.5, shouldPlay: true }
    );

    soundObject = sound;

    // Release after playing is complete
    // expo-audio automatically manages playback lifecycle
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

/**
 * Initialize audio mode for notifications
 */
export async function initializeNotificationAudio() {
  try {
    await setAudioModeAsync({
      playsInSilentModeIOS: true,
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
      await soundObject.release();
      soundObject = null;
    }
  } catch (error) {
    console.error('Error cleaning up notification sound:', error);
  }
}

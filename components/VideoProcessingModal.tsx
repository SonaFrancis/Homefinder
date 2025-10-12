/**
 * Video Processing Modal
 * Shows progress while video is being validated, compressed, or trimmed
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { spacing, fontSize, scale } from '@/utils/responsive';

interface VideoProcessingModalProps {
  visible: boolean;
  progress: number;
  message: string;
  currentVideo?: number;
  totalVideos?: number;
}

export function VideoProcessingModal({
  visible,
  progress,
  message,
  currentVideo,
  totalVideos,
}: VideoProcessingModalProps) {
  const progressPercentage = Math.round(progress * 100);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#10B981" style={styles.spinner} />

          <Text style={styles.title}>Processing Video</Text>

          {totalVideos && totalVideos > 1 && (
            <Text style={styles.videoCount}>
              Video {currentVideo} of {totalVideos}
            </Text>
          )}

          <Text style={styles.message}>{message}</Text>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
          </View>

          <Text style={styles.percentage}>{progressPercentage}%</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: scale(16),
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  spinner: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  videoCount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.md,
    color: '#666',
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: scale(8),
    backgroundColor: '#E5E7EB',
    borderRadius: scale(4),
    overflow: 'hidden',
    marginBottom: spacing.base,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: scale(4),
  },
  percentage: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#10B981',
  },
});

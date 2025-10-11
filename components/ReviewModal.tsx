import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, scale } from '@/utils/responsive';
import { supabase } from '@/lib/supabase';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  reviewedUserId: string;
  reviewedUserName: string;
  userType: 'landlord' | 'seller';
  onReviewSubmitted: () => void;
}

export function ReviewModal({
  visible,
  onClose,
  reviewedUserId,
  reviewedUserName,
  userType,
  onReviewSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    try {
      setSubmitting(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to submit a review');
        return;
      }

      // Check if user is trying to review themselves
      if (user.id === reviewedUserId) {
        Alert.alert('Error', 'You cannot review yourself');
        return;
      }

      // Insert review
      const { error } = await supabase
        .from('reviews')
        .insert({
          reviewer_id: user.id,
          reviewed_user_id: reviewedUserId,
          listing_type: userType === 'landlord' ? 'rental' : 'marketplace',
          listing_id: reviewedUserId, // Using user ID as placeholder
          rating: rating,
          comment: comment.trim() || null,
          is_visible: true,
        });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Already Reviewed', 'You have already reviewed this user');
        } else {
          throw error;
        }
        return;
      }

      Alert.alert('Success', 'Your review has been submitted');
      setRating(0);
      setComment('');
      onReviewSubmitted();
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Review {reviewedUserName}</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={scale(24)} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Rating */}
              <View style={styles.section}>
                <Text style={styles.label}>Rating *</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={scale(36)}
                        color="#FFB800"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                {rating > 0 && (
                  <Text style={styles.ratingText}>
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent'}
                  </Text>
                )}
              </View>

              {/* Comment */}
              <View style={styles.section}>
                <Text style={styles.label}>Comment (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Share your experience..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  value={comment}
                  onChangeText={setComment}
                  maxLength={500}
                />
                <Text style={styles.characterCount}>{comment.length}/500</Text>
              </View>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: spacing.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: spacing.md,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  starButton: {
    padding: spacing.xs,
  },
  ratingText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: scale(12),
    padding: spacing.base,
    fontSize: fontSize.base,
    color: '#1a1a1a',
    minHeight: scale(100),
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: fontSize.xs,
    color: '#999',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.base,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: spacing.base,
    borderRadius: scale(12),
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#fff',
  },
});

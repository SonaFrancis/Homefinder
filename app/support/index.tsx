import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { spacing, fontSize, scale } from '@/utils/responsive';

const ISSUE_CATEGORIES = [
  { id: 'subscription', label: 'Subscription Issue', icon: 'card-outline' },
  { id: 'account', label: 'Account Issue', icon: 'person-outline' },
  { id: 'payment', label: 'Payment Issue', icon: 'cash-outline' },
  { id: 'technical', label: 'Technical Issue', icon: 'bug-outline' },
  { id: 'listing', label: 'Listing Issue', icon: 'home-outline' },
  { id: 'other', label: 'Other', icon: 'help-circle-outline' },
];

export default function SupportScreen() {
  const { profile } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!selectedCategory) {
      Alert.alert('Required', 'Please select an issue category');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('Required', 'Please enter a subject');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please describe your issue');
      return;
    }
    if (!profile?.id) {
      Alert.alert('Error', 'You must be logged in to submit a support ticket');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create subject with category prefix
      const fullSubject = `[${selectedCategory.toUpperCase()}] ${subject.trim()}`;

      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: profile.id,
          subject: fullSubject,
          message: description.trim(),
          status: 'open',
          priority: 'normal',
        });

      if (error) throw error;

      Alert.alert(
        'Success',
        'Your support ticket has been submitted. Our team will respond within 24 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setSelectedCategory('');
              setSubject('');
              setDescription('');
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting ticket:', error);
      Alert.alert('Error', error.message || 'Failed to submit support ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    const phoneNumber = '237123456789'; // Replace with your support number
    const message = 'Hi, I need help with my account';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed on your device');
    });
  };

  const handleEmail = () => {
    const email = 'support@rentalapp.com'; // Replace with your support email
    const subject = 'Support Request';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={scale(24)} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How can we help you</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>
            Tell us about your issue and we'll get back to you as soon as possible.
          </Text>
        </View>

        {/* Quick Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Contact</Text>
          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleWhatsApp}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#E8F5F0' }]}>
                <Ionicons name="logo-whatsapp" size={scale(24)} color="#10B981" />
              </View>
              <Text style={styles.contactLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleEmail}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="mail" size={scale(24)} color="#6366F1" />
              </View>
              <Text style={styles.contactLabel}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Ticket Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submit a Ticket</Text>

          {/* Issue Category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Issue Category *</Text>
            <View style={styles.categoriesGrid}>
              {ISSUE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={scale(20)}
                    color={selectedCategory === category.id ? '#10B981' : '#666'}
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      selectedCategory === category.id && styles.categoryLabelActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Subject */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief description of your issue"
                placeholderTextColor="#999"
                maxLength={100}
              />
            </View>
            <Text style={styles.charCount}>{subject.length} / 100</Text>
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description *</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Please describe your issue in detail..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={500}
              />
            </View>
            <Text style={styles.charCount}>{description.length} / 500</Text>
          </View>

          {/* Contact Info Display */}
          <View style={styles.contactInfo}>
            <Ionicons name="information-circle-outline" size={scale(18)} color="#6B7280" />
            <Text style={styles.contactInfoText}>
              We'll respond to: {profile?.email || 'your email'}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <Text style={styles.submitButtonText}>Submitting...</Text>
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Ticket</Text>
                <Ionicons name="send" size={scale(20)} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          <View style={styles.faqList}>
            {[
              {
                question: 'How do I upgrade my subscription?',
                answer: 'Go to Profile > Edit Profile > Account Status section and tap "Upgrade to Premium".',
              },
              {
                question: 'How long does it take to get a response?',
                answer: 'Our support team typically responds within 24 hours on business days.',
              },
              {
                question: 'Can I cancel my subscription?',
                answer: 'Yes, you can cancel anytime from your Account Status section. Your benefits will remain active until the end of your billing period.',
              },
              {
                question: 'How do I report a listing?',
                answer: 'Open the listing and tap the flag icon to report inappropriate content.',
              },
            ].map((faq, index) => (
              <View key={index} style={styles.faqItem}>
                <View style={styles.faqHeader}>
                  <Ionicons name="help-circle" size={scale(20)} color="#10B981" />
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                </View>
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Response Time Info */}
        <View style={styles.infoCard}>
          <Ionicons name="time-outline" size={scale(24)} color="#6B7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Average Response Time</Text>
            <Text style={styles.infoText}>
              We aim to respond to all tickets within 24 hours during business days.
              Urgent issues are prioritized.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  placeholder: {
    width: scale(40),
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  welcomeCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  welcomeText: {
    fontSize: fontSize.base,
    color: '#666',
    textAlign: 'center',
    lineHeight: fontSize.xl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.lg,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  contactButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: spacing.base,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  contactIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  contactLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: spacing.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipActive: {
    backgroundColor: '#E8F5F0',
    borderColor: '#10B981',
  },
  categoryLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#666',
  },
  categoryLabelActive: {
    color: '#10B981',
  },
  inputContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    fontSize: fontSize.base,
    color: '#1a1a1a',
  },
  textAreaContainer: {
    minHeight: scale(120),
  },
  textArea: {
    minHeight: scale(100),
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: fontSize.xs,
    color: '#999',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: spacing.sm,
    marginBottom: spacing.lg,
  },
  contactInfoText: {
    fontSize: fontSize.sm,
    color: '#6B7280',
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#10B981',
    paddingVertical: spacing.base,
    borderRadius: spacing.md,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  faqList: {
    gap: spacing.base,
  },
  faqItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: spacing.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  faqQuestion: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  faqAnswer: {
    fontSize: fontSize.sm,
    color: '#666',
    lineHeight: fontSize.lg,
    paddingLeft: scale(28),
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.base,
    backgroundColor: '#F9FAFB',
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: '#666',
    lineHeight: fontSize.lg,
  },
});

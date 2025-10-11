import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, scale } from '@/utils/responsive';
import { PaymentModal } from '@/components/PaymentModal';

type PlanType = 'standard' | 'premium';

export default function SubscriptionScreen() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const plans = {
    standard: {
      name: 'Standard',
      price: 5000,
      features: [
        'Up to 20 posts per month',
        '5 images per post',
        '1 video per post',
        'WhatsApp integration',
        'Edit/delete listings',
        'Basic support',
      ],
    },
    premium: {
      name: 'Premium',
      price: 9000,
      popular: true,
      features: [
        'Up to 25 posts per month',
        '5 images per post',
        '2 videos per post',
        'Analytics Dashboard',
        'Priority listings',
        'Verified badge',
        'Priority support',
        'All Standard features',
      ],
    },
  };

  const handleSubscribe = (plan: PlanType) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    // TODO: Update user subscription in database
    Alert.alert(
      'Success!',
      'Your subscription has been activated. Redirecting to dashboard...',
      [
        {
          text: 'OK',
          onPress: () => {
            router.push('/dashboard');
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Standard Plan */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{plans.standard.name}</Text>
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.price}>
              {plans.standard.price.toLocaleString('fr-FR')}
              <Text style={styles.currency}> XAF</Text>
            </Text>
            <Text style={styles.pricePeriod}>per month</Text>
          </View>

          <View style={styles.featuresSection}>
            {plans.standard.features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={scale(20)} color="#10B981" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={() => handleSubscribe('standard')}
          >
            <Text style={styles.subscribeButtonText}>Choose Standard</Text>
          </TouchableOpacity>
        </View>

        {/* Premium Plan */}
        <View style={[styles.planCard, styles.premiumCard]}>
          {plans.premium.popular && (
            <View style={styles.popularBadge}>
              <Ionicons name="star" size={scale(14)} color="#fff" />
              <Text style={styles.popularText}>Most Popular</Text>
            </View>
          )}

          <View style={styles.planHeader}>
            <Text style={styles.planName}>{plans.premium.name}</Text>
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.price}>
              {plans.premium.price.toLocaleString('fr-FR')}
              <Text style={styles.currency}> XAF</Text>
            </Text>
            <Text style={styles.pricePeriod}>per month</Text>
          </View>

          <View style={styles.featuresSection}>
            {plans.premium.features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={scale(20)} color="#10B981" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.subscribeButton, styles.premiumButton]}
            onPress={() => handleSubscribe('premium')}
          >
            <Text style={styles.subscribeButtonText}>Choose Premium</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={scale(24)} color="#6366F1" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Cancel Anytime</Text>
              <Text style={styles.infoText}>
                No long-term contracts. Cancel your subscription anytime from your profile.
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={scale(24)} color="#10B981" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Secure Payment</Text>
              <Text style={styles.infoText}>
                We support MTN Mobile Money, Orange Money, and bank transfers.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          planName={plans[selectedPlan].name}
          price={plans[selectedPlan].price}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
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
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: spacing.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  premiumCard: {
    borderColor: '#10B981',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -spacing.md,
    right: spacing.lg,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.lg,
  },
  popularText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  planHeader: {
    marginBottom: spacing.base,
  },
  planName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  priceSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  price: {
    fontSize: fontSize.huge,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  currency: {
    fontSize: fontSize.xl,
    color: '#6B7280',
  },
  pricePeriod: {
    fontSize: fontSize.base,
    color: '#9CA3AF',
    marginTop: spacing.xs,
  },
  featuresSection: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    flex: 1,
    fontSize: fontSize.base,
    color: '#374151',
    lineHeight: fontSize.xl,
  },
  subscribeButton: {
    backgroundColor: '#10B981',
    paddingVertical: spacing.base,
    borderRadius: spacing.md,
    alignItems: 'center',
  },
  premiumButton: {
    backgroundColor: '#10B981',
  },
  subscribeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  infoSection: {
    marginTop: spacing.lg,
    gap: spacing.base,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.base,
    backgroundColor: '#F9FAFB',
    padding: spacing.base,
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
    marginBottom: spacing.xs / 2,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: '#6B7280',
    lineHeight: fontSize.lg,
  },
});

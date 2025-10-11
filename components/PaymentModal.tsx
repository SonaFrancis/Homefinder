import React, { useState, useEffect } from 'react';
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
import { processPayment, activateSubscription } from '@/services/paymentService';

type PaymentMethod = 'mtn' | 'orange' | null;

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  planName: string;
  price: number;
  onPaymentSuccess: () => void;
}

export function PaymentModal({
  visible,
  onClose,
  planName,
  price,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [processing, setProcessing] = useState(false);

  // Auto-detect payment method based on phone number
  useEffect(() => {
    if (phoneNumber.length >= 2) {
      const prefix2 = phoneNumber.substring(0, 2);
      const prefix3 = phoneNumber.substring(0, 3);

      // MTN prefixes in Cameroon:
      // 3-digit: 650, 651, 652, 653, 654, 680, 681, 682, 683, 684
      // 2-digit: 67
      const mtnPrefixes3 = ['650', '651', '652', '653', '654', '680', '681', '682', '683', '684'];
      const mtnPrefixes2 = ['67'];

      // Orange prefixes in Cameroon:
      // 3-digit: 655, 656, 657, 658, 659, 690, 691, 692, 693, 694, 695, 696, 697, 698, 699
      // 2-digit: 69
      const orangePrefixes3 = ['655', '656', '657', '658', '659'];
      const orangePrefixes2 = ['69'];

      if (phoneNumber.length >= 3 && mtnPrefixes3.includes(prefix3)) {
        setSelectedMethod('mtn');
      } else if (phoneNumber.length >= 2 && mtnPrefixes2.includes(prefix2)) {
        setSelectedMethod('mtn');
      } else if (phoneNumber.length >= 3 && orangePrefixes3.includes(prefix3)) {
        setSelectedMethod('orange');
      } else if (phoneNumber.length >= 2 && orangePrefixes2.includes(prefix2)) {
        setSelectedMethod('orange');
      } else {
        setSelectedMethod(null);
      }
    } else {
      setSelectedMethod(null);
    }
  }, [phoneNumber]);

  const handlePayment = async () => {
    // Validate phone number
    if (!phoneNumber || phoneNumber.length < 9) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return;
    }

    if (!selectedMethod) {
      Alert.alert('Invalid Number', 'Phone number not recognized as MTN or Orange Money');
      return;
    }

    let transactionId: string | null = null;

    try {
      setProcessing(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to make a payment');
        return;
      }

      // Generate payment reference
      const paymentReference = `TXN-${Date.now()}-${user.id.substring(0, 8)}`;
      const formattedPhone = `+237${phoneNumber}`;

      // Create payment transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          amount: price,
          currency: 'XAF',
          payment_method: selectedMethod,
          phone_number: formattedPhone,
          payment_reference: paymentReference,
          plan_type: planName.toLowerCase(),
          billing_period: 'monthly',
          status: 'pending',
          payment_provider: selectedMethod === 'mtn' ? 'MTN Mobile Money' : 'Orange Money',
          metadata: {
            initiated_at: new Date().toISOString(),
            plan_name: planName,
          },
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction creation error:', transactionError);
        Alert.alert('Error', 'Failed to create transaction record');
        return;
      }

      transactionId = transaction.id;

      // Update status to processing
      await supabase
        .from('payment_transactions')
        .update({ status: 'processing' })
        .eq('id', transactionId);

      // Process payment with payment provider
      const paymentResult = await processPayment({
        userId: user.id,
        phoneNumber: formattedPhone,
        amount: price,
        paymentMethod: selectedMethod,
        planType: planName.toLowerCase(),
        transactionId: paymentReference,
      });

      if (!paymentResult.success) {
        // Payment failed - update transaction
        await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            failure_reason: paymentResult.error || paymentResult.message,
            provider_response: {
              status: 'failed',
              message: paymentResult.message,
              error: paymentResult.error,
              timestamp: new Date().toISOString(),
            },
          })
          .eq('id', transactionId);

        Alert.alert('Payment Failed', paymentResult.message || 'Unable to process payment. Please try again.');
        return;
      }

      // Payment successful - update transaction
      await supabase
        .from('payment_transactions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          transaction_id: paymentResult.transactionId,
          provider_response: {
            status: 'success',
            message: paymentResult.message,
            provider_reference: paymentResult.providerReference,
            timestamp: new Date().toISOString(),
          },
        })
        .eq('id', transactionId);

      // Activate user subscription
      const subscriptionResult = await activateSubscription(
        user.id,
        planName.toLowerCase(),
        transactionId
      );

      if (!subscriptionResult.success) {
        console.error('Subscription activation failed:', subscriptionResult.message);
        Alert.alert(
          'Payment Successful',
          'Payment completed but subscription activation failed. Please contact support.',
          [{ text: 'OK', onPress: () => onClose() }]
        );
        return;
      }

      Alert.alert(
        'Payment Successful',
        `Your ${planName} subscription has been activated!\n\nReference: ${paymentReference}\n\nYou now have access to the dashboard.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setPhoneNumber('');
              setSelectedMethod(null);
              onPaymentSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Payment error:', error);

      // Update transaction to failed if it was created
      if (transactionId) {
        await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            failure_reason: error.message || 'Unknown error',
            provider_response: {
              status: 'error',
              message: error.message || 'Unknown error',
              timestamp: new Date().toISOString(),
            },
          })
          .eq('id', transactionId);
      }

      Alert.alert('Payment Failed', 'Unable to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setPhoneNumber('');
    setSelectedMethod(null);
    onClose();
  };

  const formatPhoneNumber = (text: string) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    // Limit to 9 digits
    return cleaned.substring(0, 9);
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
                <Text style={styles.title}>Complete Payment</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={scale(24)} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Plan Info */}
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{planName} Plan</Text>
                <Text style={styles.price}>{price.toLocaleString('fr-FR')} XAF/month</Text>
              </View>

              {/* Phone Number Input */}
              <View style={styles.section}>
                <Text style={styles.label}>Mobile Money Number *</Text>
                <View style={[
                  styles.inputContainer,
                  selectedMethod === 'mtn' && styles.inputContainerMTN,
                  selectedMethod === 'orange' && styles.inputContainerOrange,
                ]}>
                  <Text style={styles.countryCode}>+237</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="6XXXXXXXX"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                    maxLength={9}
                  />
                  {selectedMethod && (
                    <View style={[
                      styles.detectedBadge,
                      selectedMethod === 'mtn' && styles.detectedBadgeMTN,
                      selectedMethod === 'orange' && styles.detectedBadgeOrange,
                    ]}>
                      <Text style={styles.detectedText}>
                        {selectedMethod === 'mtn' ? 'MTN MoMo' : 'Orange Money'}
                      </Text>
                    </View>
                  )}
                </View>
                {selectedMethod ? (
                  <View style={styles.detectedInfo}>
                    <Ionicons name="checkmark-circle" size={scale(16)} color="#10B981" />
                    <Text style={styles.detectedInfoText}>
                      {selectedMethod === 'mtn' ? 'MTN Mobile Money' : 'Orange Money'} detected
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.helperText}>
                    Enter your mobile money number (MTN or Orange)
                  </Text>
                )}
              </View>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={processing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.payButton,
                    processing && styles.payButtonDisabled,
                  ]}
                  onPress={handlePayment}
                  disabled={processing || !selectedMethod || phoneNumber.length < 9}
                >
                  {processing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.payButtonText}>Pay Now</Text>
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
    maxHeight: '85%',
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
  planInfo: {
    backgroundColor: '#F0FDF4',
    padding: spacing.base,
    borderRadius: scale(12),
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  planName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: spacing.xs,
  },
  price: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: '#1a1a1a',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: scale(12),
    paddingHorizontal: spacing.base,
    backgroundColor: '#fff',
  },
  inputContainerMTN: {
    borderColor: '#FFCC00',
    backgroundColor: '#FFFBF0',
  },
  inputContainerOrange: {
    borderColor: '#FF6600',
    backgroundColor: '#FFF5F0',
  },
  countryCode: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.base,
    fontSize: fontSize.base,
    color: '#1a1a1a',
  },
  detectedBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: scale(6),
  },
  detectedBadgeMTN: {
    backgroundColor: '#FFCC00',
  },
  detectedBadgeOrange: {
    backgroundColor: '#FF6600',
  },
  detectedText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: '#fff',
  },
  detectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  detectedInfoText: {
    fontSize: fontSize.sm,
    color: '#10B981',
    fontWeight: '600',
  },
  helperText: {
    fontSize: fontSize.sm,
    color: '#666',
    marginTop: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
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
  payButton: {
    flex: 1,
    paddingVertical: spacing.base,
    borderRadius: scale(12),
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#fff',
  },
});

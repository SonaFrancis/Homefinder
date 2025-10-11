/**
 * Payment Service
 * Handles MTN Mobile Money and Orange Money payment integration
 */

import { supabase } from '@/lib/supabase';

export type PaymentMethod = 'mtn' | 'orange';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface PaymentRequest {
  userId: string;
  phoneNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  planType: string;
  transactionId: string;
}

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  providerReference?: string;
  message: string;
  error?: string;
}

/**
 * Main payment processing function
 * Calls Supabase Edge Function to securely process payment
 */
export async function processPayment(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'No active session',
      };
    }

    // Call Supabase Edge Function to process payment securely
    const { data, error } = await supabase.functions.invoke('process-payment', {
      body: {
        transactionId: request.transactionId,
        phoneNumber: request.phoneNumber,
        amount: request.amount,
        paymentMethod: request.paymentMethod,
        planType: request.planType,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      return {
        success: false,
        message: 'Payment processing failed',
        error: error.message || 'Unknown error',
      };
    }

    if (data && typeof data === 'object') {
      return data as PaymentResponse;
    }

    return {
      success: false,
      message: 'Invalid response from payment service',
    };
  } catch (error: any) {
    console.error('Payment error:', error);
    return {
      success: false,
      message: 'Unable to process payment',
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Activate subscription after successful payment
 */
export async function activateSubscription(
  userId: string,
  planType: string,
  transactionId: string
): Promise<{ success: boolean; message: string; subscriptionId?: string }> {
  try {
    const { data, error } = await supabase.rpc('activate_user_subscription', {
      p_user_id: userId,
      p_plan_type: planType,
      p_payment_transaction_id: transactionId,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: result.success,
        message: result.message,
        subscriptionId: result.subscription_id,
      };
    }

    return {
      success: false,
      message: 'Failed to activate subscription',
    };
  } catch (error: any) {
    console.error('Subscription activation error:', error);
    return {
      success: false,
      message: error.message || 'Failed to activate subscription',
    };
  }
}

/**
 * Upgrade subscription to a new plan
 */
export async function upgradeSubscription(
  userId: string,
  newPlanType: string,
  transactionId: string
): Promise<{ success: boolean; message: string; subscriptionId?: string }> {
  try {
    const { data, error } = await supabase.rpc('upgrade_user_subscription', {
      p_user_id: userId,
      p_new_plan_type: newPlanType,
      p_payment_transaction_id: transactionId,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: result.success,
        message: result.message,
        subscriptionId: result.subscription_id,
      };
    }

    return {
      success: false,
      message: 'Failed to upgrade subscription',
    };
  } catch (error: any) {
    console.error('Subscription upgrade error:', error);
    return {
      success: false,
      message: error.message || 'Failed to upgrade subscription',
    };
  }
}

/**
 * Get user's current subscription details
 */
export async function getUserSubscription(userId: string) {
  try {
    const { data, error } = await supabase.rpc('get_user_subscription', {
      p_user_id: userId,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        success: true,
        subscription: data[0],
      };
    }

    return {
      success: false,
      subscription: null,
    };
  } catch (error: any) {
    console.error('Get subscription error:', error);
    return {
      success: false,
      subscription: null,
      error: error.message,
    };
  }
}

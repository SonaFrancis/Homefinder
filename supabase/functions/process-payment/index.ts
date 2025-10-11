// Supabase Edge Function for Payment Processing
// Deploy this function using: supabase functions deploy process-payment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  transactionId: string;
  phoneNumber: string;
  amount: number;
  paymentMethod: 'mtn' | 'orange';
  planType: string;
}

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  providerReference?: string;
  message: string;
  error?: string;
}

/**
 * Process MTN Mobile Money Payment
 */
async function processMTNPayment(request: PaymentRequest): Promise<PaymentResponse> {
  const MTN_API_BASE = Deno.env.get('MTN_API_BASE') || 'https://proxy.momoapi.mtn.com';
  const MTN_SUBSCRIPTION_KEY = Deno.env.get('MTN_SUBSCRIPTION_KEY');
  const MTN_USER_ID = Deno.env.get('MTN_USER_ID');
  const MTN_API_KEY = Deno.env.get('MTN_API_KEY');
  const MTN_TARGET_ENVIRONMENT = Deno.env.get('MTN_TARGET_ENVIRONMENT') || 'sandbox';

  if (!MTN_SUBSCRIPTION_KEY || !MTN_USER_ID || !MTN_API_KEY) {
    console.error('MTN API credentials not configured');
    return {
      success: false,
      message: 'Payment service configuration error',
      error: 'MTN credentials missing',
    };
  }

  try {
    // Step 1: Get access token
    const tokenResponse = await fetch(`${MTN_API_BASE}/collection/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${MTN_USER_ID}:${MTN_API_KEY}`)}`,
        'Ocp-Apim-Subscription-Key': MTN_SUBSCRIPTION_KEY,
      },
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get MTN access token');
    }

    const { access_token } = await tokenResponse.json();

    // Step 2: Request payment
    const referenceId = crypto.randomUUID();
    const paymentResponse = await fetch(`${MTN_API_BASE}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': MTN_TARGET_ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': MTN_SUBSCRIPTION_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount.toString(),
        currency: 'XAF',
        externalId: request.transactionId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: request.phoneNumber.replace('+237', '').replace(/\D/g, ''),
        },
        payerMessage: `Payment for ${request.planType} subscription`,
        payeeNote: `Subscription payment - ${request.planType}`,
      }),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.text();
      console.error('MTN payment request failed:', errorData);
      throw new Error('Payment request failed');
    }

    // Step 3: Check payment status
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    const statusResponse = await fetch(
      `${MTN_API_BASE}/collection/v1_0/requesttopay/${referenceId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'X-Target-Environment': MTN_TARGET_ENVIRONMENT,
          'Ocp-Apim-Subscription-Key': MTN_SUBSCRIPTION_KEY,
        },
      }
    );

    if (!statusResponse.ok) {
      throw new Error('Failed to check payment status');
    }

    const statusData = await statusResponse.json();

    if (statusData.status === 'SUCCESSFUL') {
      return {
        success: true,
        transactionId: `MTN-${referenceId}`,
        providerReference: statusData.financialTransactionId || referenceId,
        message: 'Payment successful',
      };
    } else if (statusData.status === 'PENDING') {
      return {
        success: false,
        message: 'Payment is pending. Please try again in a moment.',
        error: 'PENDING',
      };
    } else {
      return {
        success: false,
        message: 'Payment failed',
        error: statusData.reason || 'FAILED',
      };
    }
  } catch (error: any) {
    console.error('MTN payment error:', error);
    return {
      success: false,
      message: 'Unable to process MTN payment',
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Process Orange Money Payment
 */
async function processOrangePayment(request: PaymentRequest): Promise<PaymentResponse> {
  const ORANGE_API_BASE = Deno.env.get('ORANGE_API_BASE') || 'https://api.orange.com';
  const ORANGE_CLIENT_ID = Deno.env.get('ORANGE_CLIENT_ID');
  const ORANGE_CLIENT_SECRET = Deno.env.get('ORANGE_CLIENT_SECRET');
  const ORANGE_MERCHANT_KEY = Deno.env.get('ORANGE_MERCHANT_KEY');

  if (!ORANGE_CLIENT_ID || !ORANGE_CLIENT_SECRET || !ORANGE_MERCHANT_KEY) {
    console.error('Orange API credentials not configured');
    return {
      success: false,
      message: 'Payment service configuration error',
      error: 'Orange credentials missing',
    };
  }

  try {
    // Step 1: Get access token
    const tokenResponse = await fetch(`${ORANGE_API_BASE}/oauth/v3/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${ORANGE_CLIENT_ID}:${ORANGE_CLIENT_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Orange access token');
    }

    const { access_token } = await tokenResponse.json();

    // Step 2: Initiate payment
    const paymentResponse = await fetch(
      `${ORANGE_API_BASE}/orange-money-webpay/cm/v1/webpayment`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchant_key: ORANGE_MERCHANT_KEY,
          currency: 'XAF',
          order_id: request.transactionId,
          amount: request.amount,
          return_url: 'your-app://payment/success',
          cancel_url: 'your-app://payment/cancel',
          notif_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
          lang: 'en',
          reference: `${request.planType}-subscription`,
        }),
      }
    );

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.text();
      console.error('Orange payment request failed:', errorData);
      throw new Error('Payment request failed');
    }

    const paymentData = await paymentResponse.json();

    if (paymentData.payment_url) {
      // For Orange Money, we need to redirect user to payment page
      // In mobile app context, you would open this URL in a webview
      return {
        success: true,
        transactionId: paymentData.pay_token,
        providerReference: paymentData.order_id,
        message: 'Payment initiated',
      };
    } else {
      return {
        success: false,
        message: 'Failed to initiate payment',
        error: 'No payment URL received',
      };
    }
  } catch (error: any) {
    console.error('Orange payment error:', error);
    return {
      success: false,
      message: 'Unable to process Orange payment',
      error: error.message || 'Unknown error',
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const paymentRequest: PaymentRequest = await req.json();

    // Validate request
    if (!paymentRequest.phoneNumber || !paymentRequest.amount || !paymentRequest.paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing payment:', {
      method: paymentRequest.paymentMethod,
      amount: paymentRequest.amount,
      transactionId: paymentRequest.transactionId,
    });

    // Process payment based on method
    let result: PaymentResponse;
    if (paymentRequest.paymentMethod === 'mtn') {
      result = await processMTNPayment(paymentRequest);
    } else if (paymentRequest.paymentMethod === 'orange') {
      result = await processOrangePayment(paymentRequest);
    } else {
      result = {
        success: false,
        message: 'Invalid payment method',
        error: 'INVALID_METHOD',
      };
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Payment processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

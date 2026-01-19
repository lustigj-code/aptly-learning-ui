/**
 * Billing Checkout API
 *
 * Creates Stripe checkout sessions for subscription purchases.
 *
 * POST /api/billing/checkout
 * - Requires authentication
 * - Creates checkout session and returns URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/apiAuth';
import {
  createCheckoutSession,
  isStripeConfigured,
  PRICING_PLANS,
} from '@/lib/payments/stripe';
import type { PlanTier } from '@/lib/payments/types';

/**
 * Request body schema
 */
interface CheckoutRequest {
  planTier: PlanTier;
  billingInterval: 'month' | 'year';
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * POST /api/billing/checkout
 * Create a Stripe checkout session
 */
export async function POST(request: NextRequest) {
  try {
    // Check Stripe configuration
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment system is not configured' },
        { status: 503 }
      );
    }

    // Verify authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CheckoutRequest = await request.json();
    const { planTier, billingInterval, successUrl, cancelUrl } = body;

    // Validate plan tier
    if (!planTier || !PRICING_PLANS[planTier]) {
      return NextResponse.json(
        { error: 'Invalid plan tier' },
        { status: 400 }
      );
    }

    // Free tier doesn't need checkout
    if (planTier === 'free') {
      return NextResponse.json(
        { error: 'Free tier does not require checkout' },
        { status: 400 }
      );
    }

    // Validate billing interval
    if (!billingInterval || !['month', 'year'].includes(billingInterval)) {
      return NextResponse.json(
        { error: 'Invalid billing interval. Must be "month" or "year"' },
        { status: 400 }
      );
    }

    // Get base URL for redirects
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      'http://localhost:3000';

    // Create checkout session
    const session = await createCheckoutSession({
      userId: user.uid,
      userEmail: user.email || '',
      planTier,
      billingInterval,
      successUrl: successUrl || `${baseUrl}/settings?checkout=success`,
      cancelUrl: cancelUrl || `${baseUrl}/settings?checkout=cancelled`,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (error) {
    console.error('[Billing Checkout] Error creating checkout session:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Price ID not configured')) {
        return NextResponse.json(
          { error: 'Pricing not configured for this plan' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

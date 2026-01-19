/**
 * Stripe Payment Integration
 *
 * Handles Stripe client initialization, checkout session creation,
 * and subscription management helpers.
 */

import Stripe from 'stripe';
import type {
  Plan,
  PlanTier,
  CreateCheckoutParams,
  CheckoutSessionResponse,
} from './types';

// ===========================================
// Stripe Client Initialization
// ===========================================

/**
 * Initialize Stripe client with graceful handling for missing env vars
 */
function createStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[Stripe] STRIPE_SECRET_KEY is not configured. Payment features will be unavailable.'
      );
    } else {
      console.warn(
        '[Stripe] STRIPE_SECRET_KEY not set. Payment features disabled in development.'
      );
    }
    return null;
  }

  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  });
}

/**
 * Stripe client instance (null if not configured)
 */
export const stripe = createStripeClient();

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return stripe !== null;
}

// ===========================================
// Pricing Plans
// ===========================================

/**
 * Pricing tier constants
 * Note: Stripe Price IDs should be set in environment variables in production
 */
export const PRICING_PLANS: Record<PlanTier, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic learning features',
    priceMonthly: 0,
    priceAnnual: 0,
    stripePriceIdMonthly: null,
    stripePriceIdAnnual: null,
    features: [
      'Access to free courses',
      'Basic progress tracking',
      'Community support',
      'Mobile app access',
    ],
    maxTeamMembers: null,
    includesAICoach: false,
    includesAdvancedAnalytics: false,
    includesPrioritySupport: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Accelerate your learning with AI coaching',
    priceMonthly: 4900, // $49.00
    priceAnnual: 47000, // $470.00 (save 2 months)
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || null,
    stripePriceIdAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || null,
    features: [
      'Everything in Free',
      'Unlimited course access',
      'AI-powered Sage coach',
      'Personalized learning paths',
      'Advanced mastery analytics',
      'Priority email support',
      'Certification preparation',
    ],
    maxTeamMembers: null,
    includesAICoach: true,
    includesAdvancedAnalytics: true,
    includesPrioritySupport: true,
  },
  teams: {
    id: 'teams',
    name: 'Teams',
    description: 'Train your team with collaborative learning',
    priceMonthly: 14900, // $149.00
    priceAnnual: 143000, // $1,430.00 (save 2 months)
    stripePriceIdMonthly: process.env.STRIPE_TEAMS_MONTHLY_PRICE_ID || null,
    stripePriceIdAnnual: process.env.STRIPE_TEAMS_ANNUAL_PRICE_ID || null,
    features: [
      'Everything in Pro',
      'Up to 25 team members',
      'Team progress dashboard',
      'Admin management console',
      'Custom learning paths',
      'SSO integration',
      'Dedicated success manager',
      'API access',
    ],
    maxTeamMembers: 25,
    includesAICoach: true,
    includesAdvancedAnalytics: true,
    includesPrioritySupport: true,
  },
};

/**
 * Get plan details by tier
 */
export function getPlan(tier: PlanTier): Plan {
  return PRICING_PLANS[tier];
}

/**
 * Get the Stripe Price ID for a plan
 */
export function getStripePriceId(
  tier: PlanTier,
  interval: 'month' | 'year'
): string | null {
  const plan = PRICING_PLANS[tier];
  return interval === 'month'
    ? plan.stripePriceIdMonthly
    : plan.stripePriceIdAnnual;
}

/**
 * Format price for display
 */
export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceInCents / 100);
}

// ===========================================
// Checkout Session Helpers
// ===========================================

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<CheckoutSessionResponse> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const { userId, userEmail, planTier, billingInterval, successUrl, cancelUrl } =
    params;

  // Free tier doesn't need checkout
  if (planTier === 'free') {
    throw new Error('Free tier does not require checkout');
  }

  const priceId = getStripePriceId(planTier, billingInterval);
  if (!priceId) {
    throw new Error(
      `Stripe Price ID not configured for ${planTier} ${billingInterval}`
    );
  }

  // Check if customer already exists
  let customerId: string | undefined;
  const existingCustomers = await stripe.customers.list({
    email: userEmail,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    customerId = existingCustomers.data[0].id;
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: customerId,
    customer_email: customerId ? undefined : userEmail,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      planTier,
      billingInterval,
    },
    subscription_data: {
      metadata: {
        userId,
        planTier,
      },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session URL');
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Retrieve a checkout session by ID
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error('[Stripe] Failed to retrieve checkout session:', error);
    return null;
  }
}

// ===========================================
// Subscription Management Helpers
// ===========================================

/**
 * Get a subscription by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('[Stripe] Failed to retrieve subscription:', error);
    return null;
  }
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (error) {
    console.error('[Stripe] Failed to cancel subscription:', error);
    return null;
  }
}

/**
 * Resume a cancelled subscription (before period end)
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  } catch (error) {
    console.error('[Stripe] Failed to resume subscription:', error);
    return null;
  }
}

/**
 * Create a billing portal session for customer self-service
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  } catch (error) {
    console.error('[Stripe] Failed to create billing portal session:', error);
    return null;
  }
}

// ===========================================
// Webhook Helpers
// ===========================================

/**
 * Verify and construct a Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('[Stripe] Webhook signature verification failed:', error);
    return null;
  }
}

// ===========================================
// Customer Helpers
// ===========================================

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      // Update metadata if needed
      if (customer.metadata?.userId !== userId) {
        return await stripe.customers.update(customer.id, {
          metadata: { userId },
        });
      }
      return customer;
    }

    // Create new customer
    return await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });
  } catch (error) {
    console.error('[Stripe] Failed to get or create customer:', error);
    return null;
  }
}

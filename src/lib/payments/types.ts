/**
 * Stripe Payment Types
 *
 * Type definitions for subscriptions, plans, billing accounts, and payment methods.
 */

/**
 * Subscription plan tiers
 */
export type PlanTier = 'free' | 'pro' | 'teams';

/**
 * Subscription status matching Stripe's subscription statuses
 */
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid';

/**
 * Payment method types
 */
export type PaymentMethodType = 'card' | 'bank_account' | 'link';

/**
 * Pricing plan definition
 */
export interface Plan {
  /** Unique plan identifier */
  id: PlanTier;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Monthly price in cents (0 for free) */
  priceMonthly: number;
  /** Annual price in cents (0 for free) */
  priceAnnual: number;
  /** Stripe Price ID for monthly billing (null for free) */
  stripePriceIdMonthly: string | null;
  /** Stripe Price ID for annual billing (null for free) */
  stripePriceIdAnnual: string | null;
  /** Features included in this plan */
  features: string[];
  /** Maximum team members (null for unlimited) */
  maxTeamMembers: number | null;
  /** Whether AI coaching is included */
  includesAICoach: boolean;
  /** Whether advanced analytics are included */
  includesAdvancedAnalytics: boolean;
  /** Whether priority support is included */
  includesPrioritySupport: boolean;
}

/**
 * User subscription record
 */
export interface Subscription {
  /** Firestore document ID */
  id: string;
  /** User ID (Firebase Auth UID) */
  userId: string;
  /** Stripe subscription ID */
  stripeSubscriptionId: string;
  /** Stripe customer ID */
  stripeCustomerId: string;
  /** Current plan tier */
  planTier: PlanTier;
  /** Subscription status */
  status: SubscriptionStatus;
  /** Billing interval */
  billingInterval: 'month' | 'year';
  /** Current period start date */
  currentPeriodStart: Date;
  /** Current period end date */
  currentPeriodEnd: Date;
  /** Whether subscription will cancel at period end */
  cancelAtPeriodEnd: boolean;
  /** Trial end date (if applicable) */
  trialEnd: Date | null;
  /** Timestamp when subscription was created */
  createdAt: Date;
  /** Timestamp when subscription was last updated */
  updatedAt: Date;
}

/**
 * Billing account for organizations/teams
 */
export interface BillingAccount {
  /** Firestore document ID */
  id: string;
  /** Organization/team name */
  name: string;
  /** Owner user ID (Firebase Auth UID) */
  ownerId: string;
  /** Stripe customer ID */
  stripeCustomerId: string;
  /** Billing email address */
  billingEmail: string;
  /** Team member user IDs */
  memberIds: string[];
  /** Current subscription (if any) */
  subscriptionId: string | null;
  /** Billing address */
  address: BillingAddress | null;
  /** Tax ID (VAT, etc.) */
  taxId: string | null;
  /** Timestamp when account was created */
  createdAt: Date;
  /** Timestamp when account was last updated */
  updatedAt: Date;
}

/**
 * Billing address
 */
export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

/**
 * Stored payment method
 */
export interface PaymentMethod {
  /** Stripe payment method ID */
  id: string;
  /** Payment method type */
  type: PaymentMethodType;
  /** Whether this is the default payment method */
  isDefault: boolean;
  /** Card details (if type is 'card') */
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  /** Bank account details (if type is 'bank_account') */
  bankAccount?: {
    bankName: string;
    last4: string;
  };
  /** Timestamp when payment method was created */
  createdAt: Date;
}

/**
 * Checkout session creation params
 */
export interface CreateCheckoutParams {
  /** User ID initiating checkout */
  userId: string;
  /** User email for Stripe customer */
  userEmail: string;
  /** Plan to subscribe to */
  planTier: PlanTier;
  /** Billing interval */
  billingInterval: 'month' | 'year';
  /** Success redirect URL */
  successUrl: string;
  /** Cancel redirect URL */
  cancelUrl: string;
}

/**
 * Checkout session response
 */
export interface CheckoutSessionResponse {
  /** Stripe checkout session ID */
  sessionId: string;
  /** Checkout URL to redirect user to */
  url: string;
}

/**
 * Webhook event types we handle
 */
export type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed';

/**
 * Webhook event payload
 */
export interface StripeWebhookEvent {
  id: string;
  type: StripeWebhookEventType;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

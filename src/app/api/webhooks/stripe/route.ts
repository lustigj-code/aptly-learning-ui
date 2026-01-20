/**
 * Stripe Webhook Handler
 *
 * Handles webhook events from Stripe for subscription lifecycle events.
 * This endpoint does not require authentication - Stripe signs webhooks.
 *
 * POST /api/webhooks/stripe
 *
 * Handled events:
 * - checkout.session.completed: User completed checkout
 * - customer.subscription.created: New subscription created
 * - customer.subscription.updated: Subscription modified (upgrade/downgrade/cancel)
 * - customer.subscription.deleted: Subscription ended
 * - invoice.paid: Payment succeeded
 * - invoice.payment_failed: Payment failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, isStripeConfigured } from '@/lib/payments/stripe';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type Stripe from 'stripe';
import type { PlanTier, SubscriptionStatus } from '@/lib/payments/types';

/**
 * Disable body parsing - we need raw body for signature verification
 */
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  // Check Stripe configuration
  if (!isStripeConfigured()) {
    console.error('[Stripe Webhook] Stripe is not configured');
    return NextResponse.json(
      { error: 'Webhook handler not configured' },
      { status: 503 }
    );
  }

  // Get the raw body for signature verification
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('[Stripe Webhook] Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  // Verify and construct the event
  let event: Stripe.Event | null;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (error) {
    console.error('[Stripe Webhook] Signature verification failed:', error);
    return NextResponse.json(
      { error: 'Signature verification failed' },
      { status: 400 }
    );
  }

  if (!event) {
    return NextResponse.json(
      { error: 'Invalid webhook event' },
      { status: 400 }
    );
  }

  // Log the event for debugging
  console.log(`[Stripe Webhook] Received event: ${event.type}`, {
    eventId: event.id,
    eventType: event.type,
    created: new Date(event.created * 1000).toISOString(),
  });

  try {
    // Handle the event based on type
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, error);
    // Return 200 to acknowledge receipt even if processing fails
    // This prevents Stripe from retrying - we log the error for investigation
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}

// ===========================================
// Event Handlers
// ===========================================

/**
 * Handle checkout.session.completed
 * User successfully completed the checkout flow
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId;
  const planTier = (session.metadata?.planTier || 'pro') as PlanTier;
  const billingInterval = (session.metadata?.billingInterval || 'month') as 'month' | 'year';
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  console.log('[Stripe Webhook] Checkout completed', {
    sessionId: session.id,
    userId,
    planTier,
    customerId,
    subscriptionId,
  });

  if (!userId) {
    console.error('[Stripe Webhook] No userId in checkout session metadata');
    return;
  }

  // Create subscription record in Firestore
  await adminDb.collection('subscriptions').doc(userId).set({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    planTier,
    billingInterval,
    status: 'active' as SubscriptionStatus,
    cancelAtPeriodEnd: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update user document with subscription info
  await adminDb.collection('users').doc(userId).update({
    'subscription.status': 'active',
    'subscription.planTier': planTier,
    'subscription.stripeCustomerId': customerId,
    'subscription.updatedAt': FieldValue.serverTimestamp(),
  });

  console.log(`[Stripe Webhook] Created subscription for user ${userId}`);
}

/**
 * Handle customer.subscription.created
 * New subscription was created
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;

  console.log('[Stripe Webhook] Subscription created', {
    subscriptionId: subscription.id,
    userId,
    planTier: subscription.metadata?.planTier,
    status: subscription.status,
    currentPeriodEnd: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
  });

  // Note: Primary subscription creation is handled by checkout.session.completed.
  // This handler ensures subscription period dates are captured.
  if (!userId) {
    console.warn('[Stripe Webhook] No userId in subscription metadata - skipping');
    return;
  }

  // Update subscription with period dates from Stripe
  await adminDb.collection('subscriptions').doc(userId).set({
    stripeSubscriptionId: subscription.id,
    status: subscription.status as SubscriptionStatus,
    currentPeriodStart: Timestamp.fromMillis(subscription.current_period_start * 1000),
    currentPeriodEnd: Timestamp.fromMillis(subscription.current_period_end * 1000),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`[Stripe Webhook] Updated subscription periods for user ${userId}`);
}

/**
 * Handle customer.subscription.updated
 * Subscription was modified (upgrade, downgrade, or cancel scheduled)
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;
  const planTier = subscription.metadata?.planTier as PlanTier | undefined;

  console.log('[Stripe Webhook] Subscription updated', {
    subscriptionId: subscription.id,
    userId,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
  });

  if (!userId) {
    console.warn('[Stripe Webhook] No userId in subscription metadata - attempting customer lookup');
    // Try to find user by stripeCustomerId
    const customerId = subscription.customer as string;
    const snapshot = await adminDb
      .collection('subscriptions')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.error('[Stripe Webhook] Could not find subscription by customer ID');
      return;
    }

    const subscriptionDoc = snapshot.docs[0];
    await updateSubscriptionRecord(subscriptionDoc.id, subscription, planTier);
    return;
  }

  await updateSubscriptionRecord(userId, subscription, planTier);
}

/**
 * Helper to update subscription record in Firestore
 */
async function updateSubscriptionRecord(
  userId: string,
  subscription: Stripe.Subscription,
  planTier?: PlanTier
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status: subscription.status as SubscriptionStatus,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodStart: Timestamp.fromMillis(subscription.current_period_start * 1000),
    currentPeriodEnd: Timestamp.fromMillis(subscription.current_period_end * 1000),
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Only update planTier if provided in metadata
  if (planTier) {
    updateData.planTier = planTier;
  }

  // Update subscription record
  await adminDb.collection('subscriptions').doc(userId).update(updateData);

  // Also update user document
  const userUpdateData: Record<string, unknown> = {
    'subscription.status': subscription.status,
    'subscription.updatedAt': FieldValue.serverTimestamp(),
  };

  if (planTier) {
    userUpdateData['subscription.planTier'] = planTier;
  }

  await adminDb.collection('users').doc(userId).update(userUpdateData);

  console.log(`[Stripe Webhook] Updated subscription for user ${userId}`);
}

/**
 * Handle customer.subscription.deleted
 * Subscription was cancelled and period ended
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;

  console.log('[Stripe Webhook] Subscription deleted', {
    subscriptionId: subscription.id,
    userId,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  });

  // Find user ID if not in metadata
  let targetUserId = userId;
  if (!targetUserId) {
    const customerId = subscription.customer as string;
    const snapshot = await adminDb
      .collection('subscriptions')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.error('[Stripe Webhook] Could not find subscription to delete');
      return;
    }

    targetUserId = snapshot.docs[0].id;
  }

  // Update subscription to cancelled/free tier
  await adminDb.collection('subscriptions').doc(targetUserId).update({
    status: 'canceled' as SubscriptionStatus,
    planTier: 'free' as PlanTier,
    canceledAt: subscription.canceled_at
      ? Timestamp.fromMillis(subscription.canceled_at * 1000)
      : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update user document to free tier
  await adminDb.collection('users').doc(targetUserId).update({
    'subscription.status': 'canceled',
    'subscription.planTier': 'free',
    'subscription.updatedAt': FieldValue.serverTimestamp(),
  });

  console.log(`[Stripe Webhook] Cancelled subscription for user ${targetUserId}`);
}

/**
 * Handle invoice.paid
 * Payment was successful
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;
  const amountPaid = invoice.amount_paid;

  console.log('[Stripe Webhook] Invoice paid', {
    invoiceId: invoice.id,
    customerId,
    subscriptionId,
    amountPaid,
    currency: invoice.currency,
  });

  // Find the user by customer ID
  const snapshot = await adminDb
    .collection('subscriptions')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  const userId = snapshot.empty ? null : snapshot.docs[0].id;

  // Record payment in Firestore for billing history
  await adminDb.collection('payments').add({
    userId,
    stripeInvoiceId: invoice.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    amount: amountPaid,
    currency: invoice.currency,
    status: 'paid',
    invoiceUrl: invoice.hosted_invoice_url || null,
    pdfUrl: invoice.invoice_pdf || null,
    paidAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });

  // If subscription was past_due, update it back to active
  if (userId) {
    const subscriptionDoc = await adminDb.collection('subscriptions').doc(userId).get();
    const subscriptionData = subscriptionDoc.data();

    if (subscriptionData?.status === 'past_due') {
      await adminDb.collection('subscriptions').doc(userId).update({
        status: 'active' as SubscriptionStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await adminDb.collection('users').doc(userId).update({
        'subscription.status': 'active',
        'subscription.updatedAt': FieldValue.serverTimestamp(),
      });

      console.log(`[Stripe Webhook] Restored subscription to active for user ${userId}`);
    }
  }

  console.log(`[Stripe Webhook] Recorded payment ${invoice.id}`);
}

/**
 * Handle invoice.payment_failed
 * Payment attempt failed
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  console.log('[Stripe Webhook] Invoice payment failed', {
    invoiceId: invoice.id,
    customerId,
    subscriptionId,
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toISOString()
      : null,
  });

  // Find the user by customer ID
  const snapshot = await adminDb
    .collection('subscriptions')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.error('[Stripe Webhook] Could not find subscription for failed payment');
    return;
  }

  const userId = snapshot.docs[0].id;

  // Update subscription status to past_due
  await adminDb.collection('subscriptions').doc(userId).update({
    status: 'past_due' as SubscriptionStatus,
    lastPaymentError: {
      invoiceId: invoice.id,
      attemptCount: invoice.attempt_count,
      nextPaymentAttempt: invoice.next_payment_attempt
        ? Timestamp.fromMillis(invoice.next_payment_attempt * 1000)
        : null,
      failedAt: FieldValue.serverTimestamp(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update user document
  await adminDb.collection('users').doc(userId).update({
    'subscription.status': 'past_due',
    'subscription.updatedAt': FieldValue.serverTimestamp(),
  });

  // Record failed payment attempt in payments collection
  await adminDb.collection('payments').add({
    userId,
    stripeInvoiceId: invoice.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    amount: invoice.amount_due,
    currency: invoice.currency,
    status: 'failed',
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt
      ? Timestamp.fromMillis(invoice.next_payment_attempt * 1000)
      : null,
    failedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`[Stripe Webhook] Updated subscription to past_due for user ${userId}`);
}

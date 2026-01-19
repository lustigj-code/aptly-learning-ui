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
import type Stripe from 'stripe';

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
  const planTier = session.metadata?.planTier;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  console.log('[Stripe Webhook] Checkout completed', {
    sessionId: session.id,
    userId,
    planTier,
    customerId,
    subscriptionId,
  });

  // TODO: Update user's subscription in Firestore
  // await adminDb.collection('subscriptions').doc(userId).set({
  //   stripeCustomerId: customerId,
  //   stripeSubscriptionId: subscriptionId,
  //   planTier,
  //   status: 'active',
  //   createdAt: serverTimestamp(),
  //   updatedAt: serverTimestamp(),
  // });

  // TODO: Send welcome email
  // await sendSubscriptionWelcomeEmail(userId, planTier);
}

/**
 * Handle customer.subscription.created
 * New subscription was created
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;
  const planTier = subscription.metadata?.planTier;

  console.log('[Stripe Webhook] Subscription created', {
    subscriptionId: subscription.id,
    userId,
    planTier,
    status: subscription.status,
    currentPeriodEnd: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
  });

  // TODO: Create subscription record in Firestore
  // This is typically handled by checkout.session.completed
}

/**
 * Handle customer.subscription.updated
 * Subscription was modified (upgrade, downgrade, or cancel scheduled)
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata?.userId;

  console.log('[Stripe Webhook] Subscription updated', {
    subscriptionId: subscription.id,
    userId,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
  });

  // TODO: Update subscription record in Firestore
  // await adminDb.collection('subscriptions').doc(userId).update({
  //   status: subscription.status,
  //   cancelAtPeriodEnd: subscription.cancel_at_period_end,
  //   currentPeriodEnd: Timestamp.fromMillis(subscription.current_period_end * 1000),
  //   updatedAt: serverTimestamp(),
  // });
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

  // TODO: Update user to free tier in Firestore
  // await adminDb.collection('subscriptions').doc(userId).update({
  //   status: 'canceled',
  //   planTier: 'free',
  //   updatedAt: serverTimestamp(),
  // });

  // TODO: Send cancellation email
  // await sendSubscriptionCancelledEmail(userId);
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

  // TODO: Record payment in Firestore for billing history
  // await adminDb.collection('payments').add({
  //   stripeInvoiceId: invoice.id,
  //   stripeCustomerId: customerId,
  //   stripeSubscriptionId: subscriptionId,
  //   amount: amountPaid,
  //   currency: invoice.currency,
  //   status: 'paid',
  //   paidAt: serverTimestamp(),
  // });
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

  // TODO: Update subscription status and notify user
  // await adminDb.collection('subscriptions').doc(userId).update({
  //   status: 'past_due',
  //   updatedAt: serverTimestamp(),
  // });

  // TODO: Send payment failed email
  // await sendPaymentFailedEmail(userId, {
  //   attemptCount: invoice.attempt_count,
  //   nextAttempt: invoice.next_payment_attempt,
  // });
}

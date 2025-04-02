import Stripe from 'stripe';
import { log } from './vite';

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil' // Use the latest API version
});

// Credit package configuration
export const CREDIT_PACKAGES = {
  STARTER: {
    credits: 50,
    priceId: process.env.STRIPE_PRICE_ID_STARTER,
    amount: 499 // in cents
  },
  PRO: {
    credits: 200,
    priceId: process.env.STRIPE_PRICE_ID_PRO,
    amount: 1499 // in cents
  }
};

/**
 * Create a Stripe checkout session for purchasing credits
 */
export async function createCheckoutSession(
  userId: string,
  firebaseUid: string,
  packageType: keyof typeof CREDIT_PACKAGES,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const packageDetails = CREDIT_PACKAGES[packageType];
  
  if (!packageDetails || !packageDetails.priceId) {
    throw new Error(`Invalid package type or price ID not configured: ${packageType}`);
  }
  
  try {
    log(`Creating Stripe checkout session for user ${userId}, package ${packageType}`, 'stripe');
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: packageDetails.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription', // Changed from 'payment' to 'subscription' for recurring prices
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId,
        firebaseUid,
        packageType,
        credits: packageDetails.credits.toString()
      },
      subscription_data: {
        metadata: {
          userId,
          firebaseUid,
          packageType,
          credits: packageDetails.credits.toString()
        }
      }
    });
    
    log(`Stripe checkout session created: ${session.id}`, 'stripe');
    return session.url || '';
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error creating Stripe checkout session: ${errorMessage}`, 'stripe');
    throw error;
  }
}

/**
 * Verify a completed checkout session and add credits
 */
export async function verifyCheckoutSession(sessionId: string): Promise<{
  userId: string;
  firebaseUid: string;
  packageType: string;
  credits: number;
  success: boolean;
}> {
  try {
    log(`Verifying Stripe checkout session: ${sessionId}`, 'stripe');
    
    // For subscription checkout sessions, we need to expand the subscription
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });
    
    // For subscriptions, payment_status may not be 'paid' right away,
    // but we can check if the subscription is active
    const subscription = session.subscription as Stripe.Subscription;
    
    if (!subscription || subscription.status !== 'active') {
      log(`Session ${sessionId} subscription status is not active`, 'stripe');
      throw new Error('Subscription not active');
    }
    
    const userId = session.metadata?.userId || '';
    const firebaseUid = session.metadata?.firebaseUid || '';
    const packageType = session.metadata?.packageType || '';
    const credits = parseInt(session.metadata?.credits || '0', 10);
    
    if (!userId || !packageType || credits <= 0) {
      log(`Invalid session metadata: userId=${userId}, packageType=${packageType}, credits=${credits}`, 'stripe');
      throw new Error('Invalid session metadata');
    }
    
    log(`Session ${sessionId} verified successfully for user ${userId}`, 'stripe');
    
    return {
      userId,
      firebaseUid,
      packageType,
      credits,
      success: true
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error verifying Stripe checkout session: ${errorMessage}`, 'stripe');
    throw error;
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  signature: string,
  rawBody: Buffer,
  onSuccess: (data: { userId: string; firebaseUid: string; credits: number; packageType: string }) => Promise<void>
): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    log('Stripe webhook secret not configured', 'stripe');
    throw new Error('Stripe webhook secret not configured');
  }
  
  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
    
    log(`Received Stripe webhook event: ${event.type}`, 'stripe');
    
    // Handle checkout session completed - initial subscription creation
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.userId || '';
      const firebaseUid = session.metadata?.firebaseUid || '';
      const packageType = session.metadata?.packageType || '';
      const credits = parseInt(session.metadata?.credits || '0', 10);
      
      if (userId && packageType && credits > 0) {
        log(`Processing successful checkout for user ${userId}, credits: ${credits}`, 'stripe');
        
        // If using subscriptions, payment may be processed separately
        if (session.mode === 'subscription') {
          // We'll add credits when the invoice is paid
          log(`Subscription created, waiting for invoice.paid event for ${session.subscription}`, 'stripe');
        } else if (session.payment_status === 'paid') {
          // For one-time payments, add credits immediately
          await onSuccess({
            userId,
            firebaseUid,
            credits,
            packageType
          });
        }
      }
    }
    
    // Handle successful subscription payment
    else if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      
      if (invoice.subscription) {
        try {
          // Get the subscription to fetch the client_reference_id and metadata
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          if (subscription.metadata) {
            const userId = subscription.metadata.userId || '';
            const firebaseUid = subscription.metadata.firebaseUid || '';
            const packageType = subscription.metadata.packageType || '';
            const credits = parseInt(subscription.metadata.credits || '0', 10);
            
            if (userId && packageType && credits > 0) {
              log(`Processing subscription payment for user ${userId}, credits: ${credits}`, 'stripe');
              
              await onSuccess({
                userId,
                firebaseUid,
                credits,
                packageType
              });
            }
          }
        } catch (error) {
          log(`Error retrieving subscription for invoice ${invoice.id}: ${error}`, 'stripe');
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error handling Stripe webhook: ${errorMessage}`, 'stripe');
    throw error;
  }
}
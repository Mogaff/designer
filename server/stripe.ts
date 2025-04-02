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
      mode: 'subscription', // Geändert von 'payment' zu 'subscription' für monatliche Abonnements
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId,
        firebaseUid,
        packageType,
        credits: packageDetails.credits.toString()
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
    
    // Bei Abonnements müssen wir die vollständige Sitzung mit dem Abonnement abrufen
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });
    
    // Bei Abonnements ist der payment_status möglicherweise nicht sofort 'paid', 
    // aber die Sitzung kann trotzdem erfolgreich sein
    if (session.status !== 'complete') {
      log(`Session ${sessionId} status is ${session.status}, not complete`, 'stripe');
      throw new Error('Checkout session not completed');
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
    
    // Beide Event-Typen behandeln: session.completed und invoice.paid
    if (event.type === 'checkout.session.completed' || 
        event.type === 'invoice.paid') {
      
      let userId = '';
      let firebaseUid = '';
      let packageType = '';
      let credits = 0;
      
      // Unterschiedliche Verarbeitung je nach Event-Typ
      if (event.type === 'checkout.session.completed') {
        // Für Checkout-Sessions
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Bei Abonnements überprüfen wir den session.status statt payment_status
        if (session.status === 'complete') {
          userId = session.metadata?.userId || '';
          firebaseUid = session.metadata?.firebaseUid || '';
          packageType = session.metadata?.packageType || '';
          credits = parseInt(session.metadata?.credits || '0', 10);
        }
      } else if (event.type === 'invoice.paid') {
        // Für Abonnements - Rechnung bezahlt (wiederkehrend)
        const invoice = event.data.object as Stripe.Invoice;
        
        // Die Metadata ist an der Subscription, nicht an der Rechnung
        if (invoice.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              invoice.subscription as string
            );
            
            // Metadaten aus der ursprünglichen Checkout-Session abrufen
            const sessions = await stripe.checkout.sessions.list({
              subscription: subscription.id,
              limit: 1,
            });
            
            if (sessions.data.length > 0) {
              const session = sessions.data[0];
              userId = session.metadata?.userId || '';
              firebaseUid = session.metadata?.firebaseUid || '';
              packageType = session.metadata?.packageType || '';
              credits = parseInt(session.metadata?.credits || '0', 10);
            }
          } catch (error) {
            log(`Error retrieving subscription data: ${error}`, 'stripe');
          }
        }
      }
      
      // Wenn alle Metadaten vorhanden sind, die Zahlung verarbeiten
      if (userId && packageType && credits > 0) {
        log(`Processing successful payment for user ${userId}, credits: ${credits}`, 'stripe');
        
        await onSuccess({
          userId,
          firebaseUid,
          credits,
          packageType
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error handling Stripe webhook: ${errorMessage}`, 'stripe');
    throw error;
  }
}
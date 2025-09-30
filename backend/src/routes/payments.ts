import express from 'express';
import Stripe from 'stripe';

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY is not configured in backend .env');
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-08-27.basil',
});

router.post('/stripe/create-checkout-session', async (req, res) => {
  try {
    const { eventId, seatId, quantity, eventTitle, price } = req.body;

    if (!eventId || !seatId || !quantity || !eventTitle || !price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'eventId, seatId, quantity, eventTitle, and price are required',
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Ticket: ${eventTitle}`,
              description: `Event ID: ${eventId}, Seat ID: ${seatId}`,
              metadata: { eventId, seatId },
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://10.0.2.2:8081'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://10.0.2.2:8081'}/payment-cancelled`,
      metadata: { eventId, seatId, quantity: quantity.toString() },
    });

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      amount: session.amount_total ? session.amount_total / 100 : price * quantity,
      currency: session.currency || 'usd',
      status: session.status,
    });
  } catch (error) {
    console.error('❌ Stripe checkout session creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Checkout session creation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/stripe/session/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await stripe.checkout.sessions.retrieve(id);

    res.json({
      success: true,
      sessionId: session.id,
      status: session.status,
      amount: session.amount_total ? session.amount_total / 100 : null,
      currency: session.currency,
      paymentStatus: session.payment_status,
      metadata: session.metadata,
    });
  } catch (error) {
    console.error('❌ Failed to retrieve checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve checkout session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).json({
      success: false,
      error: 'Webhook secret not configured',
    });
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('✅ Payment completed:', {
        sessionId: session.id,
        eventId: session.metadata?.eventId,
        seatId: session.metadata?.seatId,
        quantity: session.metadata?.quantity,
        amount: session.amount_total ? session.amount_total / 100 : 'unknown',
      });
      // TODO: Update reservation status in database or notify SeatGeek (requires private API)
      // Example: Update a reservation record or send a notification to the frontend
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('⚠️ Payment session expired:', {
        sessionId: session.id,
        eventId: session.metadata?.eventId,
        seatId: session.metadata?.seatId,
      });
      // TODO: Handle session expiration (e.g., mark reservation as cancelled)
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(400).json({
      success: false,
      error: 'Webhook error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/stripe/create-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', eventId, seatId } = req.body;

    if (!amount || !eventId || !seatId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'amount, eventId, seatId are required',
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: { eventId, seatId },
      description: `Ticket for event ${eventId}, seat ${seatId}`,
    });

    res.json({
      success: true,
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error('❌ Stripe payment intent creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Payment intent creation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/stripe/intent/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const paymentIntent = await stripe.paymentIntents.retrieve(id);

    res.json({
      success: true,
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error('❌ Failed to retrieve payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment intent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
import { Router } from 'express'
import Stripe from 'stripe'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ─── Stripe ──────────────────────────────────────────────────────────────────

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

// POST /api/payments/stripe/intent
router.post('/stripe/intent', async (req, res, next) => {
  try {
    const { amount, contributorName, eventId } = req.body

    if (!amount || amount < 10) {
      return res.status(400).json({ message: 'Importo minimo €10' })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency: 'eur',
      metadata: { contributorName, eventId },
      automatic_payment_methods: { enabled: true },
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    next(err)
  }
})

// POST /api/payments/stripe/webhook
router.post(
  '/stripe/webhook',
  // Raw body needed for Stripe signature verification
  (req, res, next) => {
    const sig = req.headers['stripe-signature']
    let event
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object
      const { eventId, contributorName } = pi.metadata

      // Update contribution status and collective_amount
      ;(async () => {
        const { data: contrib } = await supabase
          .from('contributions')
          .update({ status: 'completed' })
          .eq('stripe_payment_intent', pi.id)
          .select()
          .single()

        if (contrib) {
          await supabase.rpc('increment_collective_amount', {
            p_event_id: eventId,
            p_amount: contrib.amount,
          })
        }
      })()
    }

    res.json({ received: true })
  }
)

// ─── PayPal ──────────────────────────────────────────────────────────────────

// POST /api/payments/paypal/order
router.post('/paypal/order', async (req, res, next) => {
  try {
    const { amount, contributorName, eventId } = req.body

    if (!amount || amount < 10) {
      return res.status(400).json({ message: 'Importo minimo €10' })
    }

    // Get PayPal access token
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64')

    const tokenRes = await fetch(
      process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com/v1/oauth2/token'
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      }
    )
    const { access_token } = await tokenRes.json()

    // Create PayPal order
    const baseUrl =
      process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'

    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: 'EUR', value: amount.toFixed(2) },
            description: `Regalo collettivo — ${contributorName}`,
            custom_id: eventId,
          },
        ],
        application_context: {
          return_url: `${process.env.FRONTEND_URL}/collettivo/${req.body.collectiveToken}?paypal=success`,
          cancel_url: `${process.env.FRONTEND_URL}/collettivo/${req.body.collectiveToken}?paypal=cancel`,
        },
      }),
    })

    const order = await orderRes.json()
    const approvalUrl = order.links?.find((l) => l.rel === 'approve')?.href

    res.json({ orderId: order.id, approvalUrl })
  } catch (err) {
    next(err)
  }
})

// POST /api/payments/paypal/capture — capture after redirect
router.post('/paypal/capture', async (req, res, next) => {
  try {
    const { orderId } = req.body

    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64')
    const tokenRes = await fetch(
      process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com/v1/oauth2/token'
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      }
    )
    const { access_token } = await tokenRes.json()

    const baseUrl =
      process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'

    const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    })

    const capture = await captureRes.json()
    res.json(capture)
  } catch (err) {
    next(err)
  }
})

// ─── Satispay ────────────────────────────────────────────────────────────────

// POST /api/payments/satispay/init
router.post('/satispay/init', async (req, res, next) => {
  try {
    const { amount, contributorName, collectiveToken } = req.body

    if (!amount || amount < 10) {
      return res.status(400).json({ message: 'Importo minimo €10' })
    }

    // Satispay uses RSA-SHA256 signature auth — simplified placeholder
    // In production: use official Satispay SDK or implement HMAC signing
    // Docs: https://developers.satispay.com/
    const callbackUrl = `${process.env.FRONTEND_URL}/collettivo/${collectiveToken}?satispay=success`

    // Placeholder response — replace with real Satispay API call
    res.json({
      message: 'Satispay integration requires RSA key setup',
      redirectUrl: callbackUrl,
      sandbox: process.env.SATISPAY_ENV !== 'production',
    })
  } catch (err) {
    next(err)
  }
})

export default router

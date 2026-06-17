import { Router } from 'express'
import Stripe from 'stripe'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ─── Stripe ──────────────────────────────────────────────────────────────────

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

// POST /api/payments/stripe/intent
router.post('/stripe/intent', async (req, res, next) => {
  try {
    const { contributorName, eventId } = req.body
    const amount = parseFloat(req.body.amount)

    if (!Number.isFinite(amount) || amount < 10) {
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

// ─── Satispay ────────────────────────────────────────────────────────────────

// POST /api/payments/satispay/init
router.post('/satispay/init', async (req, res, next) => {
  try {
    const { contributorName, collectiveToken } = req.body
    const amount = parseFloat(req.body.amount)

    if (!Number.isFinite(amount) || amount < 10) {
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

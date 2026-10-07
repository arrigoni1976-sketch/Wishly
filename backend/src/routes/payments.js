import { Router } from 'express'
import Stripe from 'stripe'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY non impostata')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

// ─── POST /api/payments/stripe/checkout ──────────────────────────────────────
// Crea l'evento in stato 'pending' e apre una Stripe Checkout Session
router.post('/stripe/checkout', requireAuth, async (req, res, next) => {
  try {
    const stripe = getStripe()
    const userId = req.user.id
    const {
      childName, gender, partyDate, partyTime, location, address, notes,
      parentEmail, closingDate, gifts = [],
      collectiveEnabled, collectiveGoal, collectiveDescription, paypalEmail,
      fixedQuotaEnabled, collectiveFixedQuota,
      utmSource, utmMedium, utmCampaign, referralSource,
    } = req.body

    if (!childName || !partyDate || !parentEmail) {
      return res.status(400).json({ message: 'Dati evento incompleti' })
    }

    // Crea evento in stato pending
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .insert({
        child_name: childName,
        gender: gender || null,
        party_date: partyDate,
        party_time: partyTime || null,
        location: location || null,
        address: address || null,
        notes: notes || null,
        parent_email: parentEmail,
        closing_date: closingDate || null,
        collective_enabled: collectiveEnabled || false,
        collective_goal: collectiveEnabled ? parseFloat(collectiveGoal) || null : null,
        collective_description: collectiveEnabled ? collectiveDescription || null : null,
        paypal_email: collectiveEnabled ? paypalEmail || null : null,
        fixed_quota_enabled: fixedQuotaEnabled || false,
        collective_fixed_quota: fixedQuotaEnabled ? parseFloat(collectiveFixedQuota) || null : null,
        owner_id: userId,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        referral_source: referralSource || null,
        payment_status: 'pending',
      })
      .select()
      .single()

    if (eventErr) throw eventErr

    // Inserisce i regali
    if (gifts.length > 0) {
      const giftRows = gifts
        .filter((g) => g.name?.trim())
        .map((g, i) => ({
          event_id: event.id,
          name: g.name.trim(),
          description: g.description || null,
          price: g.price ? parseFloat(g.price) : null,
          amazon_url: g.amazonUrl || null,
          store_url: g.storeUrl || null,
          sort_order: i,
        }))
      if (giftRows.length > 0) {
        await supabase.from('gifts').insert(giftRows)
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://www.pikyapp.it'

    // Crea Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: 199, // €1,99
          product_data: {
            name: `Piky — Festa di ${childName}`,
            description: 'Genera il link da condividere con gli invitati',
          },
        },
        quantity: 1,
      }],
      metadata: { eventId: event.id },
      success_url: `${frontendUrl}/dashboard/${event.parent_token}?payment=ok`,
      cancel_url: `${frontendUrl}/crea?payment=cancelled`,
    })

    // Salva stripe_session_id sull'evento
    await supabase
      .from('events')
      .update({ stripe_session_id: session.id })
      .eq('id', event.id)

    res.json({ checkoutUrl: session.url, parentToken: event.parent_token })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/payments/stripe/webhook ───────────────────────────────────────
// Riceve gli eventi Stripe — il body deve essere raw (gestito in index.js)
router.post('/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[stripe] STRIPE_WEBHOOK_SECRET non impostata')
    return res.status(500).send('Webhook secret mancante')
  }

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe] Firma webhook non valida:', err.message)
    return res.status(400).send(`Webhook error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const eventId = session.metadata?.eventId

    if (eventId) {
      const { error } = await supabase
        .from('events')
        .update({ payment_status: 'active' })
        .eq('id', eventId)

      if (error) {
        console.error('[stripe] Errore attivazione evento:', error)
        return res.status(500).send('DB error')
      }
      console.log(`[stripe] Evento ${eventId} attivato dopo pagamento`)
    }
  }

  res.json({ received: true })
})

// ─── Satispay (stub — non attivo) ────────────────────────────────────────────
router.post('/satispay/init', async (req, res) => {
  res.status(501).json({ message: 'Satispay non attivo' })
})

export default router

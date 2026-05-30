import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { supabase } from '../lib/supabase.js'
import { sendEventCreatedEmail } from '../services/email.js'

const router = Router()

// ─── POST /api/events — Create event ────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const {
      childName, birthDate, partyDate, partyTime, location, notes,
      parentEmail, closingDate, gender,
      collectiveEnabled, collectiveGoal, collectiveDescription, paypalEmail, collectiveFixedQuota,
      gifts = [],
    } = req.body

    if (!childName || !partyDate || !parentEmail) {
      return res.status(400).json({ message: 'childName, partyDate e parentEmail sono obbligatori' })
    }

    const parentToken = uuid()
    const guestToken = uuid()
    const collectiveToken = uuid()

    // Insert event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        child_name: childName,
        gender: gender || null,
        birth_date: birthDate || null,
        party_date: partyDate,
        party_time: partyTime || null,
        location: location || null,
        notes: notes || null,
        parent_email: parentEmail,
        closing_date: closingDate || null,
        parent_token: parentToken,
        guest_token: guestToken,
        collective_token: collectiveToken,
        collective_enabled: !!collectiveEnabled,
        collective_goal: collectiveEnabled ? parseFloat(collectiveGoal) : null,
        collective_description: collectiveDescription || null,
        collective_amount: 0,
        paypal_email: collectiveEnabled && paypalEmail ? paypalEmail : null,
        collective_fixed_quota: collectiveEnabled && collectiveFixedQuota ? parseFloat(collectiveFixedQuota) : null,
      })
      .select()
      .single()

    if (eventError) throw eventError

    // Insert gifts if provided
    if (gifts.length > 0) {
      const giftsToInsert = gifts.map((g, i) => ({
        event_id: event.id,
        name: g.name,
        description: g.description || null,
        price: g.price ? parseFloat(g.price) : null,
        amazon_url: g.amazonUrl || null,
        store_url: g.storeUrl || null,
        sort_order: i,
      }))
      const { error: giftsError } = await supabase.from('gifts').insert(giftsToInsert)
      if (giftsError) throw giftsError
    }

    // Send confirmation email (non-blocking — don't fail if email fails)
    sendEventCreatedEmail({
      to: parentEmail,
      childName,
      partyDate,
      partyTime,
      location,
      parentToken,
      guestToken,
      collectiveToken: collectiveEnabled ? collectiveToken : null,
    }).catch((err) => console.error('[email] failed to send event created email:', err.message))

    res.status(201).json({
      id: event.id,
      parentToken,
      guestToken,
      collectiveToken: collectiveEnabled ? collectiveToken : null,
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/events/parent/:token — Parent dashboard ───────────────────────
router.get('/parent/:token', async (req, res, next) => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        *,
        gifts(*),
        rsvp(*),
        link_views(*),
        contributions(*)
      `)
      .eq('parent_token', req.params.token)
      .single()

    if (error || !event) return res.status(404).json({ message: 'Evento non trovato' })

    // Sort gifts by sort_order
    if (event.gifts) event.gifts.sort((a, b) => a.sort_order - b.sort_order)

    res.json(event)
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/events/guest/:token — Guest view (no sensitive data) ──────────
router.get('/guest/:token', async (req, res, next) => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        id, child_name, gender, birth_date, party_date, party_time, location, notes,
        closing_date, collective_enabled, collective_token,
        collective_goal, collective_amount, collective_description,
        gifts(id, name, description, price, amazon_url, store_url, reserved_by, reserved_partner, purchased_offline, sort_order),
        rsvp(id, guest_name, status, children_count)
      `)
      .eq('guest_token', req.params.token)
      .single()

    if (error || !event) return res.status(404).json({ message: 'Lista non trovata' })

    if (event.gifts) event.gifts.sort((a, b) => a.sort_order - b.sort_order)

    res.json(event)
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/events/collective/:token — Collective gift view ───────────────
router.get('/collective/:token', async (req, res, next) => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        id, child_name, party_date, party_time, location,
        collective_enabled, collective_goal, collective_amount, collective_description, paypal_email, collective_fixed_quota,
        contributions(id, contributor_name, amount, payment_method, status, created_at)
      `)
      .eq('collective_token', req.params.token)
      .eq('collective_enabled', true)
      .single()

    if (error || !event) return res.status(404).json({ message: 'Pagina non trovata' })

    res.json(event)
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/events/guest/:token/view — Track link view ───────────────────
router.post('/guest/:token/view', async (req, res, next) => {
  try {
    const { guestName } = req.body

    // Find event id from token
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('guest_token', req.params.token)
      .single()

    if (!event) return res.status(404).json({ message: 'Evento non trovato' })

    console.log(`[view] token=${req.params.token} eventId=${event.id} guestName=${guestName || 'anon'}`)

    // Upsert view record (by guest_name if provided, otherwise aggregate anonymous row)
    if (guestName) {
      const { data: existing } = await supabase
        .from('link_views')
        .select('id, view_count')
        .eq('event_id', event.id)
        .eq('guest_name', guestName)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('link_views')
          .update({ view_count: existing.view_count + 1, last_viewed_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        await supabase.from('link_views').insert({
          event_id: event.id,
          guest_name: guestName,
        })
      }
    } else {
      // Anonymous view: upsert a single aggregate row per event (guest_name = null)
      const { data: existing } = await supabase
        .from('link_views')
        .select('id, view_count')
        .eq('event_id', event.id)
        .is('guest_name', null)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('link_views')
          .update({ view_count: existing.view_count + 1, last_viewed_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        const { error: insertErr } = await supabase.from('link_views').insert({
          event_id: event.id,
          guest_name: null,
        })
        if (insertErr) console.error('[view] insert anon error:', insertErr.message)
        else console.log('[view] anon row inserted')
      }
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ─── PUT /api/events/:id — Update event metadata ────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { parentToken, ...updates } = req.body

    // Verify ownership via parentToken
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', req.params.id)
      .eq('parent_token', parentToken)
      .single()

    if (!event) return res.status(403).json({ message: 'Non autorizzato' })

    const { error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ─── PUT /api/events/:id/gifts/order — Reorder gifts ────────────────────────
router.put('/:id/gifts/order', async (req, res, next) => {
  try {
    const { order } = req.body // array of gift IDs in new order
    const updates = order.map((giftId, i) => ({ id: giftId, sort_order: i }))

    for (const u of updates) {
      await supabase.from('gifts').update({ sort_order: u.sort_order }).eq('id', u.id)
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/events/:id/gifts — Add gift ───────────────────────────────────
router.post('/:id/gifts', async (req, res, next) => {
  try {
    const { name, description, price, amazonUrl, storeUrl } = req.body

    if (!name) return res.status(400).json({ message: 'Nome obbligatorio' })

    // Get current max sort_order
    const { data: lastGift } = await supabase
      .from('gifts')
      .select('sort_order')
      .eq('event_id', req.params.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data, error } = await supabase
      .from('gifts')
      .insert({
        event_id: req.params.id,
        name,
        description: description || null,
        price: price ? parseFloat(price) : null,
        amazon_url: amazonUrl || null,
        store_url: storeUrl || null,
        sort_order: lastGift ? lastGift.sort_order + 1 : 0,
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/events/:id/rsvp — Submit RSVP ────────────────────────────────
router.post('/:id/rsvp', async (req, res, next) => {
  try {
    const { guestName, guestEmail, status, childrenCount } = req.body

    if (!guestName || !status) {
      return res.status(400).json({ message: 'guestName e status obbligatori' })
    }

    if (!['yes', 'maybe', 'no'].includes(status)) {
      return res.status(400).json({ message: 'Status non valido' })
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('rsvp')
      .select('id')
      .eq('event_id', req.params.id)
      .eq('guest_name', guestName)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('rsvp')
        .update({ status, children_count: childrenCount || 0, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return res.json(data)
    }

    const { data, error } = await supabase
      .from('rsvp')
      .insert({
        event_id: req.params.id,
        guest_name: guestName,
        guest_email: guestEmail || null,
        status,
        children_count: childrenCount || 0,
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/events/:id/contributions — Log contribution ──────────────────
router.post('/:id/contributions', async (req, res, next) => {
  try {
    const { contributorName, amount, paymentMethod, collectiveToken } = req.body

    if (!contributorName || !amount || !paymentMethod) {
      return res.status(400).json({ message: 'Dati mancanti' })
    }

    if (amount < 10) {
      return res.status(400).json({ message: 'Importo minimo €10' })
    }

    // Verify collective token matches event
    const { data: event } = await supabase
      .from('events')
      .select('id, collective_goal, collective_amount')
      .eq('id', req.params.id)
      .eq('collective_token', collectiveToken)
      .single()

    if (!event) return res.status(403).json({ message: 'Token non valido' })

    const remaining = event.collective_goal - event.collective_amount
    if (amount > remaining) {
      return res.status(400).json({ message: `Importo massimo €${remaining.toFixed(2)}` })
    }

    const { data, error } = await supabase
      .from('contributions')
      .insert({
        event_id: req.params.id,
        contributor_name: contributorName,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        status: 'pending', // will be updated by payment webhook
      })
      .select()
      .single()

    if (error) throw error

    // For mock/test: immediately set as completed and update total
    // In production this happens via payment webhook
    await supabase
      .from('contributions')
      .update({ status: 'completed' })
      .eq('id', data.id)

    await supabase
      .from('events')
      .update({ collective_amount: event.collective_amount + parseFloat(amount) })
      .eq('id', req.params.id)

    res.status(201).json({ ...data, status: 'completed' })
  } catch (err) {
    next(err)
  }
})

export default router

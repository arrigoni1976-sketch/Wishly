import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { supabase } from '../lib/supabase.js'
import { sendEventCreatedEmail, sendThankYouEmail } from '../services/email.js'
import { sendPushToParent } from '../services/push.js'
import { isListClosed } from '../lib/utils.js'
import { createResourceLimiter, emailSendLimiter } from '../lib/rateLimit.js'

const router = Router()

// ─── User-Agent parser ───────────────────────────────────────────────────────
function parseUserAgent(ua) {
  if (!ua) return { device_type: 'unknown', os: 'unknown', browser: 'unknown' }
  const isMobile = /mobile|android|iphone|ipod/i.test(ua)
  const isTablet = /ipad|tablet/i.test(ua)
  const device_type = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'
  let os = 'other'
  if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS'
  else if (/linux/i.test(ua)) os = 'Linux'
  let browser = 'other'
  if (/edg\//i.test(ua)) browser = 'Edge'
  else if (/firefox/i.test(ua)) browser = 'Firefox'
  else if (/chrome/i.test(ua)) browser = 'Chrome'
  else if (/safari/i.test(ua)) browser = 'Safari'
  return { device_type, os, browser }
}

// ─── POST /api/events — Create event ────────────────────────────────────────
router.post('/', createResourceLimiter, async (req, res, next) => {
  try {
    const {
      childName, partyDate, partyTime, location, address, notes,
      parentEmail, closingDate, gender,
      collectiveEnabled, collectiveGoal, collectiveDescription, paypalEmail, collectiveFixedQuota,
      gifts = [],
      referralSource, utmSource, utmMedium, utmCampaign,
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
        party_date: partyDate,
        party_time: partyTime || null,
        location: location || null,
        address: address || null,
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
        referral_source: referralSource || null,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
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

// ─── GET /api/events/email-quota — Check events count for an email ──────────
router.get('/email-quota', async (req, res, next) => {
  try {
    const email = req.query.email?.trim().toLowerCase()
    if (!email) return res.status(400).json({ message: 'email obbligatoria' })

    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .ilike('parent_email', email)

    const eventCount = count || 0
    res.json({ eventCount, freeEventUsed: eventCount >= 1 })
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
        id, child_name, gender, party_date, party_time, location, address, notes,
        closing_date, collective_enabled, collective_token,
        collective_goal, collective_amount, collective_description,
        gifts(id, name, description, price, amazon_url, store_url, reserved_by, reserved_partner, purchased_offline, sort_order),
        rsvp(id, guest_name, status, children_count, adults_count, with_partner),
        contributions(id, contributor_name, amount, status, created_at)
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
        id, child_name, party_date, party_time, location, closing_date,
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
    const { device_type, os, browser } = parseUserAgent(req.headers['user-agent'])

    // Find event id from token
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('guest_token', req.params.token)
      .single()

    if (!event) return res.status(404).json({ message: 'Evento non trovato' })

    console.log(`[view] token=${req.params.token.slice(0, 8)}… eventId=${event.id} guestName=${guestName || 'anon'} device=${device_type}`)

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
          device_type,
          os,
          browser,
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
          device_type,
          os,
          browser,
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
// Campi che l'organizzatore può modificare via PUT /:id — qualsiasi altro campo
// (token, collective_amount, parent_email, ecc.) viene ignorato per evitare mass assignment.
const EVENT_UPDATABLE_FIELDS = [
  'child_name', 'gender', 'party_date', 'party_time', 'location', 'address', 'notes',
  'closing_date', 'collective_enabled', 'collective_goal', 'collective_description',
  'paypal_email', 'collective_fixed_quota',
]

router.put('/:id', async (req, res, next) => {
  try {
    const { parentToken } = req.body

    // Verify ownership via parentToken
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', req.params.id)
      .eq('parent_token', parentToken)
      .single()

    if (!event) return res.status(403).json({ message: 'Non autorizzato' })

    const updates = {}
    for (const field of EVENT_UPDATABLE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    }

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
    const { order, parentToken } = req.body // array of gift IDs in new order

    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', req.params.id)
      .eq('parent_token', parentToken)
      .single()

    if (!event) return res.status(403).json({ message: 'Non autorizzato' })

    const updates = order.map((giftId, i) => ({ id: giftId, sort_order: i }))

    for (const u of updates) {
      await supabase.from('gifts').update({ sort_order: u.sort_order }).eq('id', u.id).eq('event_id', req.params.id)
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/events/:id/gifts — Add gift ───────────────────────────────────
router.post('/:id/gifts', async (req, res, next) => {
  try {
    const { name, description, price, amazonUrl, storeUrl, parentToken } = req.body

    if (!name) return res.status(400).json({ message: 'Nome obbligatorio' })

    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', req.params.id)
      .eq('parent_token', parentToken)
      .single()

    if (!event) return res.status(403).json({ message: 'Non autorizzato' })

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
    const { guestEmail, status, childrenCount, adultsCount, idempotencyKey } = req.body
    const guestName = req.body.guestName?.trim()

    if (!guestName || !status) {
      return res.status(400).json({ message: 'guestName e status obbligatori' })
    }

    if (!['yes', 'maybe', 'no'].includes(status)) {
      return res.status(400).json({ message: 'Status non valido' })
    }

    // Check closing date
    const { data: eventCheck } = await supabase
      .from('events')
      .select('closing_date')
      .eq('id', req.params.id)
      .single()

    if (isListClosed(eventCheck?.closing_date)) {
      return res.status(403).json({ message: 'Lista chiusa' })
    }

    // Check if already exists (case-insensitive to avoid duplicates)
    const { data: existing } = await supabase
      .from('rsvp')
      .select('*')
      .eq('event_id', req.params.id)
      .ilike('guest_name', guestName)
      .maybeSingle()

    if (existing) {
      // Stessa richiesta già elaborata (es. retry di rete) — non duplicare la notifica
      if (idempotencyKey && existing.idempotency_key === idempotencyKey) {
        return res.json(existing)
      }

      const { data, error } = await supabase
        .from('rsvp')
        .update({
          status,
          children_count: childrenCount || 0,
          adults_count: adultsCount ?? 1,
          updated_at: new Date().toISOString(),
          idempotency_key: idempotencyKey || null,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error

      // Notifica push anche per aggiornamento RSVP (fire-and-forget)
      supabase.from('events').select('parent_token, child_name').eq('id', req.params.id).single()
        .then(({ data: ev }) => {
          if (!ev) return
          const statusLabel = { yes: 'parteciperà 🎉', maybe: 'forse parteciperà', no: 'non potrà venire' }[status]
          sendPushToParent(ev.parent_token, {
            title: `Piky — ${guestName} ha aggiornato la risposta`,
            body: `${guestName} ${statusLabel} al compleanno di ${ev.child_name}`,
            url: `/dashboard/${ev.parent_token}`,
          })
        })
        .catch(err => console.error('[rsvp] push notification failed', err))

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
        adults_count: adultsCount ?? 1,
        idempotency_key: idempotencyKey || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505' && idempotencyKey) {
        const { data: dup } = await supabase
          .from('rsvp')
          .select('*')
          .eq('event_id', req.params.id)
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle()
        if (dup) return res.status(200).json(dup)
      }
      throw error
    }

    // Registra first_rsvp_at se non ancora impostato (fire-and-forget)
    supabase.from('events')
      .update({ first_rsvp_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .is('first_rsvp_at', null)
      .then(() => {}).catch(err => console.error('[rsvp] first_rsvp_at update failed', err))

    // Notifica push all'organizzatore (fire-and-forget)
    supabase.from('events').select('parent_token, child_name').eq('id', req.params.id).single()
      .then(({ data: ev }) => {
        if (!ev) return
        const statusLabel = { yes: 'parteciperà 🎉', maybe: 'forse parteciperà', no: 'non potrà venire' }[status]
        sendPushToParent(ev.parent_token, {
          title: `Piky — ${guestName} ha risposto`,
          body: `${guestName} ${statusLabel} al compleanno di ${ev.child_name}`,
          url: `/dashboard/${ev.parent_token}`,
        })
      })
      .catch(err => console.error('[rsvp] push notification failed', err))

    res.status(201).json(data)
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/events/:id/contributions — Log contribution ──────────────────
router.post('/:id/contributions', async (req, res, next) => {
  try {
    const { contributorName, paymentMethod, collectiveToken, idempotencyKey } = req.body
    const amount = parseFloat(req.body.amount)

    if (!contributorName || !paymentMethod) {
      return res.status(400).json({ message: 'Dati mancanti' })
    }

    if (!Number.isFinite(amount) || amount < 10) {
      return res.status(400).json({ message: 'Importo minimo €10' })
    }

    // Verify collective token matches event
    const { data: event } = await supabase
      .from('events')
      .select('id, collective_goal, collective_amount, parent_token, child_name, collective_description, closing_date')
      .eq('id', req.params.id)
      .eq('collective_token', collectiveToken)
      .single()

    if (!event) return res.status(403).json({ message: 'Token non valido' })

    if (isListClosed(event.closing_date)) {
      return res.status(403).json({ message: 'Lista chiusa' })
    }

    const remaining = event.collective_goal - event.collective_amount
    if (amount > remaining) {
      return res.status(400).json({ message: `Importo massimo €${remaining.toFixed(2)}` })
    }

    const { data, error } = await supabase
      .from('contributions')
      .insert({
        event_id: req.params.id,
        contributor_name: contributorName,
        amount,
        payment_method: paymentMethod,
        status: paymentMethod === 'paypal' ? 'pending' : 'completed',
        idempotency_key: idempotencyKey || null,
        edit_token: crypto.randomUUID(),
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505' && idempotencyKey) {
        // Richiesta già elaborata (es. retry di rete) — non duplicare riga/notifica
        const { data: dup } = await supabase
          .from('contributions')
          .select('*')
          .eq('event_id', req.params.id)
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle()
        if (dup) return res.status(200).json({ ...dup })
      }
      throw error
    }

    // Per i contanti: aggiorna subito il totale. Per PayPal: in attesa di conferma
    if (paymentMethod !== 'paypal') {
      const { error: incError } = await supabase.rpc('increment_collective_amount', {
        p_event_id: req.params.id,
        p_amount: amount,
      })
      if (incError) console.error('[contributions] increment_collective_amount failed', incError)

      // Notifica push per contributo in contanti (fire-and-forget)
      const giftName = event.collective_description || 'regalo collettivo'
      sendPushToParent(event.parent_token, {
        title: `Piky — ${contributorName} ha contribuito 💛`,
        body: `€${amount.toFixed(2)} per "${giftName}" al compleanno di ${event.child_name}`,
        url: `/dashboard/${event.parent_token}`,
      })
    } else {
      // Per PayPal: notifica che c'è un contributo in attesa di verifica
      const giftName = event.collective_description || 'regalo collettivo'
      sendPushToParent(event.parent_token, {
        title: `Piky — ${contributorName} vuole contribuire con PayPal 💛`,
        body: `€${amount.toFixed(2)} per "${giftName}" — verifica nel tuo dashboard`,
        url: `/dashboard/${event.parent_token}`,
      })
    }

    res.status(201).json({ ...data })
  } catch (err) {
    next(err)
  }
})

// ─── PUT /api/events/:id/contributions/:cid — Edit a contribution ───────────
router.put('/:id/contributions/:cid', async (req, res, next) => {
  try {
    const { contributorName, collectiveToken, editToken } = req.body
    const newAmount = parseFloat(req.body.amount)

    if (!contributorName || !Number.isFinite(newAmount)) {
      return res.status(400).json({ message: 'Dati mancanti' })
    }

    if (newAmount < 10) {
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

    // Get existing contribution
    const { data: existing } = await supabase
      .from('contributions')
      .select('id, amount, status, edit_token')
      .eq('id', req.params.cid)
      .eq('event_id', req.params.id)
      .single()

    if (!existing) return res.status(404).json({ message: 'Contributo non trovato' })

    // Il collectiveToken è condiviso da tutti gli invitati: senza questo controllo
    // chiunque avesse il link potrebbe modificare il contributo di un altro ospite.
    if (!existing.edit_token || existing.edit_token !== editToken) {
      return res.status(403).json({ message: 'Non autorizzato a modificare questo contributo' })
    }

    if (existing.status !== 'completed') {
      return res.status(400).json({ message: 'Solo i contributi completati sono modificabili' })
    }

    const oldAmount = parseFloat(existing.amount)
    const remaining = event.collective_goal - event.collective_amount + oldAmount

    if (newAmount > remaining) {
      return res.status(400).json({ message: `Importo massimo €${remaining.toFixed(2)}` })
    }

    const { data, error } = await supabase
      .from('contributions')
      .update({ contributor_name: contributorName.trim(), amount: newAmount })
      .eq('id', req.params.cid)
      .select()
      .single()

    if (error) throw error

    // Adjust event total atomically (delta può essere negativo)
    const { error: incError } = await supabase.rpc('increment_collective_amount', {
      p_event_id: req.params.id,
      p_amount: newAmount - oldAmount,
    })
    if (incError) console.error('[contributions] increment_collective_amount failed', incError)

    res.json(data)
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/events/:id/contributions/:cid/confirm — Confirm PayPal payment ─
router.patch('/:id/contributions/:cid/confirm', async (req, res, next) => {
  try {
    const { parentToken } = req.body

    // Verify organizer ownership
    const { data: event } = await supabase
      .from('events')
      .select('id, collective_amount')
      .eq('id', req.params.id)
      .eq('parent_token', parentToken)
      .single()

    if (!event) return res.status(403).json({ message: 'Non autorizzato' })

    // Get contribution
    const { data: contribution } = await supabase
      .from('contributions')
      .select('id, amount, status')
      .eq('id', req.params.cid)
      .eq('event_id', req.params.id)
      .single()

    if (!contribution) return res.status(404).json({ message: 'Contributo non trovato' })
    if (contribution.status === 'completed') return res.json({ ok: true }) // già confermato

    await supabase
      .from('contributions')
      .update({ status: 'completed' })
      .eq('id', req.params.cid)

    const { error: incError } = await supabase.rpc('increment_collective_amount', {
      p_event_id: req.params.id,
      p_amount: parseFloat(contribution.amount),
    })
    if (incError) console.error('[contributions] increment_collective_amount failed', incError)

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/events/:id/thank-you — Send thank-you emails to guests ────────
router.post('/:id/thank-you', emailSendLimiter, async (req, res, next) => {
  try {
    const { parentToken, message } = req.body

    if (!parentToken || !message?.trim()) {
      return res.status(400).json({ message: 'parentToken e message sono obbligatori' })
    }

    const { data: event, error } = await supabase
      .from('events')
      .select('*, rsvp(*)')
      .eq('id', req.params.id)
      .eq('parent_token', parentToken)
      .single()

    if (error || !event) return res.status(403).json({ message: 'Non autorizzato' })

    const guests = (event.rsvp || []).filter((r) => r.status === 'yes' && r.guest_email)

    const results = await Promise.allSettled(
      guests.map((g) =>
        sendThankYouEmail({
          to: g.guest_email,
          guestName: g.guest_name,
          childName: event.child_name,
          message: message.trim(),
        })
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    res.json({ sent, failed, total: guests.length })
  } catch (err) {
    next(err)
  }
})

export default router

// Vercel serverless proxy — all core endpoints handled directly via Supabase.
// Payments and push notifications still forwarded to Railway as fallback.

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

function parsePrice(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseFloat(String(val).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) throw new Error('Supabase env vars missing')
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function verifyJwt(req) {
  const authHeader = req.headers.authorization || ''
  const userJwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!userJwt) return null
  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  const { data: { user } } = await createClient(url, anonKey).auth.getUser(userJwt)
  return user || null
}

// ─── POST /api/events ────────────────────────────────────────────────────────
async function handleCreateEvent(req, res) {
  const user = await verifyJwt(req)
  if (!user) return res.status(401).json({ message: 'Sessione non valida' })

  const db = getSupabase()
  const {
    childName, partyDate, partyTime, location, address, notes,
    parentEmail, closingDate, gender,
    collectiveEnabled, collectiveGoal, collectiveDescription, paypalEmail, collectiveFixedQuota,
    gifts = [],
    referralSource, utmSource, utmMedium, utmCampaign,
  } = req.body || {}

  if (!childName || !partyDate || !parentEmail) {
    return res.status(400).json({ message: 'childName, partyDate e parentEmail sono obbligatori' })
  }

  const parentToken = randomUUID()
  const guestToken = randomUUID()
  const collectiveToken = randomUUID()

  const { data: event, error: eventError } = await db.from('events').insert({
    child_name: childName, gender: gender || null, party_date: partyDate,
    party_time: partyTime || null, location: location || null, address: address || null,
    notes: notes || null, parent_email: parentEmail, closing_date: closingDate || null,
    parent_token: parentToken, guest_token: guestToken, collective_token: collectiveToken,
    collective_enabled: !!collectiveEnabled,
    collective_goal: collectiveEnabled ? parseFloat(collectiveGoal) : null,
    collective_description: collectiveDescription || null, collective_amount: 0,
    paypal_email: collectiveEnabled && paypalEmail ? paypalEmail : null,
    collective_fixed_quota: collectiveEnabled && collectiveFixedQuota ? parseFloat(collectiveFixedQuota) : null,
    referral_source: referralSource || null, utm_source: utmSource || null,
    utm_medium: utmMedium || null, utm_campaign: utmCampaign || null, owner_id: user.id,
  }).select().single()

  if (eventError) {
    console.error('[createEvent]', eventError)
    return res.status(500).json({ message: eventError.message })
  }

  if (Array.isArray(gifts) && gifts.length > 0) {
    const giftsPayload = gifts.map((g, i) => ({
      event_id: event.id, name: g.name, description: g.description || null,
      price: parsePrice(g.price), amazon_url: g.amazonUrl || null,
      store_url: g.storeUrl || null, sort_order: i,
    }))
    await db.from('gifts').insert(giftsPayload)
  }

  const storedParentToken = event.parent_token ?? parentToken
  const storedGuestToken = event.guest_token ?? guestToken
  const storedCollectiveToken = event.collective_token ?? collectiveToken
  return res.status(201).json({
    id: event.id, parentToken: storedParentToken, guestToken: storedGuestToken,
    collectiveToken: collectiveEnabled ? storedCollectiveToken : null,
  })
}

// ─── PUT /api/events/:id ─────────────────────────────────────────────────────
async function handleUpdateEvent(id, req, res) {
  const db = getSupabase()
  const { parentToken } = req.body || {}
  if (!parentToken) return res.status(400).json({ message: 'parentToken obbligatorio' })

  const { data: ev } = await db.from('events').select('id').eq('id', id).eq('parent_token', parentToken).single()
  if (!ev) return res.status(403).json({ message: 'Non autorizzato' })

  const allowed = [
    'child_name','gender','party_date','party_time','location','address','notes',
    'closing_date','collective_enabled','collective_goal','collective_description',
    'collective_fixed_quota','paypal_email',
  ]
  const update = {}
  for (const k of allowed) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    if ((req.body)[k] !== undefined) update[k] = (req.body)[k]
    else if ((req.body)[camel] !== undefined) update[k] = (req.body)[camel]
  }

  const { data, error } = await db.from('events').update(update).eq('id', id).select().single()
  if (error) return res.status(500).json({ message: error.message })
  return res.status(200).json(data)
}

// ─── GET /api/events/mine ────────────────────────────────────────────────────
async function handleGetMyEvents(req, res) {
  const user = await verifyJwt(req)
  if (!user) return res.status(401).json({ message: 'Sessione non valida' })
  const db = getSupabase()
  const { data: events, error } = await db.from('events').select('*, gifts(*)')
    .eq('owner_id', user.id).order('created_at', { ascending: false })
  if (error) return res.status(500).json({ message: error.message })
  if (events) for (const ev of events) {
    if (ev.gifts) ev.gifts.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }
  return res.status(200).json(events || [])
}

// ─── GET /api/events/parent/:token ───────────────────────────────────────────
async function handleGetEventByParentToken(token, res) {
  const db = getSupabase()
  let event, error
  ;({ data: event, error } = await db.from('events')
    .select('*, gifts(*), rsvp(*), link_views(*), contributions(*)')
    .eq('parent_token', token).single())
  if (error) {
    ;({ data: event, error } = await db.from('events').select('*, gifts(*)')
      .eq('parent_token', token).single())
  }
  if (error || !event) return res.status(404).json({ message: 'Evento non trovato' })
  if (event.gifts) event.gifts.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  return res.status(200).json(event)
}

// ─── GET /api/events/email-quota ─────────────────────────────────────────────
async function handleEmailQuota(req, res) {
  const { searchParams } = new URL(req.url, 'https://x.invalid')
  const email = searchParams.get('email')
  if (!email) return res.status(400).json({ message: 'email mancante' })
  const db = getSupabase()
  const { count, error } = await db.from('events').select('*', { count: 'exact', head: true })
    .ilike('parent_email', email)
  if (error) return res.status(500).json({ message: error.message })
  return res.status(200).json({ count: count ?? 0, eventCount: count ?? 0, freeEventUsed: (count ?? 0) >= 1 })
}

// ─── POST /api/events/guest/:token/view ──────────────────────────────────────
async function handleTrackLinkView(token, req, res) {
  const db = getSupabase()
  const { guestName } = req.body || {}
  const { data: ev } = await db.from('events').select('id').eq('guest_token', token).single()
  if (!ev) return res.status(404).json({ message: 'Evento non trovato' })
  await db.from('link_views').insert({ event_id: ev.id, guest_name: guestName || null })
    .catch(() => {})
  return res.status(200).json({ ok: true })
}

// ─── POST /api/events/:eventId/gifts ─────────────────────────────────────────
async function handleAddGift(eventId, req, res) {
  const db = getSupabase()
  const { name, description, price, amazonUrl, storeUrl, parentToken } = req.body || {}
  if (!name) return res.status(400).json({ message: 'name obbligatorio' })
  const { data: ev } = await db.from('events').select('id').eq('id', eventId).eq('parent_token', parentToken).single()
  if (!ev) return res.status(403).json({ message: 'Non autorizzato' })
  const { data: lastGift } = await db.from('gifts').select('sort_order')
    .eq('event_id', eventId).order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const { data, error } = await db.from('gifts').insert({
    event_id: eventId, name, description: description || null,
    price: parsePrice(price), amazon_url: amazonUrl || null,
    store_url: storeUrl || null, sort_order: lastGift ? lastGift.sort_order + 1 : 0,
  }).select().single()
  if (error) return res.status(500).json({ message: error.message })
  return res.status(201).json(data)
}

// ─── PUT /api/gifts/:giftId ───────────────────────────────────────────────────
async function handleUpdateGift(giftId, req, res) {
  const db = getSupabase()
  const { name, description, price, amazonUrl, storeUrl, parentToken } = req.body || {}
  if (!name) return res.status(400).json({ message: 'Nome obbligatorio' })
  const { data: gift } = await db.from('gifts').select('event_id').eq('id', giftId).single()
  if (!gift) return res.status(404).json({ message: 'Regalo non trovato' })
  const { data: ev } = await db.from('events').select('id').eq('id', gift.event_id).eq('parent_token', parentToken).single()
  if (!ev) return res.status(403).json({ message: 'Non autorizzato' })
  const { data, error } = await db.from('gifts').update({
    name, description: description || null, price: parsePrice(price),
    amazon_url: amazonUrl || null, store_url: storeUrl || null,
  }).eq('id', giftId).select().single()
  if (error) return res.status(500).json({ message: error.message })
  return res.status(200).json(data)
}

// ─── DELETE /api/gifts/:giftId ────────────────────────────────────────────────
async function handleDeleteGift(giftId, req, res) {
  const db = getSupabase()
  const { parentToken } = req.body || {}
  const { data: gift } = await db.from('gifts').select('event_id').eq('id', giftId).single()
  if (!gift) return res.status(404).json({ message: 'Regalo non trovato' })
  const { data: ev } = await db.from('events').select('id').eq('id', gift.event_id).eq('parent_token', parentToken).single()
  if (!ev) return res.status(403).json({ message: 'Non autorizzato' })
  const { error } = await db.from('gifts').delete().eq('id', giftId)
  if (error) return res.status(500).json({ message: error.message })
  return res.status(200).json({ ok: true })
}

// ─── POST /api/gifts/:giftId/reserve ─────────────────────────────────────────
async function handleReserveGift(giftId, req, res) {
  const db = getSupabase()
  const { guestName: rawName, partnerName, purchasedOffline } = req.body || {}
  const guestName = (rawName || '').trim()
  if (!guestName) return res.status(400).json({ message: 'guestName obbligatorio' })

  // Check if already reserved
  const { data: gift } = await db.from('gifts').select('id, name, reserved_by, event_id').eq('id', giftId).single()
  if (!gift) return res.status(404).json({ message: 'Regalo non trovato' })
  if (gift.reserved_by) return res.status(409).json({ message: 'Regalo già prenotato' })

  const { data, error } = await db.from('gifts').update({
    reserved_by: guestName,
    reserved_partner: partnerName || null,
    purchased_offline: !!purchasedOffline,
    reserved_at: new Date().toISOString(),
  }).eq('id', giftId).is('reserved_by', null).select().maybeSingle()

  if (error) return res.status(500).json({ message: error.message })
  if (!data) return res.status(409).json({ message: 'Regalo già prenotato da qualcun altro' })
  return res.status(200).json(data)
}

// ─── DELETE /api/gifts/:giftId/reserve ───────────────────────────────────────
async function handleCancelReservation(giftId, req, res) {
  const db = getSupabase()
  const { guestName } = req.body || {}
  if (!guestName) return res.status(400).json({ message: 'guestName obbligatorio' })

  const { data: gift } = await db.from('gifts').select('id, reserved_by').eq('id', giftId).single()
  if (!gift) return res.status(404).json({ message: 'Regalo non trovato' })
  if (gift.reserved_by?.toLowerCase() !== guestName?.toLowerCase()) {
    return res.status(403).json({ message: 'Non puoi cancellare la prenotazione di un altro' })
  }

  const { error } = await db.from('gifts').update({
    reserved_by: null, reserved_partner: null, purchased_offline: false, reserved_at: null,
  }).eq('id', giftId)
  if (error) return res.status(500).json({ message: error.message })
  return res.status(200).json({ ok: true })
}

// ─── PUT /api/events/:eventId/gifts/order ────────────────────────────────────
async function handleReorderGifts(eventId, req, res) {
  const db = getSupabase()
  const { order, parentToken } = req.body || {}
  if (!Array.isArray(order)) return res.status(400).json({ message: 'order deve essere un array' })
  const { data: ev } = await db.from('events').select('id').eq('id', eventId).eq('parent_token', parentToken).single()
  if (!ev) return res.status(403).json({ message: 'Non autorizzato' })
  await Promise.all(order.map((giftId, idx) =>
    db.from('gifts').update({ sort_order: idx }).eq('id', giftId).eq('event_id', eventId)
  ))
  return res.status(200).json({ ok: true })
}

// ─── POST /api/events/:eventId/rsvp ──────────────────────────────────────────
async function handleSubmitRsvp(eventId, req, res) {
  const db = getSupabase()
  const { status, childrenCount, adultsCount, idempotencyKey } = req.body || {}
  const guestName = (req.body?.guestName || '').trim()
  const parentName = (req.body?.parentName || '').trim() || null

  if (!guestName || !status) return res.status(400).json({ message: 'guestName e status obbligatori' })
  if (!['yes', 'maybe', 'no'].includes(status)) return res.status(400).json({ message: 'Status non valido' })

  // Check for existing RSVP (case-insensitive) — update instead of insert
  const { data: existing } = await db.from('rsvp').select('*')
    .eq('event_id', eventId).ilike('guest_name', guestName).maybeSingle()

  if (existing) {
    // If same idempotency key, return cached result
    if (idempotencyKey && existing.idempotency_key === idempotencyKey) {
      return res.status(200).json(existing)
    }
    const { data, error } = await db.from('rsvp').update({
      status,
      guest_name: guestName || existing.guest_name,
      parent_name: parentName || existing.parent_name,
      children_count: childrenCount ?? 0,
      adults_count: adultsCount ?? 1,
      updated_at: new Date().toISOString(),
      idempotency_key: idempotencyKey || null,
    }).eq('id', existing.id).select().single()
    if (error) return res.status(500).json({ message: error.message })
    return res.status(200).json(data)
  }

  const { data, error } = await db.from('rsvp').insert({
    event_id: eventId, guest_name: guestName, parent_name: parentName,
    status, children_count: childrenCount ?? 0, adults_count: adultsCount ?? 1,
    idempotency_key: idempotencyKey || null,
  }).select().single()

  if (error) {
    // Race condition: another request created the row concurrently
    if (error.code === '23505') {
      if (idempotencyKey) {
        const { data: dup } = await db.from('rsvp').select('*')
          .eq('event_id', eventId).eq('idempotency_key', idempotencyKey).maybeSingle()
        if (dup) return res.status(200).json(dup)
      }
      const { data: race, error: raceErr } = await db.from('rsvp').update({
        status, children_count: childrenCount ?? 0, adults_count: adultsCount ?? 1,
        updated_at: new Date().toISOString(), idempotency_key: idempotencyKey || null,
      }).eq('event_id', eventId).ilike('guest_name', guestName).select().single()
      if (raceErr) return res.status(500).json({ message: raceErr.message })
      return res.status(200).json(race)
    }
    return res.status(500).json({ message: error.message })
  }
  return res.status(201).json(data)
}

// ─── PUT /api/rsvp/:rsvpId ───────────────────────────────────────────────────
async function handleUpdateRsvp(rsvpId, req, res) {
  const db = getSupabase()
  const { status, childrenCount, adultsCount, guestName, parentName, guestToken } = req.body || {}

  if (!status || !['yes', 'maybe', 'no'].includes(status)) {
    return res.status(400).json({ message: 'Status non valido' })
  }
  if (!guestToken) return res.status(400).json({ message: 'guestToken obbligatorio' })

  // Verify the RSVP belongs to the event reachable via guestToken
  const { data: rsvp } = await db.from('rsvp').select('id, event_id').eq('id', rsvpId).single()
  if (!rsvp) return res.status(404).json({ message: 'RSVP non trovato' })

  const { data: ev } = await db.from('events').select('id').eq('id', rsvp.event_id).eq('guest_token', guestToken).single()
  if (!ev) return res.status(403).json({ message: 'Non autorizzato' })

  const update = {
    status,
    children_count: childrenCount ?? 0,
    adults_count: adultsCount ?? 1,
    updated_at: new Date().toISOString(),
  }
  if (guestName?.trim()) update.guest_name = guestName.trim()
  if (parentName?.trim()) update.parent_name = parentName.trim()

  const { data, error } = await db.from('rsvp').update(update).eq('id', rsvpId).select().single()
  if (error) return res.status(500).json({ message: error.message })
  return res.status(200).json(data)
}

// ─── PUT /api/events/:eventId/contributions/:cid ─────────────────────────────
async function handleUpdateContribution(eventId, cid, req, res) {
  const db = getSupabase()
  const { contributorName, collectiveToken, editToken } = req.body || {}
  const newAmount = parseFloat(req.body?.amount)

  if (!contributorName || !Number.isFinite(newAmount)) {
    return res.status(400).json({ message: 'Dati mancanti' })
  }
  if (newAmount < 10) return res.status(400).json({ message: 'Importo minimo €10' })

  // Verify collectiveToken matches event
  const { data: event } = await db.from('events').select('id, collective_goal, collective_amount')
    .eq('id', eventId).eq('collective_token', collectiveToken).single()
  if (!event) return res.status(403).json({ message: 'Token non valido' })

  // Get existing contribution and verify edit_token
  const { data: existing } = await db.from('contributions').select('id, amount, status, edit_token')
    .eq('id', cid).eq('event_id', eventId).single()
  if (!existing) return res.status(404).json({ message: 'Contributo non trovato' })

  if (!existing.edit_token || existing.edit_token !== editToken) {
    return res.status(403).json({ message: 'Non autorizzato a modificare questo contributo' })
  }
  if (existing.status !== 'completed') {
    return res.status(400).json({ message: 'Solo i contributi completati sono modificabili' })
  }

  const oldAmount = parseFloat(existing.amount)
  const delta = newAmount - oldAmount

  // Update collective_amount atomically for the delta
  if (delta !== 0) {
    const { data: newTotal, error: incError } = await db.rpc('increment_collective_amount', {
      p_event_id: eventId, p_amount: delta,
    })
    if (incError) return res.status(500).json({ message: incError.message })
    if (newTotal === null && delta > 0) {
      return res.status(400).json({ message: 'Importo massimo superato' })
    }
  }

  const { data, error } = await db.from('contributions')
    .update({ contributor_name: contributorName.trim(), amount: newAmount })
    .eq('id', cid).select().single()

  if (error) {
    if (delta !== 0) {
      await db.rpc('increment_collective_amount', { p_event_id: eventId, p_amount: -delta }).catch(() => {})
    }
    return res.status(500).json({ message: error.message })
  }
  return res.status(200).json(data)
}

// ─── PATCH /api/events/:eventId/contributions/:cid/confirm ───────────────────
async function handleConfirmContribution(eventId, cid, req, res) {
  const db = getSupabase()
  const { parentToken } = req.body || {}
  const { data: ev } = await db.from('events').select('id').eq('id', eventId).eq('parent_token', parentToken).single()
  if (!ev) return res.status(403).json({ message: 'Non autorizzato' })

  const { data: contribution } = await db.from('contributions').select('id, amount, status')
    .eq('id', cid).eq('event_id', eventId).single()
  if (!contribution) return res.status(404).json({ message: 'Contributo non trovato' })
  if (contribution.status === 'completed') return res.status(200).json({ ok: true })

  // Reserve capacity atomically before marking as completed
  const { data: newTotal, error: incError } = await db.rpc('increment_collective_amount', {
    p_event_id: eventId, p_amount: parseFloat(contribution.amount),
  })
  if (incError) return res.status(500).json({ message: incError.message })
  if (newTotal === null) {
    return res.status(409).json({ message: 'Obiettivo già raggiunto' })
  }

  const { error } = await db.from('contributions').update({ status: 'completed' }).eq('id', cid)
  if (error) {
    await db.rpc('increment_collective_amount', { p_event_id: eventId, p_amount: -parseFloat(contribution.amount) }).catch(() => {})
    return res.status(500).json({ message: error.message })
  }
  return res.status(200).json({ ok: true })
}

// ─── DELETE /api/account ─────────────────────────────────────────────────────
async function handleDeleteAccount(req, res) {
  const user = await verifyJwt(req)
  if (!user) return res.status(401).json({ message: 'Sessione non valida' })
  const db = getSupabase()
  const { error } = await db.auth.admin.deleteUser(user.id)
  if (error) return res.status(500).json({ message: error.message })
  return res.status(200).json({ ok: true })
}

// ─── User keys ────────────────────────────────────────────────────────────────
async function handleUserKeys(pathStr, req, res) {
  const db = getSupabase()

  // POST /api/user-keys/register
  if (req.method === 'POST' && pathStr === 'user-keys/register') {
    const { key } = req.body || {}
    if (!key || key.trim().length < 3) {
      return res.status(400).json({ message: 'Chiave non valida (minimo 3 caratteri)' })
    }
    const normalized = key.trim().toLowerCase()

    // Check uniqueness first
    const { data: existing } = await db.from('user_keys').select('key_value')
      .eq('key_value', normalized).maybeSingle()
    if (existing) return res.status(409).json({ message: 'Codice già in uso, riprova' })

    const { error } = await db.from('user_keys').insert({ key_value: normalized })
    if (error) return res.status(500).json({ message: error.message })
    return res.status(201).json({ key: normalized })
  }

  // GET /api/user-keys/:key
  const keyGetMatch = pathStr.match(/^user-keys\/([^/]+)$/)
  if (req.method === 'GET' && keyGetMatch) {
    const normalized = decodeURIComponent(keyGetMatch[1]).trim().toLowerCase()
    const { data: keyRecord } = await db.from('user_keys').select('key_value')
      .eq('key_value', normalized).maybeSingle()
    if (!keyRecord) return res.status(404).json({ message: 'Codice non trovato' })
    const { data: links, error } = await db.from('user_key_links').select('*')
      .eq('user_key', normalized).order('created_at', { ascending: false })
    if (error) return res.status(500).json({ message: error.message })
    return res.status(200).json({ links: links || [] })
  }

  // POST /api/user-keys/:key/link
  const keyLinkMatch = pathStr.match(/^user-keys\/([^/]+)\/link$/)
  if (req.method === 'POST' && keyLinkMatch) {
    const normalized = decodeURIComponent(keyLinkMatch[1]).trim().toLowerCase()
    const { linkType, token, childName, partyDate, guestName } = req.body || {}
    if (!linkType || !token) return res.status(400).json({ message: 'linkType e token sono obbligatori' })
    const { error } = await db.from('user_key_links').upsert({
      user_key: normalized, link_type: linkType, token,
      child_name: childName || null, party_date: partyDate || null, guest_name: guestName || null,
    }, { onConflict: 'user_key,token' })
    if (error) return res.status(500).json({ message: error.message })
    return res.status(201).json({ ok: true })
  }

  // DELETE /api/user-keys/:key/link/:token
  const keyUnlinkMatch = pathStr.match(/^user-keys\/([^/]+)\/link\/([^/]+)$/)
  if (req.method === 'DELETE' && keyUnlinkMatch) {
    const normalized = decodeURIComponent(keyUnlinkMatch[1]).trim().toLowerCase()
    const token = decodeURIComponent(keyUnlinkMatch[2])
    const { error } = await db.from('user_key_links').delete()
      .eq('user_key', normalized).eq('token', token)
    if (error) return res.status(500).json({ message: error.message })
    return res.status(200).json({ ok: true })
  }

  return null
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const parsedUrl = new URL(req.url, 'https://x.invalid')
  const pathStr = parsedUrl.pathname.replace(/^\/api\/?/, '')

  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    // Events
    if (req.method === 'POST' && pathStr === 'events') return await handleCreateEvent(req, res)
    if (req.method === 'GET'  && pathStr === 'events/mine') return await handleGetMyEvents(req, res)
    if (req.method === 'GET'  && pathStr === 'events/email-quota') return await handleEmailQuota(req, res)
    if (req.method === 'DELETE' && pathStr === 'account') return await handleDeleteAccount(req, res)

    const parentTokenMatch = pathStr.match(/^events\/parent\/([^/?]+)/)
    if (req.method === 'GET' && parentTokenMatch) return await handleGetEventByParentToken(parentTokenMatch[1], res)

    const updateEventMatch = pathStr.match(/^events\/([^/?]+)$/)
    if (req.method === 'PUT' && updateEventMatch && updateEventMatch[1] !== 'mine') {
      return await handleUpdateEvent(updateEventMatch[1], req, res)
    }

    // PUT /api/event/:id — alias usato dal frontend per aggirare il directory boundary
    // di Vercel: api/events/[eventId]/ impedisce al catch-all di ricevere PUT /api/events/:id
    const updateEventAliasMatch = pathStr.match(/^event\/([^/?]+)$/)
    if (req.method === 'PUT' && updateEventAliasMatch) {
      return await handleUpdateEvent(updateEventAliasMatch[1], req, res)
    }

    const guestViewMatch = pathStr.match(/^events\/guest\/([^/?]+)\/view$/)
    if (req.method === 'POST' && guestViewMatch) return await handleTrackLinkView(guestViewMatch[1], req, res)

    // Gifts
    const giftsMatch = pathStr.match(/^events\/([^/?]+)\/gifts$/)
    if (req.method === 'POST' && giftsMatch) return await handleAddGift(giftsMatch[1], req, res)

    const giftOrderMatch = pathStr.match(/^events\/([^/?]+)\/gifts\/order$/)
    if (req.method === 'PUT' && giftOrderMatch) return await handleReorderGifts(giftOrderMatch[1], req, res)

    const giftReserveMatch = pathStr.match(/^gifts\/([^/?]+)\/reserve$/)
    if (req.method === 'POST'   && giftReserveMatch) return await handleReserveGift(giftReserveMatch[1], req, res)
    if (req.method === 'DELETE' && giftReserveMatch) return await handleCancelReservation(giftReserveMatch[1], req, res)

    const giftMatch = pathStr.match(/^gifts\/([^/?]+)$/)
    if (req.method === 'PUT'    && giftMatch) return await handleUpdateGift(giftMatch[1], req, res)
    if (req.method === 'DELETE' && giftMatch) return await handleDeleteGift(giftMatch[1], req, res)

    // RSVP
    const rsvpSubmitMatch = pathStr.match(/^events\/([^/?]+)\/rsvp$/)
    if (req.method === 'POST' && rsvpSubmitMatch) return await handleSubmitRsvp(rsvpSubmitMatch[1], req, res)

    const rsvpUpdateMatch = pathStr.match(/^rsvp\/([^/?]+)$/)
    if (req.method === 'PUT' && rsvpUpdateMatch) return await handleUpdateRsvp(rsvpUpdateMatch[1], req, res)

    // Contributions
    const contributionConfirmMatch = pathStr.match(/^events\/([^/?]+)\/contributions\/([^/?]+)\/confirm$/)
    if (req.method === 'PATCH' && contributionConfirmMatch) {
      return await handleConfirmContribution(contributionConfirmMatch[1], contributionConfirmMatch[2], req, res)
    }
    const contributionUpdateMatch = pathStr.match(/^events\/([^/?]+)\/contributions\/([^/?]+)$/)
    if (req.method === 'PUT' && contributionUpdateMatch) {
      return await handleUpdateContribution(contributionUpdateMatch[1], contributionUpdateMatch[2], req, res)
    }

    // User keys
    if (pathStr.startsWith('user-keys')) {
      const handled = await handleUserKeys(pathStr, req, res)
      if (handled !== null) return
    }

  } catch (err) {
    console.error('[proxy:direct]', err)
    return res.status(500).json({ message: 'Errore interno: ' + err.message })
  }

  // ── Fallback: payments and push notifications still go to Railway ─────────
  const queryStr = parsedUrl.search
  const targetUrl = `https://wishly-production.up.railway.app/api/${pathStr}${queryStr}`
  console.log(`[proxy] → Railway ${targetUrl}`)

  const forwardHeaders = {
    'Origin': 'https://www.pikyapp.it',
    'Referer': 'https://www.pikyapp.it/',
  }
  if (req.headers['content-type']) forwardHeaders['Content-Type'] = req.headers['content-type']
  if (req.headers.authorization)   forwardHeaders['Authorization'] = req.headers.authorization
  if (req.headers['user-agent'])   forwardHeaders['User-Agent']    = req.headers['user-agent']
  if (req.headers['accept'])       forwardHeaders['Accept']        = req.headers['accept']

  const fetchOptions = { method: req.method, headers: forwardHeaders }
  if (!['GET', 'HEAD'].includes(req.method) && req.body !== undefined) {
    fetchOptions.body = JSON.stringify(req.body)
    if (!forwardHeaders['Content-Type']) forwardHeaders['Content-Type'] = 'application/json'
  }

  try {
    const upstream = await fetch(targetUrl, fetchOptions)
    const ct = upstream.headers.get('content-type') || 'application/json'
    res.setHeader('Content-Type', ct)
    res.status(upstream.status)
    const text = await upstream.text()
    if (upstream.status >= 400) {
      let body = {}
      try { body = JSON.parse(text) } catch { body = { raw: text } }
      body.message = `[${upstream.status} path=${pathStr}] ${body.message || text.slice(0, 60)}`
      return res.json(body)
    }
    if (!ct.includes('application/json')) {
      return res.status(502).json({ message: `[502] Risposta non-JSON: ${text.slice(0, 80)}` })
    }
    try { res.json(JSON.parse(text)) } catch {
      res.status(502).json({ message: `[502] JSON non valido: ${text.slice(0, 80)}` })
    }
  } catch (err) {
    res.status(502).json({ message: 'Proxy error: ' + err.message })
  }
}

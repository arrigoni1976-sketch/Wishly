// Dedicated Vercel function for /api/gifts/:giftId (PUT, DELETE)
// and /api/gifts/:giftId/reserve (POST, DELETE)

import { createClient } from '@supabase/supabase-js'

function parsePrice(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseFloat(String(val).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(204).end()

  const { giftId } = req.query
  if (!giftId) return res.status(400).json({ message: 'giftId mancante' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ message: 'Supabase env vars missing' })

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const isReserve = req.url?.includes('/reserve')

  // ─── POST /api/gifts/:giftId/reserve ──────────────────────────────────────
  if (isReserve && req.method === 'POST') {
    const { guestName: rawName, partnerName, purchasedOffline } = req.body || {}
    const guestName = (rawName || '').trim()
    if (!guestName) return res.status(400).json({ message: 'guestName obbligatorio' })

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
    console.log(`[gift] reserved giftId=${giftId} by=${guestName}`)
    return res.status(200).json(data)
  }

  // ─── DELETE /api/gifts/:giftId/reserve ────────────────────────────────────
  if (isReserve && req.method === 'DELETE') {
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
    console.log(`[gift] reservation cancelled giftId=${giftId}`)
    return res.status(200).json({ ok: true })
  }

  // ─── PUT /api/gifts/:giftId ───────────────────────────────────────────────
  if (req.method === 'PUT') {
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
    console.log(`[gift] updated giftId=${giftId}`)
    return res.status(200).json(data)
  }

  // ─── DELETE /api/gifts/:giftId ────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { parentToken } = req.body || {}

    const { data: gift } = await db.from('gifts').select('event_id').eq('id', giftId).single()
    if (!gift) return res.status(404).json({ message: 'Regalo non trovato' })

    const { data: ev } = await db.from('events').select('id').eq('id', gift.event_id).eq('parent_token', parentToken).single()
    if (!ev) return res.status(403).json({ message: 'Non autorizzato' })

    const { error } = await db.from('gifts').delete().eq('id', giftId)
    if (error) return res.status(500).json({ message: error.message })
    console.log(`[gift] deleted giftId=${giftId}`)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ message: 'Method not allowed' })
}

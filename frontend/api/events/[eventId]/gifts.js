// Dedicated Vercel function for POST /api/events/:eventId/gifts
// and PUT /api/events/:eventId/gifts/order

import { createClient } from '@supabase/supabase-js'

function parsePrice(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseFloat(String(val).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(204).end()

  const { eventId } = req.query
  if (!eventId) return res.status(400).json({ message: 'eventId mancante' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ message: 'Supabase env vars missing' })

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // POST /api/events/:eventId/gifts — add gift
  if (req.method === 'POST') {
    const { name, description, price, amazonUrl, storeUrl, parentToken } = req.body || {}
    if (!name) return res.status(400).json({ message: 'name obbligatorio' })

    const { data: ev } = await db.from('events').select('id')
      .eq('id', eventId).eq('parent_token', parentToken).single()
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

  // PUT /api/events/:eventId/gifts/order — reorder gifts
  // Note: this also handles the /order sub-path via query param routing
  if (req.method === 'PUT') {
    const { order, parentToken } = req.body || {}
    if (!Array.isArray(order)) return res.status(400).json({ message: 'order deve essere un array' })

    const { data: ev } = await db.from('events').select('id')
      .eq('id', eventId).eq('parent_token', parentToken).single()
    if (!ev) return res.status(403).json({ message: 'Non autorizzato' })

    await Promise.all(order.map((giftId, idx) =>
      db.from('gifts').update({ sort_order: idx }).eq('id', giftId).eq('event_id', eventId)
    ))
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ message: 'Method not allowed' })
}

// Dedicated Vercel function for PUT /api/events/:eventId/gifts/order

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' })

  const { eventId } = req.query
  if (!eventId) return res.status(400).json({ message: 'eventId mancante' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ message: 'Supabase env vars missing' })

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

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

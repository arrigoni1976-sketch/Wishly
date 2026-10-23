// Dedicated Vercel function for PATCH /api/events/:eventId/contributions/:cid/confirm

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'PATCH') return res.status(405).json({ message: 'Method not allowed' })

  const { eventId, cid } = req.query
  if (!eventId || !cid) return res.status(400).json({ message: 'eventId e cid mancanti' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ message: 'Supabase env vars missing' })

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { parentToken } = req.body || {}
  const { data: ev } = await db.from('events').select('id')
    .eq('id', eventId).eq('parent_token', parentToken).single()
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
    await db.rpc('increment_collective_amount', {
      p_event_id: eventId, p_amount: -parseFloat(contribution.amount),
    }).catch(() => {})
    return res.status(500).json({ message: error.message })
  }
  return res.status(200).json({ ok: true })
}

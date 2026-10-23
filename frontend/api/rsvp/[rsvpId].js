// Dedicated Vercel function for PUT /api/rsvp/:rsvpId

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

  const { rsvpId } = req.query
  if (!rsvpId) return res.status(400).json({ message: 'rsvpId mancante' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ message: 'Supabase env vars missing' })

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { status, childrenCount, adultsCount, guestName, parentName, guestToken } = req.body || {}

  if (!status || !['yes', 'maybe', 'no'].includes(status)) {
    return res.status(400).json({ message: 'Status non valido' })
  }
  if (!guestToken) return res.status(400).json({ message: 'guestToken obbligatorio' })

  const { data: rsvp } = await db.from('rsvp').select('id, event_id').eq('id', rsvpId).single()
  if (!rsvp) return res.status(404).json({ message: 'RSVP non trovato' })

  const { data: ev } = await db.from('events').select('id')
    .eq('id', rsvp.event_id).eq('guest_token', guestToken).single()
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

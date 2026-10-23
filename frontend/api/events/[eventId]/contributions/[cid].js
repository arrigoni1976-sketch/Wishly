// Dedicated Vercel function for PUT /api/events/:eventId/contributions/:cid

import { createClient } from '@supabase/supabase-js'

function parsePrice(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseFloat(String(val).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' })

  const { eventId, cid } = req.query
  if (!eventId || !cid) return res.status(400).json({ message: 'eventId e cid mancanti' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ message: 'Supabase env vars missing' })

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { contributorName, collectiveToken, editToken } = req.body || {}
  const newAmount = parseFloat(req.body?.amount)

  if (!contributorName || !Number.isFinite(newAmount)) return res.status(400).json({ message: 'Dati mancanti' })
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

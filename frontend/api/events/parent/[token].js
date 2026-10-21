// Dedicated Vercel function for GET /api/events/parent/:token
// Avoids catch-all routing ambiguity with api/[...path].js for GET requests.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })

  const token = req.query.token
  if (!token) return res.status(400).json({ message: 'Token mancante' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ message: 'Supabase env vars missing' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let event, error
  ;({ data: event, error } = await supabase
    .from('events')
    .select('*, gifts(*), rsvp(*), link_views(*), contributions(*)')
    .eq('parent_token', token)
    .single())

  if (error) {
    console.warn('[parent-token] full select failed, trying simple:', error.code, error.message)
    ;({ data: event, error } = await supabase
      .from('events')
      .select('*, gifts(*)')
      .eq('parent_token', token)
      .single())
  }

  if (error || !event) {
    const detail = error ? `${error.code}: ${error.message}` : 'null result'
    console.error('[parent-token] not found:', detail, 'tok:', token?.slice(0, 8))
    return res.status(404).json({ message: `Evento non trovato [${detail}] tok=${token?.slice(0, 8)}` })
  }

  if (event.gifts) event.gifts.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  console.log(`[parent-token] ok eventId=${event.id} tok=${token.slice(0, 8)}…`)
  return res.status(200).json(event)
}

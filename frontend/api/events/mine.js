// Dedicated Vercel function for GET /api/events/mine
// Bypasses Railway; queries Supabase directly with the user's JWT.

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

  const authHeader = req.headers.authorization || ''
  const userJwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!userJwt) return res.status(401).json({ message: 'Sessione non valida' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return res.status(500).json({ message: 'Supabase env vars missing' })
  }

  const supabase = createClient(supabaseUrl, anonKey)
  const { data: { user }, error: authErr } = await supabase.auth.getUser(userJwt)
  if (authErr || !user) return res.status(401).json({ message: 'Sessione non valida' })

  const adminSupabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: events, error } = await adminSupabase
    .from('events')
    .select('*, gifts(*)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[mine] error:', error.message)
    return res.status(500).json({ message: error.message })
  }

  if (events) {
    for (const ev of events) {
      if (ev.gifts) ev.gifts.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }
  }

  console.log(`[mine] ok userId=${user.id} count=${events?.length}`)
  return res.status(200).json(events || [])
}

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) throw new Error('Supabase env vars missing')
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const db = getSupabase()
  const body = req.body || {}
  const { eventId, parentToken } = body
  if (!eventId) return res.status(400).json({ message: 'eventId mancante' })
  if (!parentToken) return res.status(400).json({ message: 'parentToken obbligatorio' })

  const { data: ev } = await db.from('events').select('id')
    .eq('id', eventId).eq('parent_token', parentToken).single()
  if (!ev) return res.status(403).json({ message: 'Non autorizzato' })

  const allowed = [
    'child_name', 'gender', 'party_date', 'party_time', 'location', 'address', 'notes',
    'closing_date', 'collective_enabled', 'collective_goal', 'collective_description',
    'collective_fixed_quota', 'paypal_email',
  ]
  const update = {}
  for (const k of allowed) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    if (body[k] !== undefined) update[k] = body[k]
    else if (body[camel] !== undefined) update[k] = body[camel]
  }

  const { data, error } = await db.from('events').update(update).eq('id', eventId).select().single()
  if (error) return res.status(500).json({ message: error.message })
  return res.status(200).json(data)
}

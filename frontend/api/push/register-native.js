// POST /api/push/register-native
// Saves FCM/APNs device token linked to an event's parentToken

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { token, platform, parentToken } = req.body || {}
  if (!token || !platform || !parentToken) {
    return res.status(400).json({ message: 'token, platform e parentToken obbligatori' })
  }

  const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: event } = await db.from('events').select('id').eq('parent_token', parentToken).maybeSingle()
  if (!event) return res.status(403).json({ message: 'Non autorizzato' })

  const { error } = await db.from('device_tokens').upsert(
    { event_id: event.id, token, platform, updated_at: new Date().toISOString() },
    { onConflict: 'token' }
  )

  if (error) return res.status(500).json({ message: error.message })
  return res.status(200).json({ ok: true })
}

// Dedicated Vercel function for POST /api/events/:eventId/contributions
// Bypasses Railway; writes contribution directly to Supabase.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })

  const { eventId } = req.query
  if (!eventId) return res.status(400).json({ message: 'eventId mancante' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ message: 'Supabase env vars missing' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ message: error.message })
    return res.status(200).json(data || [])
  }

  // POST: create contribution
  const { contributorName, amount, paymentMethod, idempotencyKey } = req.body || {}

  if (!contributorName || !amount || !paymentMethod) {
    return res.status(400).json({ message: 'contributorName, amount e paymentMethod sono obbligatori' })
  }

  const payload = {
    event_id: eventId,
    contributor_name: contributorName,
    amount: parseFloat(amount),
    payment_method: paymentMethod,
    status: 'pending',
    edit_token: crypto.randomUUID(),
  }
  if (idempotencyKey) payload.idempotency_key = idempotencyKey

  const { data: contribution, error } = await supabase
    .from('contributions')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('[contributions] insert error:', error.code, error.message, error.details)
    return res.status(500).json({ message: error.message, code: error.code, details: error.details })
  }

  // Update collective_amount on the event
  await supabase.rpc('increment_collective_amount', {
    p_event_id: eventId,
    p_amount: parseFloat(amount),
  }).catch(() => {
    // rpc may not exist; ignore, a DB trigger may handle it
  })

  console.log(`[contributions] ok eventId=${eventId} amount=${amount} method=${paymentMethod}`)
  return res.status(201).json(contribution)
}

// Dedicated Vercel function for POST/GET /api/events/:eventId/contributions
// Bypasses Railway; writes contribution directly to Supabase.

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

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
  const { contributorName, paymentMethod, collectiveToken, idempotencyKey } = req.body || {}
  const amount = parseFloat(req.body?.amount)

  if (!contributorName || !paymentMethod) {
    return res.status(400).json({ message: 'Dati mancanti' })
  }
  if (!Number.isFinite(amount) || amount < 10) {
    return res.status(400).json({ message: 'Importo minimo €10' })
  }

  // Verify collectiveToken matches the event
  const { data: event } = await supabase
    .from('events')
    .select('id, collective_goal, collective_amount')
    .eq('id', eventId)
    .eq('collective_token', collectiveToken)
    .single()

  if (!event) return res.status(403).json({ message: 'Token non valido' })

  // Idempotency check — return existing if already processed
  if (idempotencyKey) {
    const { data: dup } = await supabase
      .from('contributions')
      .select('*')
      .eq('event_id', eventId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    if (dup) {
      console.log(`[contributions] idempotent hit eventId=${eventId}`)
      return res.status(200).json(dup)
    }
  }

  // contanti and satispay are immediate — increment collective_amount atomically first
  const isImmediate = paymentMethod !== 'paypal'

  if (isImmediate) {
    const { data: newTotal, error: incError } = await supabase.rpc('increment_collective_amount', {
      p_event_id: eventId,
      p_amount: amount,
    })
    if (incError) {
      console.error('[contributions] rpc error:', incError.message)
      return res.status(500).json({ message: incError.message })
    }
    if (newTotal === null) {
      return res.status(409).json({ message: 'Obiettivo raggiunto, riprova con un importo più basso' })
    }
  }

  const { data: contribution, error } = await supabase
    .from('contributions')
    .insert({
      event_id: eventId,
      contributor_name: contributorName,
      amount,
      payment_method: paymentMethod,
      status: isImmediate ? 'completed' : 'pending',
      idempotency_key: idempotencyKey || null,
      edit_token: randomUUID(),
    })
    .select()
    .single()

  if (error) {
    // If insert failed and we already incremented, reverse it
    if (isImmediate) {
      await supabase.rpc('increment_collective_amount', { p_event_id: eventId, p_amount: -amount }).catch(() => {})
    }
    // Idempotency race: another request created the same row
    if (error.code === '23505' && idempotencyKey) {
      const { data: existing } = await supabase
        .from('contributions')
        .select('*')
        .eq('event_id', eventId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (existing) return res.status(200).json(existing)
    }
    console.error('[contributions] insert error:', error.code, error.message)
    return res.status(500).json({ message: error.message, code: error.code })
  }

  console.log(`[contributions] ok eventId=${eventId} amount=${amount} method=${paymentMethod} status=${contribution.status}`)
  return res.status(201).json(contribution)
}

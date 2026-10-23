// Dedicated Vercel function for POST /api/events/:eventId/rsvp
// Bypasses Railway; reads/writes RSVP directly to Supabase.

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

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // GET: list all RSVPs for an event
  if (req.method === 'GET') {
    const { data, error } = await db.from('rsvp').select('*')
      .eq('event_id', eventId).order('created_at', { ascending: false })
    if (error) return res.status(500).json({ message: error.message })
    return res.status(200).json(data || [])
  }

  // POST: create or update RSVP
  const { status, childrenCount, adultsCount, idempotencyKey } = req.body || {}
  const guestName = (req.body?.guestName || '').trim()
  const parentName = (req.body?.parentName || '').trim() || null

  if (!guestName || !status) return res.status(400).json({ message: 'guestName e status obbligatori' })
  if (!['yes', 'maybe', 'no'].includes(status)) return res.status(400).json({ message: 'Status non valido' })

  // Check for existing RSVP (case-insensitive) — update instead of insert
  const { data: existing } = await db.from('rsvp').select('*')
    .eq('event_id', eventId).ilike('guest_name', guestName).maybeSingle()

  if (existing) {
    // Same idempotency key → return cached
    if (idempotencyKey && existing.idempotency_key === idempotencyKey) {
      return res.status(200).json(existing)
    }
    const { data, error } = await db.from('rsvp').update({
      status,
      guest_name: guestName,
      parent_name: parentName !== null ? parentName : existing.parent_name,
      children_count: childrenCount ?? 0,
      adults_count: adultsCount ?? 1,
      updated_at: new Date().toISOString(),
      idempotency_key: idempotencyKey || null,
    }).eq('id', existing.id).select().single()
    if (error) return res.status(500).json({ message: error.message })
    return res.status(200).json(data)
  }

  // No existing row — insert new RSVP
  const { data, error } = await db.from('rsvp').insert({
    event_id: eventId,
    guest_name: guestName,
    parent_name: parentName,
    status,
    children_count: childrenCount ?? 0,
    adults_count: adultsCount ?? 1,
    idempotency_key: idempotencyKey || null,
  }).select().single()

  if (error) {
    // Unique constraint race: another request created the row concurrently
    if (error.code === '23505') {
      if (idempotencyKey) {
        const { data: dup } = await db.from('rsvp').select('*')
          .eq('event_id', eventId).eq('idempotency_key', idempotencyKey).maybeSingle()
        if (dup) return res.status(200).json(dup)
      }
      // Fall back to update the row that beat us to it
      const { data: race, error: raceErr } = await db.from('rsvp').update({
        status, children_count: childrenCount ?? 0, adults_count: adultsCount ?? 1,
        updated_at: new Date().toISOString(), idempotency_key: idempotencyKey || null,
      }).eq('event_id', eventId).ilike('guest_name', guestName).select().single()
      if (raceErr) return res.status(500).json({ message: raceErr.message })
      return res.status(200).json(race)
    }
    console.error('[rsvp] insert error:', error.code, error.message)
    return res.status(500).json({ message: error.message, code: error.code })
  }

  console.log(`[rsvp] ok eventId=${eventId} guest=${guestName} status=${status}`)
  return res.status(201).json(data)
}

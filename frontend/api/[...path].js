// Vercel serverless proxy — forwards /api/* to Railway without the Capacitor origin header.
// EXCEPTION: POST /api/events and GET /api/events/parent/:token are handled directly via
// Supabase PostgREST to work around the Railway deployment that silently ignores DB errors.

import { createClient } from '@supabase/supabase-js'

function parsePrice(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseFloat(String(val).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// ─── POST /api/events handled directly via Supabase PostgREST ───────────────
async function handleCreateEvent(req, res) {
  const authHeader = req.headers.authorization || ''
  const userJwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!userJwt) return res.status(401).json({ message: 'Sessione non valida' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ message: 'Supabase env vars missing' })
  }

  // Verify JWT with anon client, then use service key for DB operations (bypasses RLS)
  const supabase = createClient(supabaseUrl, anonKey)
  const { data: { user }, error: authErr } = await supabase.auth.getUser(userJwt)
  if (authErr || !user) return res.status(401).json({ message: 'Sessione non valida' })

  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!serviceKey) return res.status(500).json({ message: 'SUPABASE_SERVICE_KEY non configurata' })

  // Admin client with service key bypasses RLS; user identity already verified above
  const adminSupabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const {
    childName, partyDate, partyTime, location, address, notes,
    parentEmail, closingDate, gender,
    collectiveEnabled, collectiveGoal, collectiveDescription, paypalEmail, collectiveFixedQuota,
    gifts = [],
    referralSource, utmSource, utmMedium, utmCampaign,
  } = req.body || {}

  if (!childName || !partyDate || !parentEmail) {
    return res.status(400).json({ message: 'childName, partyDate e parentEmail sono obbligatori' })
  }

  const parentToken = crypto.randomUUID()
  const guestToken = crypto.randomUUID()
  const collectiveToken = crypto.randomUUID()

  // Use raw PostgREST HTTP call so we control exactly which headers are sent.
  // apikey = anon key (authenticates to Supabase API gateway)
  // Authorization = user JWT (evaluated by RLS: auth.uid() = owner_id)
  const eventPayload = {
    child_name: childName,
    gender: gender || null,
    party_date: partyDate,
    party_time: partyTime || null,
    location: location || null,
    address: address || null,
    notes: notes || null,
    parent_email: parentEmail,
    closing_date: closingDate || null,
    parent_token: parentToken,
    guest_token: guestToken,
    collective_token: collectiveToken,
    collective_enabled: !!collectiveEnabled,
    collective_goal: collectiveEnabled ? parseFloat(collectiveGoal) : null,
    collective_description: collectiveDescription || null,
    collective_amount: 0,
    paypal_email: collectiveEnabled && paypalEmail ? paypalEmail : null,
    collective_fixed_quota: collectiveEnabled && collectiveFixedQuota ? parseFloat(collectiveFixedQuota) : null,
    referral_source: referralSource || null,
    utm_source: utmSource || null,
    utm_medium: utmMedium || null,
    utm_campaign: utmCampaign || null,
    owner_id: user.id,
  }

  const { data: event, error: eventError } = await adminSupabase
    .from('events')
    .insert(eventPayload)
    .select()
    .single()

  if (eventError) {
    console.error('[proxy:createEvent] insert error:', eventError)
    return res.status(500).json({ message: `Errore creazione evento: ${eventError.message}` })
  }

  // Insert gifts if provided
  if (Array.isArray(gifts) && gifts.length > 0) {
    const giftsPayload = gifts.map((g, i) => ({
      event_id: event.id,
      name: g.name,
      description: g.description || null,
      price: parsePrice(g.price),
      amazon_url: g.amazonUrl || null,
      store_url: g.storeUrl || null,
      sort_order: i,
    }))
    const { error: giftsError } = await adminSupabase.from('gifts').insert(giftsPayload)
    if (giftsError) console.error('[proxy:createEvent] gifts insert error:', giftsError.message)
  }

  console.log(`[proxy:createEvent] ok eventId=${event.id} parentToken=${parentToken.slice(0, 8)}…`)
  return res.status(201).json({
    id: event.id,
    parentToken,
    guestToken,
    collectiveToken: collectiveEnabled ? collectiveToken : null,
  })
}

// ─── GET /api/events/parent/:token handled directly via Supabase ─────────────
async function handleGetEventByParentToken(token, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ message: 'Supabase env vars missing' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Try full select first; fall back to simple select if joins fail (e.g. missing table)
  let event, error
  ;({ data: event, error } = await supabase
    .from('events')
    .select('*, gifts(*), rsvp(*), link_views(*), contributions(*)')
    .eq('parent_token', token)
    .single())

  if (error) {
    console.warn('[proxy:getEvent] full select failed, trying simple:', error.code, error.message)
    ;({ data: event, error } = await supabase
      .from('events')
      .select('*, gifts(*)')
      .eq('parent_token', token)
      .single())
  }

  if (error || !event) {
    const detail = error ? `${error.code}: ${error.message}` : 'null result'
    console.error('[proxy:getEvent] not found or error:', detail, 'token:', token?.slice(0, 8))
    return res.status(404).json({ message: `Evento non trovato [${detail}] tok=${token?.slice(0, 8)}` })
  }

  if (event.gifts) event.gifts.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  return res.status(200).json(event)
}

export default async function handler(req, res) {
  const parsedUrl = new URL(req.url, 'https://x.invalid')
  const pathStr = parsedUrl.pathname.replace(/^\/api\/?/, '')
  const queryStr = parsedUrl.search

  console.log(`[proxy] ${req.method} ${req.url} pathStr=${pathStr}`)

  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  // ── Direct Supabase handlers ─────────────────────────────────────────────────
  try {
    if (req.method === 'POST' && pathStr === 'events') {
      return await handleCreateEvent(req, res)
    }
    const parentMatch = pathStr.match(/^events\/parent\/([^/?]+)$/)
    if (req.method === 'GET' && parentMatch) {
      return await handleGetEventByParentToken(parentMatch[1], res)
    }
  } catch (err) {
    console.error('[proxy:direct]', err)
    return res.status(500).json({ message: 'Errore interno: ' + err.message })
  }

  // ── All other paths: proxy to Railway ────────────────────────────────────────
  const targetUrl = `https://wishly-production.up.railway.app/api/${pathStr}${queryStr}`
  console.log(`[proxy] → Railway ${targetUrl}`)

  const forwardHeaders = {
    'Origin': 'https://www.pikyapp.it',
    'Referer': 'https://www.pikyapp.it/',
  }
  if (req.headers['content-type']) forwardHeaders['Content-Type'] = req.headers['content-type']
  if (req.headers.authorization)   forwardHeaders['Authorization'] = req.headers.authorization
  if (req.headers['user-agent'])   forwardHeaders['User-Agent']    = req.headers['user-agent']
  if (req.headers['accept'])       forwardHeaders['Accept']        = req.headers['accept']

  const fetchOptions = { method: req.method, headers: forwardHeaders }
  if (!['GET', 'HEAD'].includes(req.method) && req.body !== undefined) {
    fetchOptions.body = JSON.stringify(req.body)
    if (!forwardHeaders['Content-Type']) forwardHeaders['Content-Type'] = 'application/json'
  }

  try {
    const upstream = await fetch(targetUrl, fetchOptions)
    const ct = upstream.headers.get('content-type') || 'application/json'
    res.setHeader('Content-Type', ct)
    res.status(upstream.status)
    const text = await upstream.text()
    console.log(`[proxy] ${req.method} ${pathStr} → ${upstream.status} ct=${ct} body=${text.slice(0, 200)}`)
    if (upstream.status >= 400) {
      let body = {}
      try { body = JSON.parse(text) } catch { body = { raw: text } }
      body.message = `[${upstream.status} path=${pathStr}] ${body.message || text.slice(0, 60)}`
      res.json(body)
      return
    }
    const isJson = ct.includes('application/json')
    if (!isJson) {
      res.status(502).json({
        message: `[502 path=${pathStr}] Risposta non-JSON dal server: ct=${ct} body=${text.slice(0, 80)}`,
      })
      return
    }
    try {
      res.json(JSON.parse(text))
    } catch {
      res.status(502).json({ message: `[502 path=${pathStr}] JSON non valido: ${text.slice(0, 80)}` })
    }
  } catch (err) {
    res.status(502).json({ message: 'Proxy error: ' + err.message, cause: String(err.cause || ''), _url: targetUrl })
  }
}

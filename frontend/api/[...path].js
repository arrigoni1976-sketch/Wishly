// Vercel serverless proxy — forwards /api/* to Railway without the Capacitor origin header,
// so the old CORS config on Railway (which doesn't know about capacitor://localhost) still works.
// EXCEPTION: POST /api/events and GET /api/events/parent/:token are handled directly via
// Supabase to work around the Railway deployment that silently ignores DB errors.
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

function parsePrice(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseFloat(String(val).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// ─── POST /api/events handled directly via Supabase ─────────────────────────
async function handleCreateEvent(req, res) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return res.status(401).json({ message: 'Sessione non valida' })

  const supabase = getSupabase()

  // Authenticate via Supabase JWT
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ message: 'Sessione non valida' })

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

  // Insert event using user JWT (Supabase RLS will see user.id = auth.uid())
  const userSupabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: event, error: eventError } = await userSupabase
    .from('events')
    .insert({
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
    })
    .select()
    .single()

  if (eventError) {
    console.error('[proxy:createEvent] insert error:', eventError)
    return res.status(500).json({ message: `Errore creazione evento: ${eventError.message}` })
  }

  // Insert gifts if provided
  if (Array.isArray(gifts) && gifts.length > 0) {
    const giftsToInsert = gifts.map((g, i) => ({
      event_id: event.id,
      name: g.name,
      description: g.description || null,
      price: parsePrice(g.price),
      amazon_url: g.amazonUrl || null,
      store_url: g.storeUrl || null,
      sort_order: i,
    }))
    const { error: giftsError } = await userSupabase.from('gifts').insert(giftsToInsert)
    if (giftsError) {
      console.error('[proxy:createEvent] gifts insert error:', giftsError)
      // Non bloccare la risposta — l'evento è stato creato
    }
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
  const supabase = getSupabase()
  const { data: event, error } = await supabase
    .from('events')
    .select(`*, gifts(*), rsvp(*), link_views(*), contributions(*)`)
    .eq('parent_token', token)
    .single()

  if (error || !event) return res.status(404).json({ message: 'Evento non trovato' })

  if (event.gifts) event.gifts.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  return res.status(200).json(event)
}

export default async function handler(req, res) {
  // Parse path from req.url directly — req.query.path is unreliable in Vercel catch-all
  const parsedUrl = new URL(req.url, 'https://x.invalid')
  const pathStr = parsedUrl.pathname.replace(/^\/api\/?/, '')
  const queryStr = parsedUrl.search  // '' or '?...'

  console.log(`[proxy] ${req.method} ${req.url} pathStr=${pathStr}`)

  // CORS headers so the Capacitor WKWebView accepts the response
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

  // ── Direct Supabase handlers (bypass broken Railway deployment) ──────────────
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
    } catch (parseErr) {
      res.status(502).json({
        message: `[502 path=${pathStr}] JSON non valido: ${text.slice(0, 80)}`,
      })
    }
  } catch (err) {
    res.status(502).json({ message: 'Proxy error: ' + err.message, cause: String(err.cause || ''), _url: targetUrl })
  }
}

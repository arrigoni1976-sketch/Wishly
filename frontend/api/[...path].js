// Vercel serverless proxy — forwards /api/* to Railway without the Capacitor origin header,
// so the old CORS config on Railway (which doesn't know about capacitor://localhost) still works.
export default async function handler(req, res) {
  // Parse path from req.url directly — req.query.path is unreliable in Vercel catch-all
  const parsedUrl = new URL(req.url, 'https://x.invalid')
  const pathStr = parsedUrl.pathname.replace(/^\/api\/?/, '')
  const queryStr = parsedUrl.search  // '' or '?...'
  const targetUrl = `https://wishly-production.up.railway.app/api/${pathStr}${queryStr}`
  console.log(`[proxy] ${req.method} ${req.url} → ${targetUrl}`)

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
    if (upstream.status >= 400) {
      let body = {}
      try { body = JSON.parse(text) } catch { body = { raw: text } }
      // Override message to include debug info — visible even in old iOS error handler
      body.message = `[${upstream.status} path=${pathStr}] ${body.message || text.slice(0, 60)}`
      res.json(body)
      return
    }
    res.send(text)
  } catch (err) {
    res.status(502).json({ message: 'Proxy error: ' + err.message, cause: String(err.cause || ''), _url: targetUrl })
  }
}

// Vercel serverless proxy — forwards /api/* to Railway without the Capacitor origin header,
// so the old CORS config on Railway (which doesn't know about capacitor://localhost) still works.
export default async function handler(req, res) {
  const segments = req.query.path || []
  const pathStr = Array.isArray(segments) ? segments.join('/') : segments
  const queryStr = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const targetUrl = `https://api.pikyapp.it/api/${pathStr}${queryStr}`

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
      res.json({ ...body, _url: targetUrl, _path: pathStr })
      return
    }
    res.send(text)
  } catch (err) {
    res.status(502).json({ message: 'Proxy error: ' + err.message, cause: String(err.cause || ''), _url: targetUrl })
  }
}

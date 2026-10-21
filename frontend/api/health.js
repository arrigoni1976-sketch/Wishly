export default async function handler(req, res) {
  const tests = []

  const base = 'https://wishly-production.up.railway.app'
  const calls = [
    { method: 'GET',  path: '/api/events/mine' },
    { method: 'POST', path: '/api/events' },
    { method: 'POST', path: '/api/events/' },
  ]
  for (const { method, path } of calls) {
    const url = base + path
    try {
      const r = await fetch(url, {
        method,
        headers: {
          'Authorization': 'Bearer test',
          'Origin': 'https://www.pikyapp.it',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        body: method !== 'GET' ? JSON.stringify({ test: true }) : undefined,
        signal: AbortSignal.timeout(8000),
      })
      const text = await r.text()
      tests.push({ method, path, status: r.status, body: text.slice(0, 120) })
    } catch (err) {
      tests.push({
        method, path,
        error: err.message,
        cause: String(err.cause?.message || err.cause?.code || err.cause || ''),
      })
    }
  }

  res.json({ tests, vercel: true })
}

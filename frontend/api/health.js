export default async function handler(req, res) {
  const tests = []

  const base = 'https://wishly-production.up.railway.app'
  // Test POST with minimal payload (expect 400 missing fields, not 401 or 404)
  try {
    const r = await fetch(`${base}/api/events`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test',
        'Origin': 'https://www.pikyapp.it',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ childName: 'Test', partyDate: '2026-12-01', parentEmail: 'test@test.com' }),
      signal: AbortSignal.timeout(8000),
    })
    const text = await r.text()
    tests.push({ test: 'POST /api/events with body', status: r.status, ct: r.headers.get('content-type'), body: text.slice(0, 200) })
  } catch (err) {
    tests.push({ test: 'POST /api/events with body', error: err.message })
  }

  // Test POST without body (expect 401 from requireAuth, or 400 from validation)
  try {
    const r = await fetch(`${base}/api/events`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test',
        'Origin': 'https://www.pikyapp.it',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })
    const text = await r.text()
    tests.push({ test: 'POST /api/events no body', status: r.status, body: text.slice(0, 200) })
  } catch (err) {
    tests.push({ test: 'POST /api/events no body', error: err.message })
  }

  res.json({ tests, vercel: true })
}

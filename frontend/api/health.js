export default async function handler(req, res) {
  const tests = []

  for (const url of [
    'https://api.pikyapp.it/api/events/mine',
    'https://wishly-production.up.railway.app/api/events/mine',
  ]) {
    try {
      const r = await fetch(url, {
        headers: {
          'Authorization': 'Bearer test',
          'Origin': 'https://www.pikyapp.it',
          'User-Agent': 'Mozilla/5.0',
        },
        signal: AbortSignal.timeout(8000),
      })
      tests.push({ url, status: r.status, ok: r.ok })
    } catch (err) {
      tests.push({
        url,
        error: err.message,
        cause: String(err.cause?.message || err.cause?.code || err.cause || ''),
        causeType: err.cause?.constructor?.name,
      })
    }
  }

  res.json({ tests, vercel: true })
}

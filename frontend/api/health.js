import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const tests = []

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  tests.push({
    test: 'env vars',
    supabaseUrl: supabaseUrl ? supabaseUrl.slice(0, 30) + '…' : 'MISSING',
    serviceKey: serviceKey ? serviceKey.slice(0, 12) + '…' : 'MISSING',
  })

  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Test: count all events
    try {
      const { count, error } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
      tests.push({ test: 'SELECT count(events)', count, error: error?.message })
    } catch (err) {
      tests.push({ test: 'SELECT count(events)', error: err.message })
    }

    // Test: get most recent 2 events with parent_token
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, child_name, parent_token, created_at')
        .order('created_at', { ascending: false })
        .limit(2)
      tests.push({
        test: 'SELECT recent events',
        error: error?.message,
        data: data?.map(e => ({
          child: e.child_name,
          tok: e.parent_token?.slice(0, 8),
          at: e.created_at,
        })),
      })
    } catch (err) {
      tests.push({ test: 'SELECT recent events', error: err.message })
    }

    // Test: full join query for the most recent event's parent_token
    try {
      const { data: latest } = await supabase
        .from('events')
        .select('parent_token')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latest?.parent_token) {
        const { data: full, error } = await supabase
          .from('events')
          .select('*, gifts(*), rsvp(*), link_views(*), contributions(*)')
          .eq('parent_token', latest.parent_token)
          .single()
        tests.push({
          test: 'SELECT full join for latest event',
          token: latest.parent_token.slice(0, 8),
          found: !!full,
          error: error?.message,
          giftCount: full?.gifts?.length,
        })
      }
    } catch (err) {
      tests.push({ test: 'SELECT full join for latest event', error: err.message })
    }
  }

  res.json({ tests, vercel: true, ts: new Date().toISOString() })
}

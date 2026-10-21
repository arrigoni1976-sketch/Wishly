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

    // Test: get most recent 2 events with FULL parent_token (for manual testing)
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
          parent_token: e.parent_token,
          at: e.created_at,
          get_url: `/api/events/parent/${e.parent_token}`,
        })),
      })
    } catch (err) {
      tests.push({ test: 'SELECT recent events', error: err.message })
    }

    // Test: round-trip — insert a throwaway event and immediately SELECT it back
    try {
      const testToken = crypto.randomUUID()
      const { data: inserted, error: insErr } = await supabase
        .from('events')
        .insert({
          child_name: '_health_check_',
          party_date: '2099-01-01',
          parent_email: 'health@test.invalid',
          parent_token: testToken,
          guest_token: crypto.randomUUID(),
          collective_token: crypto.randomUUID(),
          collective_enabled: false,
          collective_amount: 0,
        })
        .select('id, parent_token')
        .single()

      if (insErr) {
        tests.push({ test: 'round-trip insert→select', insertError: insErr.message })
      } else {
        const { data: selected, error: selErr } = await supabase
          .from('events')
          .select('id, parent_token')
          .eq('parent_token', testToken)
          .single()

        // Clean up
        if (inserted?.id) await supabase.from('events').delete().eq('id', inserted.id)

        tests.push({
          test: 'round-trip insert→select',
          tokenSent: testToken,
          dbStoredToken: inserted?.parent_token,
          tokensMatch: testToken === inserted?.parent_token,
          selectFound: !!selected,
          selectToken: selected?.parent_token,
          selectError: selErr?.message,
        })
      }
    } catch (err) {
      tests.push({ test: 'round-trip insert→select', error: err.message })
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

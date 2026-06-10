import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/admin/stats?key=XXX
router.get('/stats', async (req, res) => {
// Usa ADMIN_KEY da env, altrimenti chiave di fallback temporanea
  const validKey = process.env.ADMIN_KEY || 'pikyAdmin2026'
  if (req.query.key !== validKey) {
    return res.status(401).json({ message: 'Non autorizzato' })
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: total },
    { count: thisMonth },
    { count: thisWeek },
    { count: withCollective },
    { data: events },
    { data: rsvpRows },
    { data: giftRows },
  ] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('collective_enabled', true),
    supabase.from('events')
      .select('id, child_name, party_date, parent_email, collective_enabled, collective_goal, collective_amount, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('rsvp').select('event_id, status'),
    supabase.from('gifts').select('event_id'),
  ])

  const collectiveEvents = (events || []).filter(e => e.collective_enabled)
  const totalCollectiveGoal = collectiveEvents.reduce((a, e) => a + (parseFloat(e.collective_goal) || 0), 0)
  const totalCollectiveOrganized = collectiveEvents.reduce((a, e) => a + (parseFloat(e.collective_amount) || 0), 0)

  const rsvpMap = {}
  ;(rsvpRows || []).forEach(r => {
    if (!rsvpMap[r.event_id]) rsvpMap[r.event_id] = { yes: 0, total: 0 }
    rsvpMap[r.event_id].total++
    if (r.status === 'yes') rsvpMap[r.event_id].yes++
  })

  const giftsMap = {}
  ;(giftRows || []).forEach(g => { giftsMap[g.event_id] = (giftsMap[g.event_id] || 0) + 1 })

  const byMonth = {}
  ;(events || []).forEach(e => {
    const m = e.created_at.substring(0, 7)
    byMonth[m] = (byMonth[m] || 0) + 1
  })

  const recentEvents = (events || []).slice(0, 50).map(e => ({
    id: e.id,
    child_name: e.child_name,
    party_date: e.party_date,
    parent_email: e.parent_email,
    collective_enabled: e.collective_enabled,
    collective_goal: e.collective_goal,
    collective_amount: e.collective_amount,
    created_at: e.created_at,
    rsvp_yes: rsvpMap[e.id]?.yes || 0,
    rsvp_total: rsvpMap[e.id]?.total || 0,
    gifts_count: giftsMap[e.id] || 0,
  }))

  res.json({
    overview: {
      total: total || 0,
      thisMonth: thisMonth || 0,
      thisWeek: thisWeek || 0,
      withCollective: withCollective || 0,
      totalCollectiveGoal: Math.round(totalCollectiveGoal),
      totalCollectiveOrganized: Math.round(totalCollectiveOrganized),
    },
    recentEvents,
    byMonth: Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).slice(-6),
  })
})

export default router

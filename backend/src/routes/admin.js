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

  const LAUNCH_DATE = process.env.LAUNCH_DATE || '2026-06-20T00:00:00.000Z'
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const eventsBase = () => supabase.from('events').gte('created_at', LAUNCH_DATE)
  const rsvpBase = () => supabase.from('rsvp').gte('created_at', LAUNCH_DATE)
  const giftsBase = () => supabase.from('gifts').gte('created_at', LAUNCH_DATE)
  const viewsBase = () => supabase.from('link_views').gte('created_at', LAUNCH_DATE)
  const userKeyBase = () => supabase.from('user_key_links').gte('created_at', LAUNCH_DATE)

  const [
    { count: total },
    { count: thisMonth },
    { count: thisWeek },
    { count: withCollective },
    { data: events },
    { data: rsvpRows },
    { data: giftRows },
    { data: viewRows },
    { count: rsvpYes },
    { count: giftsReserved },
    { data: userKeyLinks },
  ] = await Promise.all([
    eventsBase().select('*', { count: 'exact', head: true }),
    eventsBase().select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    eventsBase().select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
    eventsBase().select('*', { count: 'exact', head: true }).eq('collective_enabled', true),
    eventsBase()
      .select('id, child_name, party_date, parent_email, collective_enabled, collective_goal, collective_amount, created_at')
      .order('created_at', { ascending: false }),
    rsvpBase().select('event_id, status'),
    giftsBase().select('event_id, reserved_by'),
    viewsBase().select('view_count'),
    rsvpBase().select('*', { count: 'exact', head: true }).eq('status', 'yes'),
    giftsBase().select('*', { count: 'exact', head: true }).not('reserved_by', 'is', null),
    userKeyBase().select('user_key, link_type'),
  ])

  // Collective totals
  const collectiveEvents = (events || []).filter(e => e.collective_enabled)
  const totalCollectiveGoal = collectiveEvents.reduce((a, e) => a + (parseFloat(e.collective_goal) || 0), 0)
  const totalCollectiveOrganized = collectiveEvents.reduce((a, e) => a + (parseFloat(e.collective_amount) || 0), 0)

  // Total link views (sum of all view_count)
  const totalLinkViews = (viewRows || []).reduce((a, v) => a + (v.view_count || 1), 0)

  // Return organizers: user_key con 2+ eventi creati
  const eventLinkCounts = {}
  ;(userKeyLinks || []).filter(l => l.link_type === 'event').forEach(l => {
    eventLinkCounts[l.user_key] = (eventLinkCounts[l.user_key] || 0) + 1
  })
  const returnOrganizers = Object.values(eventLinkCounts).filter(c => c >= 2).length

  // Organizzatori da invito: user_key che ha sia 'invite' che 'event'
  const keyTypes = {}
  ;(userKeyLinks || []).forEach(l => {
    if (!keyTypes[l.user_key]) keyTypes[l.user_key] = new Set()
    keyTypes[l.user_key].add(l.link_type)
  })
  const organizersFromInvite = Object.values(keyTypes)
    .filter(types => types.has('invite') && types.has('event')).length

  // RSVP map per event table
  const rsvpMap = {}
  ;(rsvpRows || []).forEach(r => {
    if (!rsvpMap[r.event_id]) rsvpMap[r.event_id] = { yes: 0, total: 0 }
    rsvpMap[r.event_id].total++
    if (r.status === 'yes') rsvpMap[r.event_id].yes++
  })

  const giftsMap = {}
  ;(giftRows || []).forEach(g => { giftsMap[g.event_id] = (giftsMap[g.event_id] || 0) + 1 })

  // By month (last 6)
  // Monetizzazione: eventi per email (primo gratis, dal secondo €1,29)
  const PRICE_PER_EVENT = 1.29
  const emailCounts = {}
  ;(events || []).forEach(e => {
    const email = e.parent_email?.toLowerCase()
    if (email) emailCounts[email] = (emailCounts[email] || 0) + 1
  })
  const returningUsers = Object.values(emailCounts).filter(c => c >= 2).length
  const additionalEvents = Object.values(emailCounts).reduce((a, c) => a + Math.max(0, c - 1), 0)
  const potentialRevenue = Math.round(additionalEvents * PRICE_PER_EVENT * 100) / 100

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
    funnel: {
      eventsCreated: total || 0,
      linkViews: totalLinkViews,
      rsvpYes: rsvpYes || 0,
      giftsReserved: giftsReserved || 0,
      returnOrganizers,
      organizersFromInvite,
    },
    monetization: {
      paymentActive: false,
      pricePerEvent: PRICE_PER_EVENT,
      returningUsers,
      additionalEvents,
      potentialRevenue,
    },
    recentEvents,
    byMonth: Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).slice(-6),
  })
})

export default router

import { supabase } from '../lib/supabase.js'

// Calcola le statistiche aggregate usate dalla dashboard admin e dal
// resoconto settimanale via email — stessa logica, una sola fonte di verità.
export async function getAdminStats() {
  const LAUNCH_DATE = process.env.LAUNCH_DATE || '2026-06-20T00:00:00.000Z'
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const eventsFrom = () => supabase.from('events')
  const rsvpFrom = () => supabase.from('rsvp')
  const giftsFrom = () => supabase.from('gifts')
  const viewsFrom = () => supabase.from('link_views')
  const userKeyFrom = () => supabase.from('user_key_links')

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
    { data: deviceRows },
    { data: latencyEvents },
    { data: acquisitionRows },
  ] = await Promise.all([
    eventsFrom().select('*', { count: 'exact', head: true }).gte('created_at', LAUNCH_DATE),
    eventsFrom().select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    eventsFrom().select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
    eventsFrom().select('*', { count: 'exact', head: true }).gte('created_at', LAUNCH_DATE).eq('collective_enabled', true),
    eventsFrom()
      .select('id, child_name, party_date, parent_email, collective_enabled, collective_goal, collective_amount, created_at')
      .gte('created_at', LAUNCH_DATE)
      .order('created_at', { ascending: false }),
    rsvpFrom().select('event_id, status').gte('created_at', LAUNCH_DATE),
    giftsFrom().select('event_id, reserved_by').gte('created_at', LAUNCH_DATE),
    viewsFrom().select('view_count').gte('created_at', LAUNCH_DATE),
    rsvpFrom().select('*', { count: 'exact', head: true }).gte('created_at', LAUNCH_DATE).eq('status', 'yes'),
    giftsFrom().select('*', { count: 'exact', head: true }).gte('created_at', LAUNCH_DATE).not('reserved_by', 'is', null),
    userKeyFrom().select('user_key, link_type').gte('created_at', LAUNCH_DATE),
    viewsFrom().select('device_type, os, browser').gte('created_at', LAUNCH_DATE),
    eventsFrom().select('created_at, first_rsvp_at, first_gift_reserved_at').gte('created_at', LAUNCH_DATE),
    eventsFrom().select('utm_source, referral_source').gte('created_at', LAUNCH_DATE),
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

  // ── Dispositivi ───────────────────────────────────────────────────────────
  const deviceCounts = { mobile: 0, tablet: 0, desktop: 0, unknown: 0 }
  const osCounts = {}
  const browserCounts = {}
  ;(deviceRows || []).forEach(r => {
    const d = r.device_type || 'unknown'
    deviceCounts[d] = (deviceCounts[d] || 0) + 1
    if (r.os) osCounts[r.os] = (osCounts[r.os] || 0) + 1
    if (r.browser) browserCounts[r.browser] = (browserCounts[r.browser] || 0) + 1
  })

  // ── Acquisizione ──────────────────────────────────────────────────────────
  const sourceCounts = {}
  ;(acquisitionRows || []).forEach(e => {
    const src = e.utm_source || e.referral_source || 'diretto'
    sourceCounts[src] = (sourceCounts[src] || 0) + 1
  })

  // ── Latenza ───────────────────────────────────────────────────────────────
  const rsvpLatencyRows = (latencyEvents || []).filter(e => e.first_rsvp_at)
  const avgRsvpHours = rsvpLatencyRows.length > 0
    ? Math.round(rsvpLatencyRows.reduce((acc, e) =>
        acc + (new Date(e.first_rsvp_at) - new Date(e.created_at)) / 3600000, 0) / rsvpLatencyRows.length)
    : null

  const giftLatencyRows = (latencyEvents || []).filter(e => e.first_gift_reserved_at)
  const avgGiftHours = giftLatencyRows.length > 0
    ? Math.round(giftLatencyRows.reduce((acc, e) =>
        acc + (new Date(e.first_gift_reserved_at) - new Date(e.created_at)) / 3600000, 0) / giftLatencyRows.length)
    : null

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

  return {
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
    analytics: {
      devices: deviceCounts,
      os: osCounts,
      browsers: browserCounts,
      acquisition: sourceCounts,
      latency: {
        avgRsvpHours,
        avgGiftHours,
        eventsWithRsvp: rsvpLatencyRows.length,
        eventsWithGift: giftLatencyRows.length,
      },
    },
  }
}

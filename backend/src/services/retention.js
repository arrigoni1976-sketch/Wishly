import { supabase } from '../lib/supabase.js'

// I dati di un evento vengono conservati fino a 3 mesi dopo la festa (vedi Privacy Policy).
const RETENTION_DAYS = 90

export async function deleteExpiredEvents() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const { data: expired, error } = await supabase
    .from('events')
    .select('id, child_name, party_date')
    .lt('party_date', cutoffStr)

  if (error) {
    console.error('[retention] failed to fetch expired events', error)
    return
  }

  for (const event of expired || []) {
    // on delete cascade rimuove anche gifts, rsvp, contributions, link_views collegati
    const { error: delError } = await supabase.from('events').delete().eq('id', event.id)
    if (delError) {
      console.error(`[retention] failed to delete event ${event.id}`, delError)
    } else {
      console.log(`[retention] deleted expired event ${event.id} (${event.child_name}, party ${event.party_date})`)
    }
  }
}

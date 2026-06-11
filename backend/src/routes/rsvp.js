import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { sendPushToParent } from '../services/push.js'

const router = Router()

// ─── PUT /api/rsvp/:id — Update RSVP ────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { status, childrenCount, adultsCount, guestName, guestEmail } = req.body

    if (!status || !['yes', 'maybe', 'no'].includes(status)) {
      return res.status(400).json({ message: 'Status non valido' })
    }

    const updateData = {
      status,
      children_count: childrenCount ?? 0,
      adults_count: adultsCount ?? 1,
      updated_at: new Date().toISOString(),
    }
    if (guestName?.trim()) updateData.guest_name = guestName.trim()
    if (guestEmail?.trim()) updateData.guest_email = guestEmail.trim()

    const { data, error } = await supabase
      .from('rsvp')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    // Notifica push all'organizzatore (fire-and-forget)
    supabase.from('rsvp').select('event_id, guest_name').eq('id', req.params.id).single()
      .then(({ data: rsvpRow }) => {
        if (!rsvpRow) return
        return supabase.from('events').select('parent_token, child_name').eq('id', rsvpRow.event_id).single()
          .then(({ data: ev }) => {
            if (!ev) return
            const name = guestName?.trim() || rsvpRow.guest_name
            const statusLabel = { yes: 'parteciperà 🎉', maybe: 'forse parteciperà', no: 'non potrà venire' }[status]
            sendPushToParent(ev.parent_token, {
              title: `Piky — ${name} ha risposto`,
              body: `${name} ${statusLabel} al compleanno di ${ev.child_name}`,
              url: `/dashboard/${ev.parent_token}`,
            })
          })
      })
      .catch(() => {})

    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router

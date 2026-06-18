import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { sendPushToParent } from '../services/push.js'
import { isListClosed, parsePrice } from '../lib/utils.js'
import { createResourceLimiter } from '../lib/rateLimit.js'

const router = Router()

// ─── Helper: verifica che parentToken sia il proprietario dell'evento del regalo ─
async function assertGiftOwnership(giftId, parentToken) {
  if (!parentToken) return null

  const { data: gift } = await supabase
    .from('gifts')
    .select('id, event_id')
    .eq('id', giftId)
    .single()

  if (!gift) return null

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', gift.event_id)
    .eq('parent_token', parentToken)
    .single()

  return event ? gift : null
}

// ─── PUT /api/gifts/:id — Update gift ───────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, price, amazonUrl, storeUrl, parentToken } = req.body

    if (!name) return res.status(400).json({ message: 'Nome obbligatorio' })

    const gift = await assertGiftOwnership(req.params.id, parentToken)
    if (!gift) return res.status(403).json({ message: 'Non autorizzato' })

    const { data, error } = await supabase
      .from('gifts')
      .update({
        name,
        description: description || null,
        price: parsePrice(price),
        amazon_url: amazonUrl || null,
        store_url: storeUrl || null,
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/gifts/:id — Delete gift ────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const gift = await assertGiftOwnership(req.params.id, req.body?.parentToken)
    if (!gift) return res.status(403).json({ message: 'Non autorizzato' })

    const { error } = await supabase
      .from('gifts')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/gifts/:id/reserve — Reserve a gift ───────────────────────────
router.post('/:id/reserve', createResourceLimiter, async (req, res, next) => {
  try {
    const { partnerName, purchasedOffline } = req.body
    const guestName = (req.body.guestName || '').trim()

    if (!guestName) return res.status(400).json({ message: 'guestName obbligatorio' })

    // Check if already reserved (race condition guard)
    const { data: gift } = await supabase
      .from('gifts')
      .select('id, name, price, reserved_by, event_id')
      .eq('id', req.params.id)
      .single()

    if (!gift) return res.status(404).json({ message: 'Regalo non trovato' })
    if (gift.reserved_by) return res.status(409).json({ message: 'Regalo già prenotato' })

    // Check closing date
    const { data: eventData } = await supabase
      .from('events')
      .select('closing_date')
      .eq('id', gift.event_id)
      .single()

    if (isListClosed(eventData?.closing_date)) {
      return res.status(403).json({ message: 'Lista chiusa' })
    }

    const { data, error } = await supabase
      .from('gifts')
      .update({
        reserved_by: guestName,
        reserved_partner: partnerName || null,
        purchased_offline: !!purchasedOffline,
        reserved_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .is('reserved_by', null) // atomic guard — .is() per i valori null
      .select()
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(409).json({ message: 'Regalo già prenotato da qualcun altro' })

    // Registra first_gift_reserved_at se non ancora impostato (fire-and-forget)
    supabase.from('events')
      .update({ first_gift_reserved_at: new Date().toISOString() })
      .eq('id', gift.event_id)
      .is('first_gift_reserved_at', null)
      .then(() => {}).catch(err => console.error('[gifts] first_gift_reserved_at update failed', err))

    // Notifica push all'organizzatore (fire-and-forget)
    supabase.from('events').select('parent_token, child_name').eq('id', gift.event_id).single()
      .then(({ data: ev }) => {
        if (!ev) return
        sendPushToParent(ev.parent_token, {
          title: `Piky — ${guestName} ha prenotato un regalo 🎁`,
          body: `"${gift.name}" è stato prenotato per ${ev.child_name}`,
          url: `/dashboard/${ev.parent_token}`,
        })
      })
      .catch(err => console.error('[gifts] push notification failed', err))

    res.json(data)
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/gifts/:id/reserve — Cancel reservation ─────────────────────
router.delete('/:id/reserve', async (req, res, next) => {
  try {
    const { guestName } = req.body

    if (!guestName) return res.status(400).json({ message: 'guestName obbligatorio' })

    // Only the person who reserved can cancel
    const { data: gift } = await supabase
      .from('gifts')
      .select('id, reserved_by')
      .eq('id', req.params.id)
      .single()

    if (!gift) return res.status(404).json({ message: 'Regalo non trovato' })
    if (gift.reserved_by?.toLowerCase() !== guestName?.toLowerCase()) {
      return res.status(403).json({ message: 'Non puoi cancellare la prenotazione di un altro' })
    }

    const { error } = await supabase
      .from('gifts')
      .update({
        reserved_by: null,
        reserved_partner: null,
        purchased_offline: false,
        reserved_at: null,
      })
      .eq('id', req.params.id)

    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router

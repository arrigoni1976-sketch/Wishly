import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ─── PUT /api/gifts/:id — Update gift ───────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, price, amazonUrl, storeUrl } = req.body

    if (!name) return res.status(400).json({ message: 'Nome obbligatorio' })

    const { data, error } = await supabase
      .from('gifts')
      .update({
        name,
        description: description || null,
        price: price ? parseFloat(price) : null,
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
router.post('/:id/reserve', async (req, res, next) => {
  try {
    const { guestName, partnerName, purchasedOffline } = req.body

    if (!guestName) return res.status(400).json({ message: 'guestName obbligatorio' })

    // Check if already reserved (race condition guard)
    const { data: gift } = await supabase
      .from('gifts')
      .select('id, reserved_by')
      .eq('id', req.params.id)
      .single()

    if (!gift) return res.status(404).json({ message: 'Regalo non trovato' })
    if (gift.reserved_by) return res.status(409).json({ message: 'Regalo già prenotato' })

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
    if (gift.reserved_by !== guestName) {
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

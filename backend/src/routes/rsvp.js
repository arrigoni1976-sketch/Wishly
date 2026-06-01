import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ─── PUT /api/rsvp/:id — Update RSVP ────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { status, childrenCount, withPartner } = req.body

    if (!status || !['yes', 'maybe', 'no'].includes(status)) {
      return res.status(400).json({ message: 'Status non valido' })
    }

    const { data, error } = await supabase
      .from('rsvp')
      .update({
        status,
        children_count: childrenCount ?? 0,
        with_partner: withPartner ?? false,
        updated_at: new Date().toISOString(),
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

export default router

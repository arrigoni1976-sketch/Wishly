import express from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.delete('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id

    // Elimina tutti gli eventi dell'utente (cascade su gifts, rsvp, ecc.)
    const { error: eventsError } = await supabase
      .from('events')
      .delete()
      .eq('owner_id', userId)

    if (eventsError) throw eventsError

    // Elimina l'utente da Supabase Auth
    const { error: userError } = await supabase.auth.admin.deleteUser(userId)
    if (userError) throw userError

    res.json({ message: 'Account eliminato' })
  } catch (err) {
    next(err)
  }
})

export default router

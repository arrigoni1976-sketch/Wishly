import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { supabase } from '../lib/supabase.js'
import { getAdminStats } from '../services/adminStats.js'

const router = Router()

// Max 10 tentativi per IP ogni 15 minuti
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Troppi tentativi. Riprova tra 15 minuti.' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.use(adminLimiter)

const authAdmin = (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    res.status(401).json({ message: 'Non autorizzato' })
    return false
  }
  return true
}

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    if (!authAdmin(req, res)) return
    const stats = await getAdminStats()
    res.json(stats)
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/events/:id — dettaglio singolo evento
router.get('/events/:id', async (req, res, next) => {
  try {
    if (!authAdmin(req, res)) return
    const { id } = req.params

    const [
      { data: event },
      { data: gifts },
      { data: rsvp },
      { data: views },
      { data: contributions },
    ] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).maybeSingle(),
      supabase.from('gifts').select('id, name, url, price, reserved_by, purchased_offline, created_at').eq('event_id', id).order('created_at'),
      supabase.from('rsvp').select('guest_name, parent_name, status, adults_count, children_count, created_at').eq('event_id', id).order('created_at'),
      supabase.from('link_views').select('view_count, device_type, os, browser, created_at').eq('event_id', id),
      supabase.from('contributions').select('contributor_name, amount, created_at').eq('event_id', id).eq('status', 'completed').order('created_at'),
    ])

    if (!event) return res.status(404).json({ message: 'Evento non trovato' })

    res.json({ event, gifts: gifts || [], rsvp: rsvp || [], views: views || [], contributions: contributions || [] })
  } catch (err) {
    next(err)
  }
})

export default router

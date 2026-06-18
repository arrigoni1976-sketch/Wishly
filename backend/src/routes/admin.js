import { Router } from 'express'
import { getAdminStats } from '../services/adminStats.js'

const router = Router()

// GET /api/admin/stats?key=XXX
router.get('/stats', async (req, res, next) => {
  try {
    if (!process.env.ADMIN_KEY || req.query.key !== process.env.ADMIN_KEY) {
      const mask = (s) => s ? `${s.slice(0, 3)}...${s.slice(-3)} (len ${s.length})` : 'undefined'
      console.log('[admin debug] received:', mask(req.query.key), 'expected:', mask(process.env.ADMIN_KEY))
      return res.status(401).json({ message: 'Non autorizzato' })
    }

    const stats = await getAdminStats()
    res.json(stats)
  } catch (err) {
    next(err)
  }
})

export default router

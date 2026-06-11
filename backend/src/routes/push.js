import { Router } from 'express'
import { getVapidPublicKey, saveSubscription } from '../services/push.js'

const router = Router()

// GET /api/push/vapid-public-key
router.get('/vapid-public-key', (_req, res) => {
  res.json({ key: getVapidPublicKey() })
})

// POST /api/push/subscribe
router.post('/subscribe', async (req, res, next) => {
  try {
    const { parentToken, subscription } = req.body
    if (!parentToken || !subscription) {
      return res.status(400).json({ message: 'parentToken e subscription obbligatori' })
    }
    await saveSubscription(parentToken, subscription)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router

import { Router } from 'express'
import { getVapidPublicKey, saveSubscription, sendPushToParent } from '../services/push.js'
import { supabase } from '../lib/supabase.js'

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

// GET /api/push/diagnose/:parentToken — controlla subscription e manda push di test
router.get('/diagnose/:parentToken', async (req, res) => {
  const { parentToken } = req.params
  const vapidKey = getVapidPublicKey()

  const { data: sub } = await supabase
    .from('push_subscriptions')
    .select('subscription, created_at')
    .eq('parent_token', parentToken)
    .maybeSingle()

  if (!sub) {
    return res.json({ ok: false, step: 'no_subscription', vapidKeyLoaded: !!vapidKey, message: 'Nessuna subscription trovata per questo parent_token' })
  }

  try {
    await sendPushToParent(parentToken, {
      title: '🔔 Test Piky',
      body: 'Se vedi questo, le notifiche funzionano!',
      url: `/dashboard/${parentToken}`,
    })
    res.json({ ok: true, step: 'push_sent', subscriptionCreatedAt: sub.created_at, vapidKeyLoaded: !!vapidKey })
  } catch (err) {
    res.json({ ok: false, step: 'push_failed', error: err.message, vapidKeyLoaded: !!vapidKey })
  }
})

export default router

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cron from 'node-cron'

import eventsRouter from './routes/events.js'
import giftsRouter from './routes/gifts.js'
import rsvpRouter from './routes/rsvp.js'
import paymentsRouter from './routes/payments.js'
import userKeysRouter from './routes/userkeys.js'
import adminRouter from './routes/admin.js'
import pushRouter from './routes/push.js'
import { initVapid, sendClosingPushes, sendPartyFollowupPushes } from './services/push.js'
import { sendReminders, sendClosingSummaries } from './services/email.js'

const app = express()
const PORT = process.env.PORT || 4000

// ─── Global error safety net ─────────────────────────────────────────────────
// Evita che un errore async non gestito (es. in una callback fire-and-forget)
// faccia crashare silenziosamente il processo.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err)
})

// ─── Middleware ─────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://www.pikyapp.it',
  'https://pikyapp.it',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Host not in allowlist'))
  },
}))
// Conserva il raw body per la verifica della firma del webhook Stripe
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf },
}))

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/events', eventsRouter)
app.use('/api/gifts', giftsRouter)
app.use('/api/rsvp', rsvpRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/user-keys', userKeysRouter)
app.use('/api/admin', adminRouter)
app.use('/api/push', pushRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ─── 404 ────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Not found' }))

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' })
})

// ─── Scheduled jobs ─────────────────────────────────────────────────────────
// Run every day at 08:00 Italy time — follow-up reminder the morning after the party
cron.schedule('0 8 * * *', async () => {
  console.log('[cron] Running party follow-up job...')
  await sendPartyFollowupPushes()
}, { timezone: 'Europe/Rome' })

// Run every day at 09:00 Italy time — send reminders 2 days before party
cron.schedule('0 9 * * *', async () => {
  console.log('[cron] Running reminder job...')
  await sendReminders()
}, { timezone: 'Europe/Rome' })

// Run every day at 19:01 Italy time — closing summary + push
// (list closes at 19:00; summary sent one minute later)
cron.schedule('1 19 * * *', async () => {
  console.log('[cron] Running closing summary job...')
  await sendClosingSummaries()
  await sendClosingPushes()
}, { timezone: 'Europe/Rome' })

// ─── Start ───────────────────────────────────────────────────────────────────
initVapid().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Piky backend running on http://localhost:${PORT}`)
  })
}).catch((err) => {
  console.error('❌ initVapid failed:', err.message)
  process.exit(1)
})

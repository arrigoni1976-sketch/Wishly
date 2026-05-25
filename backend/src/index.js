import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cron from 'node-cron'

import eventsRouter from './routes/events.js'
import giftsRouter from './routes/gifts.js'
import rsvpRouter from './routes/rsvp.js'
import paymentsRouter from './routes/payments.js'
import { sendReminders, sendClosingSummaries } from './services/email.js'

const app = express()
const PORT = process.env.PORT || 4000

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }))
app.use(express.json())

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/events', eventsRouter)
app.use('/api/gifts', giftsRouter)
app.use('/api/rsvp', rsvpRouter)
app.use('/api/payments', paymentsRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ─── 404 ────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Not found' }))

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' })
})

// ─── Scheduled jobs ─────────────────────────────────────────────────────────
// Run every day at 09:00 — send reminders 2 days before party
cron.schedule('0 9 * * *', async () => {
  console.log('[cron] Running reminder job...')
  await sendReminders()
})

// Run every day at 10:00 — send closing summary when list closes
cron.schedule('0 10 * * *', async () => {
  console.log('[cron] Running closing summary job...')
  await sendClosingSummaries()
})

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Wishly backend running on http://localhost:${PORT}`)
})

import { Router } from 'express'

const router = Router()

// ─── Satispay ────────────────────────────────────────────────────────────────

// POST /api/payments/satispay/init
router.post('/satispay/init', async (req, res, next) => {
  try {
    const { contributorName, collectiveToken } = req.body
    const amount = parseFloat(req.body.amount)

    if (!Number.isFinite(amount) || amount < 10) {
      return res.status(400).json({ message: 'Importo minimo €10' })
    }

    // Satispay uses RSA-SHA256 signature auth — simplified placeholder
    // In production: use official Satispay SDK or implement HMAC signing
    // Docs: https://developers.satispay.com/
    const callbackUrl = `${process.env.FRONTEND_URL}/collettivo/${collectiveToken}?satispay=success`

    // Placeholder response — replace with real Satispay API call
    res.json({
      message: 'Satispay integration requires RSA key setup',
      redirectUrl: callbackUrl,
      sandbox: process.env.SATISPAY_ENV !== 'production',
    })
  } catch (err) {
    next(err)
  }
})

export default router

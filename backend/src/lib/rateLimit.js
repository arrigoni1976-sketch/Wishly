import rateLimit from 'express-rate-limit'

// Limita gli endpoint che inviano email o creano risorse, per mitigare spam/email-bombing.
export const createResourceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Troppe richieste, riprova più tardi' },
})

export const emailSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Troppe richieste, riprova più tardi' },
})

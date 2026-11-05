import admin from 'firebase-admin'

let initialized = false

export function initFirebase() {
  if (initialized) return
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) {
    console.warn('[firebase] FIREBASE_SERVICE_ACCOUNT non impostata — FCM disabilitato')
    return
  }
  try {
    const serviceAccount = JSON.parse(raw)
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    initialized = true
    console.log('✅ Firebase Admin SDK inizializzato')
  } catch (err) {
    console.error('[firebase] Errore inizializzazione:', err.message)
  }
}

export function getMessaging() {
  if (!initialized) return null
  return admin.messaging()
}

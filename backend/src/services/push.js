import webpush from 'web-push'
import { supabase } from '../lib/supabase.js'

const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:noreply@pikyapp.it'

// Legge le chiavi VAPID da Supabase (app_settings).
// Se non esistono le genera, le salva nel DB e le usa — nessuna env var necessaria.
let publicKey = null
let privateKey = null

export async function initVapid() {
  // Prova prima le env vars (opzionale, per compatibilità)
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    publicKey = process.env.VAPID_PUBLIC_KEY
    privateKey = process.env.VAPID_PRIVATE_KEY
    webpush.setVapidDetails(VAPID_EMAIL, publicKey, privateKey)
    console.log('✅ VAPID keys caricate da env vars')
    return
  }

  // Cerca nel DB
  const { data: rows } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['vapid_public_key', 'vapid_private_key'])

  const fromDb = Object.fromEntries((rows || []).map((r) => [r.key, r.value]))

  if (fromDb.vapid_public_key && fromDb.vapid_private_key) {
    publicKey = fromDb.vapid_public_key
    privateKey = fromDb.vapid_private_key
    webpush.setVapidDetails(VAPID_EMAIL, publicKey, privateKey)
    console.log('✅ VAPID keys caricate da Supabase')
    return
  }

  // Genera nuove chiavi e salvale nel DB
  const keys = webpush.generateVAPIDKeys()
  publicKey = keys.publicKey
  privateKey = keys.privateKey

  await supabase.from('app_settings').upsert([
    { key: 'vapid_public_key', value: publicKey },
    { key: 'vapid_private_key', value: privateKey },
  ])

  webpush.setVapidDetails(VAPID_EMAIL, publicKey, privateKey)
  console.log('✅ VAPID keys generate e salvate su Supabase')
}

export const getVapidPublicKey = () => publicKey

export async function saveSubscription(parentToken, subscription) {
  try {
    await supabase
      .from('push_subscriptions')
      .upsert({ parent_token: parentToken, subscription }, { onConflict: 'parent_token' })
  } catch (err) {
    console.error('[push] saveSubscription error:', err.message)
  }
}

export async function sendPushToParent(parentToken, { title, body, url = '/' }) {
  if (!publicKey) {
    console.warn('[push] VAPID non inizializzato — push ignorata')
    return
  }
  try {
    const { data, error: dbErr } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('parent_token', parentToken)
      .maybeSingle()

    if (dbErr) { console.error('[push] DB error:', dbErr.message); return }
    if (!data) { console.log(`[push] Nessuna subscription per ${parentToken.slice(0, 8)}…`); return }

    await webpush.sendNotification(data.subscription, JSON.stringify({ title, body, url }))
    console.log(`[push] ✅ Push inviata a ${parentToken.slice(0, 8)}…`)
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`[push] Subscription scaduta per ${parentToken.slice(0, 8)}… — rimossa`)
      await supabase.from('push_subscriptions').delete().eq('parent_token', parentToken)
    } else {
      console.error(`[push] sendNotification error (${err.statusCode}):`, err.message)
    }
  }
}

import webpush from 'web-push'
import { supabase } from '../lib/supabase.js'

const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:noreply@pikyapp.it'

// Se le chiavi non sono nelle env, le genera al volo e le stampa nel log
// → copia i valori in Railway come VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY
let publicKey = process.env.VAPID_PUBLIC_KEY
let privateKey = process.env.VAPID_PRIVATE_KEY

if (!publicKey || !privateKey) {
  const keys = webpush.generateVAPIDKeys()
  publicKey = keys.publicKey
  privateKey = keys.privateKey
  process.env.VAPID_PUBLIC_KEY = publicKey
  process.env.VAPID_PRIVATE_KEY = privateKey
  console.log('⚠️  VAPID keys generate automaticamente. Imposta su Railway:')
  console.log(`VAPID_PUBLIC_KEY=${publicKey}`)
  console.log(`VAPID_PRIVATE_KEY=${privateKey}`)
}

webpush.setVapidDetails(VAPID_EMAIL, publicKey, privateKey)

export const vapidPublicKey = publicKey

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
  try {
    const { data } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('parent_token', parentToken)
      .maybeSingle()

    if (!data) return

    await webpush.sendNotification(data.subscription, JSON.stringify({ title, body, url }))
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription scaduta — rimuovi
      await supabase.from('push_subscriptions').delete().eq('parent_token', parentToken)
    } else {
      console.error('[push] sendNotification error:', err.message)
    }
  }
}

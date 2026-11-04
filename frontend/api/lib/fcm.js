// Firebase Cloud Messaging HTTP v1 API — no firebase-admin needed
// Uses native Node.js crypto for JWT signing

import { createSign } from 'crypto'
import { createClient } from '@supabase/supabase-js'

function getDb() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function getAccessToken(serviceAccount) {
  const { client_email, private_key } = serviceAccount
  const tokenUri = 'https://oauth2.googleapis.com/token'
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  }
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const data = `${header}.${body}`
  const sign = createSign('RSA-SHA256')
  sign.update(data)
  const signature = sign.sign(private_key, 'base64url')
  const jwt = `${data}.${signature}`

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const json = await res.json()
  return json.access_token
}

async function sendOne(projectId, accessToken, token, title, body, data) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        apns: { payload: { aps: { sound: 'default' } } },
        android: { priority: 'high' },
      },
    }),
  })
  return res.ok
}

// Send push to all device tokens registered for an event
export async function sendPushToEvent(eventId, { title, body, data = {} }) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return
  let serviceAccount
  try { serviceAccount = JSON.parse(raw) } catch { return }

  const db = getDb()
  const { data: tokens } = await db.from('device_tokens').select('id, token').eq('event_id', eventId)
  if (!tokens?.length) return

  const projectId = serviceAccount.project_id
  const accessToken = await getAccessToken(serviceAccount)

  const invalid = []
  await Promise.allSettled(
    tokens.map(async ({ id, token }) => {
      const ok = await sendOne(projectId, accessToken, token, title, body, data)
      if (!ok) invalid.push(id)
    })
  )

  if (invalid.length) {
    await db.from('device_tokens').delete().in('id', invalid)
  }
}

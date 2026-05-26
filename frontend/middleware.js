import { NextResponse } from '@vercel/edge'

const API_URL = 'https://wishly-production.up.railway.app'

// Detect social media crawlers
function isCrawler(userAgent) {
  if (!userAgent) return false
  const crawlers = ['whatsapp', 'telegram', 'facebookexternalhit', 'twitterbot', 'linkedinbot', 'slackbot', 'discordbot']
  const ua = userAgent.toLowerCase()
  return crawlers.some((c) => ua.includes(c))
}

function buildHTML({ title, description, imageUrl, url }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body></body>
</html>`
}

export async function middleware(request) {
  const ua = request.headers.get('user-agent') || ''
  if (!isCrawler(ua)) return NextResponse.next()

  const { pathname } = request.nextUrl
  const baseUrl = 'https://wishly-blue.vercel.app'
  const imageUrl = `${baseUrl}/icons/icon-512x512.png`

  try {
    // /lista/:token
    const guestMatch = pathname.match(/^\/lista\/([^/]+)$/)
    if (guestMatch) {
      const res = await fetch(`${API_URL}/api/events/guest/${guestMatch[1]}`)
      if (res.ok) {
        const event = await res.json()
        const html = buildHTML({
          title: `Lista desideri per il compleanno di ${event.child_name} 🎁`,
          description: `Prenota un regalo per ${event.child_name}! Coordinati con gli altri invitati e scegli qualcosa di unico.`,
          imageUrl,
          url: `${baseUrl}${pathname}`,
        })
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
      }
    }

    // /collettivo/:token
    const collectiveMatch = pathname.match(/^\/collettivo\/([^/]+)$/)
    if (collectiveMatch) {
      const res = await fetch(`${API_URL}/api/events/collective/${collectiveMatch[1]}`)
      if (res.ok) {
        const event = await res.json()
        const desc = event.collective_description
          ? `${event.collective_description} per ${event.child_name} — contribuisci alla raccolta!`
          : `Regalo collettivo per ${event.child_name} — contribuisci alla raccolta!`
        const html = buildHTML({
          title: `Regalo collettivo per ${event.child_name} 💝`,
          description: desc,
          imageUrl,
          url: `${baseUrl}${pathname}`,
        })
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
      }
    }
  } catch (e) {
    // fallback to normal page
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/lista/:path*', '/collettivo/:path*'],
}

import { getUserKeyLinks, addUserKeyLink } from './api'

// Pull server links → merge into localStorage (adds missing, removes deleted)
export async function syncFromServer(key) {
  const res = await getUserKeyLinks(key)
  const links = res.data.links || []
  const serverTokens = new Set(links.map((l) => l.token))

  const hidden = JSON.parse(localStorage.getItem('piky_hidden') || '[]')
  let events = JSON.parse(localStorage.getItem('piky_events') || '[]')
  let invites = JSON.parse(localStorage.getItem('piky_invites') || '[]')

  let changed = false

  // Add items from server that aren't in localStorage yet
  for (const link of links) {
    if (hidden.includes(link.token)) continue

    if (link.link_type === 'event' && !events.find((e) => e.parentToken === link.token)) {
      events.unshift({
        childName: link.child_name,
        partyDate: link.party_date,
        parentToken: link.token,
        createdAt: link.created_at,
      })
      changed = true
    }

    if (link.link_type === 'invite' && !invites.find((e) => e.guestToken === link.token)) {
      invites.unshift({
        childName: link.child_name,
        partyDate: link.party_date,
        guestToken: link.token,
        visitedAt: link.created_at,
      })
      changed = true
    }

    // Restore guest name if saved on server (enables cross-browser RSVP recovery)
    if (link.link_type === 'invite' && link.guest_name && !localStorage.getItem('piky_guest_name')) {
      localStorage.setItem('piky_guest_name', link.guest_name)
    }
  }

  // Remove items from localStorage that are no longer on the server
  const filteredEvents = events.filter((e) => serverTokens.has(e.parentToken))
  const filteredInvites = invites.filter((i) => serverTokens.has(i.guestToken))

  if (filteredEvents.length !== events.length || filteredInvites.length !== invites.length) {
    changed = true
    events = filteredEvents
    invites = filteredInvites
  }

  if (changed) {
    localStorage.setItem('piky_events', JSON.stringify(events.slice(0, 20)))
    localStorage.setItem('piky_invites', JSON.stringify(invites.slice(0, 20)))
  }

  return { changed, events, invites }
}

// Push existing localStorage items → server (called once when key is created)
export async function uploadLocalToKey(key) {
  const events = JSON.parse(localStorage.getItem('piky_events') || '[]')
  const invites = JSON.parse(localStorage.getItem('piky_invites') || '[]')

  await Promise.all([
    ...events.map((ev) =>
      addUserKeyLink(key, {
        linkType: 'event',
        token: ev.parentToken,
        childName: ev.childName,
        partyDate: ev.partyDate,
      }).catch(() => {})
    ),
    ...invites.map((inv) =>
      addUserKeyLink(key, {
        linkType: 'invite',
        token: inv.guestToken,
        childName: inv.childName,
        partyDate: inv.partyDate,
      }).catch(() => {})
    ),
  ])
}

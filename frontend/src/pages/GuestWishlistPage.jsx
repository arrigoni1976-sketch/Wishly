import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Calendar, CalendarPlus, Clock, MapPin, Users, Gift, HelpCircle, Frown, AlertCircle, FileText, Share2, Pencil, Lock } from 'lucide-react'
import Layout from '../components/Layout'
import GiftCard from '../components/GiftCard'
import GiftIcon from '../components/GiftIcon'
import BalloonIcon from '../components/BalloonIcon'
import HeartRibbonIcon from '../components/HeartRibbonIcon'
import CelebrationIcon from '../components/CelebrationIcon'
import WaveIcon from '../components/WaveIcon'
import RSVPSelector from '../components/RSVPSelector'
import CopyLink from '../components/CopyLink'
import ClosingCountdown from '../components/ClosingCountdown'
import {
  getEventByGuestToken,
  trackLinkView,
  reserveGift,
  cancelReservation,
  submitRsvp,
  updateRsvp,
  addUserKeyLink,
  getUserKeyLinks,
} from '../lib/api'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

// ─── Closing date check ────────────────────────────────────────────────────
function isListClosed(closingDate) {
  if (!closingDate) return false
  const now = new Date()
  const italyDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' }) // YYYY-MM-DD
  if (italyDateStr > closingDate) return true
  if (italyDateStr === closingDate) {
    const italyHour = Number(now.toLocaleString('en', { timeZone: 'Europe/Rome', hour: 'numeric', hour12: false }))
    return italyHour >= 19
  }
  return false
}

// ─── Calendar helper ───────────────────────────────────────────────────────
function addToCalendar({ childName, partyDate, partyTime, location, inviteUrl }) {
  const pad = (n) => String(n).padStart(2, '0')
  const isAndroid = /android/i.test(navigator.userAgent)

  let dtStart, dtEnd
  if (partyTime) {
    const [h, m] = partyTime.split(':').map(Number)
    const d = new Date(partyDate)
    dtStart = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`
    const end = new Date(d)
    end.setHours(h + 3, m)
    dtEnd = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`
  } else {
    const d = new Date(partyDate)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    dtStart = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
    dtEnd = `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`
  }

  if (isAndroid) {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Compleanno di ${childName}`,
      dates: `${dtStart}/${dtEnd}`,
      details: inviteUrl ? `Evento salvato da Piky\nLink invito: ${inviteUrl}` : 'Evento salvato da Piky',
    })
    if (location) params.set('location', location)
    window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank')
    return
  }

  // iOS / desktop: download .ics
  const isAllDay = !partyTime
  const description = inviteUrl
    ? `Evento salvato da Piky\\nLink invito: ${inviteUrl}`
    : 'Evento salvato da Piky'

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Piky//Piky App//IT',
    'BEGIN:VEVENT',
    `SUMMARY:Compleanno di ${childName}`,
    isAllDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
    isAllDay ? `DTEND;VALUE=DATE:${dtEnd}` : `DTEND:${dtEnd}`,
    location ? `LOCATION:${location}` : '',
    `DESCRIPTION:${description}`,
    inviteUrl ? `URL:${inviteUrl}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Domani è il compleanno di ${childName}! 🎉`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Tra 2 ore inizia il compleanno di ${childName}! 🎂`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `compleanno-${childName.toLowerCase().replace(/\s+/g, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── RSVP Form ─────────────────────────────────────────────────────────────
function RsvpSection({ eventId, existingRsvp, onRsvpSaved, serverRsvps = [], eventData = null, listClosed = false }) {
  const [step, setStep] = useState(existingRsvp ? 'done' : 'prompt') // 'prompt' | 'form' | 'done' | 'recover'
  const [guestName, setGuestName] = useState(existingRsvp?.guest_name || '')
  const [guestEmail, setGuestEmail] = useState(existingRsvp?.guest_email || '')
  const [status, setStatus] = useState(existingRsvp?.status || '')
  const [childrenCount, setChildrenCount] = useState(existingRsvp?.children_count || 0)
  const [adultsCount, setAdultsCount] = useState(existingRsvp?.adults_count || 1)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [recoverName, setRecoverName] = useState('')
  const [recoverError, setRecoverError] = useState('')

  const handleSubmit = async () => {
    if (!guestName.trim() || !status) return
    setLoading(true)
    setSubmitError('')
    try {
      let res
      if (existingRsvp?.id) {
        res = await updateRsvp(existingRsvp.id, {
          status,
          childrenCount,
          adultsCount,
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
        })
      } else {
        res = await submitRsvp(eventId, {
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          status,
          childrenCount,
          adultsCount,
        })
      }
      onRsvpSaved(res.data)
      setStep('done')
      setSaved(true)
    } catch {
      setSubmitError('Errore nel salvataggio. Controlla la connessione e riprova.')
    } finally {
      setLoading(false)
    }
  }

  const handleRecover = () => {
    const name = recoverName.trim().toLowerCase()
    if (!name) return
    const found = serverRsvps.find((r) => {
      const rsvpName = r.guest_name?.toLowerCase().trim() || ''
      // exact, or one name is contained in the other (handles "Francesca" vs "Francesca Bonacina")
      return rsvpName === name || rsvpName.startsWith(name) || name.startsWith(rsvpName)
    })
    if (found) {
      onRsvpSaved(found)
      setStatus(found.status)
      setChildrenCount(found.children_count || 0)
      setAdultsCount(found.adults_count || (found.with_partner ? 2 : 1))
      setStep('done')
    } else {
      setRecoverError(
        serverRsvps.length === 0
          ? 'Nessuna conferma trovata per questo evento.'
          : `"${recoverName.trim()}" non corrisponde a nessuna risposta. Prova con il nome esatto usato quando hai confermato.`
      )
    }
  }

  if (step === 'recover') {
    return (
      <div className="bg-white rounded-3xl border border-avorio-dark p-5 space-y-4 animate-fade-in">
        <h3 className="font-display font-bold text-gray-900">Ritrova la tua risposta</h3>
        <div>
          <label className="label">Il tuo nome</label>
          <input
            value={recoverName}
            onChange={(e) => { setRecoverName(e.target.value); setRecoverError('') }}
            placeholder="Nome Cognome"
            className="input"
            onKeyDown={(e) => e.key === 'Enter' && handleRecover()}
          />
          {recoverError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mt-2">
              {recoverError}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep('prompt')} className="flex-1 btn-outline text-sm py-2.5">
            Annulla
          </button>
          <button
            onClick={handleRecover}
            disabled={!recoverName.trim()}
            className="flex-1 btn-primary text-sm py-2.5"
          >
            Cerca
          </button>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="bg-white rounded-3xl border border-avorio-dark p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-800">
              {`Ciao, ${guestName || existingRsvp?.guest_name}!`}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Hai risposto:{' '}
              <span className="font-medium">
                <span className="flex items-center gap-1">
                  {status === 'yes' ? <><CelebrationIcon size={14} /> Ci sarò</>
                   : status === 'maybe' ? <><HelpCircle className="w-3.5 h-3.5" /> Forse</>
                   : <><Frown className="w-3.5 h-3.5" /> Non vengo</>}
                </span>
              </span>
            </p>
          </div>
          {!listClosed && (
            <button
              onClick={() => setStep('form')}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
        {(status === 'yes' || status === 'maybe') && eventData && (
          <button
            onClick={() => addToCalendar({
              childName: eventData.child_name,
              partyDate: eventData.party_date,
              partyTime: eventData.party_time,
              location: eventData.address || eventData.location,
              inviteUrl: window.location.href,
            })}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-salvia bg-salvia/10 border border-salvia/40 rounded-2xl hover:bg-salvia/20 transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            Aggiungi al calendario
          </button>
        )}
      </div>
    )
  }

  if (step === 'prompt' && listClosed) {
    return (
      <div className="bg-gray-50 rounded-3xl border border-gray-200 p-6 text-center space-y-2">
        <Lock className="w-6 h-6 text-gray-400 mx-auto" />
        <p className="font-display font-semibold text-gray-700">Le prenotazioni sono chiuse</p>
        <p className="text-sm text-gray-400">Non è più possibile confermare la presenza.</p>
      </div>
    )
  }

  if (step === 'prompt') {
    return (
      <div className="space-y-3">
        {serverRsvps.length > 0 && (
          <button
            onClick={() => setStep('recover')}
            className="w-full flex items-center gap-3 bg-avorio border border-avorio-dark rounded-2xl px-4 py-3 text-left hover:border-salvia/40 transition-colors group"
          >
            <span className="text-xl flex-shrink-0">↩️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-700 group-hover:text-salvia transition-colors">
                Hai già risposto da un altro dispositivo?
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Inserisci il tuo nome per ritrovare la tua risposta
              </p>
            </div>
            <span className="text-gray-300 group-hover:text-salvia transition-colors text-lg flex-shrink-0">›</span>
          </button>
        )}
        <div className="bg-gradient-to-br from-avorio to-white rounded-3xl border border-avorio-dark p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cipria/30 rounded-2xl flex items-center justify-center flex-shrink-0">
              <WaveIcon size={26} />
            </div>
            <h2 className="font-display font-bold text-gray-900 text-lg leading-snug">
              Sei invitato al compleanno di {eventData?.child_name}!
            </h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Ci farebbe molto piacere festeggiare insieme a te — facci sapere se riesci a esserci.
          </p>
          <button
            onClick={() => setStep('form')}
            className="btn-primary w-full text-sm py-3"
          >
            Conferma la tua presenza
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-avorio-dark p-5 space-y-4 animate-fade-in">
      <h3 className="font-display font-bold text-gray-900">La tua risposta</h3>

      <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Il tuo nome *</label>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Nome Cognome"
              className="input"
            />
          </div>
          <div>
            <label className="label">Email (opzionale)</label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="nome@email.it"
              className="input"
            />
          </div>
        </div>

      <div>
        <label className="label">Parteciperai?</label>
        <RSVPSelector value={status} onChange={setStatus} />
      </div>

      {status === 'yes' && (
        <>
          <div>
            <label className="label">In quanti sarete?</label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Adulti</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAdultsCount((n) => Math.max(1, n - 1))}
                    className="w-9 h-9 rounded-xl border border-gray-200 text-gray-600 flex items-center justify-center hover:border-salvia hover:text-salvia transition-colors"
                  >
                    −
                  </button>
                  <span className="text-lg font-bold text-gray-800 w-6 text-center">{adultsCount}</span>
                  <button
                    type="button"
                    onClick={() => setAdultsCount((n) => n + 1)}
                    className="w-9 h-9 rounded-xl border border-gray-200 text-gray-600 flex items-center justify-center hover:border-salvia hover:text-salvia transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bambini</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setChildrenCount((n) => Math.max(0, n - 1))}
                    className="w-9 h-9 rounded-xl border border-gray-200 text-gray-600 flex items-center justify-center hover:border-salvia hover:text-salvia transition-colors"
                  >
                    −
                  </button>
                  <span className="text-lg font-bold text-gray-800 w-6 text-center">{childrenCount}</span>
                  <button
                    type="button"
                    onClick={() => setChildrenCount((n) => n + 1)}
                    className="w-9 h-9 rounded-xl border border-gray-200 text-gray-600 flex items-center justify-center hover:border-salvia hover:text-salvia transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {submitError}
        </p>
      )}

      <div className="flex gap-3">
        {existingRsvp && (
          <button onClick={() => setStep('done')} className="flex-1 btn-outline text-sm py-2.5">
            Annulla
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!guestName.trim() || !status || loading}
          className="flex-1 btn-primary text-sm py-2.5"
        >
          {loading ? 'Salvo...' : 'Conferma risposta'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function GuestWishlistPage() {
  const { guestToken } = useParams()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === '1'
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [myRsvp, setMyRsvp] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`piky_rsvp_${guestToken}`)) || null
    } catch { return null }
  })
  const [myReservations, setMyReservations] = useState([]) // gift IDs
  const [viewTracked, setViewTracked] = useState(false)
  const [showRsvpModal, setShowRsvpModal] = useState(false)
  const [userKey] = useState(() => localStorage.getItem('piky_user_key') || null)
  const [keyPromptDismissed, setKeyPromptDismissed] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [keyLoading, setKeyLoading] = useState(false)
  const [keyError, setKeyError] = useState('')
  const [keyLinked, setKeyLinked] = useState(false)

  const baseUrl = window.location.origin

  const fetchEvent = async () => {
    try {
      const res = await getEventByGuestToken(guestToken)
      const data = res.data
      setEvent(data)

      // Salva l'invito nel localStorage per ritrovarlo dalla homepage
      const saved = JSON.parse(localStorage.getItem('piky_invites') || '[]')
      const alreadySaved = saved.find((e) => e.guestToken === guestToken)
      if (!alreadySaved) {
        saved.unshift({
          childName: data.child_name,
          partyDate: data.party_date,
          guestToken,
          visitedAt: new Date().toISOString(),
        })
        localStorage.setItem('piky_invites', JSON.stringify(saved.slice(0, 20)))
      }

      // Auto-recover RSVP and gift reservations if guest name is known
      // Usa piky_guest_name oppure il nome dall'RSVP salvato localmente (cross-browser)
      const storedRsvp = JSON.parse(localStorage.getItem(`piky_rsvp_${guestToken}`) || 'null')
      const storedName = localStorage.getItem('piky_guest_name') || storedRsvp?.guest_name
      if (storedName) {
        if (!localStorage.getItem(`piky_rsvp_${guestToken}`)) {
          const found = data.rsvp?.find(
            (r) => r.guest_name?.toLowerCase() === storedName.toLowerCase()
          )
          if (found) {
            setMyRsvp(found)
            localStorage.setItem(`piky_rsvp_${guestToken}`, JSON.stringify(found))
          }
        }
        // Check by storedName AND by per-gift saved names (handles RSVP name overwriting piky_guest_name)
        const savedGiftNames = JSON.parse(localStorage.getItem('piky_reserved_gifts') || '{}')
        const reservedByMe = (data.gifts || [])
          .filter((g) => {
            if (!g.reserved_by) return false
            const rb = g.reserved_by.toLowerCase()
            if (savedGiftNames[g.id] && savedGiftNames[g.id].toLowerCase() === rb) return true
            return storedName && rb === storedName.toLowerCase()
          })
          .map((g) => g.id)
        if (reservedByMe.length > 0) setMyReservations(reservedByMe)
      }
    } catch {
      setError('Lista non trovata o link non valido.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvent() }, [guestToken])

  // Track view silently after 2s — named if RSVP already known
  useEffect(() => {
    if (!event || viewTracked) return
    const timer = setTimeout(() => {
      const viewPayload = myRsvp?.guest_name ? { guestName: myRsvp.guest_name } : {}
      trackLinkView(guestToken, viewPayload).catch(() => {})
      setViewTracked(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [event, viewTracked])

  const handleLinkKey = async () => {
    const key = keyInput.trim().toUpperCase()
    if (!key) return
    setKeyLoading(true)
    setKeyError('')
    try {
      await getUserKeyLinks(key)
      localStorage.setItem('piky_user_key', key.toLowerCase())
      await addUserKeyLink(key.toLowerCase(), {
        linkType: 'invite',
        token: guestToken,
        childName: event?.child_name,
        partyDate: event?.party_date,
        guestName: myRsvp?.guest_name || localStorage.getItem('piky_guest_name') || undefined,
      })
      setKeyLinked(true)
    } catch (e) {
      if (e?.response?.status === 404) {
        setKeyError('Codice non trovato. Controlla di averlo inserito correttamente.')
      } else {
        setKeyError('Errore. Riprova.')
      }
    } finally {
      setKeyLoading(false)
    }
  }

  const handleRsvpSaved = (rsvp) => {
    setMyRsvp(rsvp)
    localStorage.setItem(`piky_rsvp_${guestToken}`, JSON.stringify(rsvp))
    if (rsvp.guest_name) {
      localStorage.setItem('piky_guest_name', rsvp.guest_name)
      trackLinkView(guestToken, { guestName: rsvp.guest_name }).catch(() => {})
      // Aggiorna subito le prenotazioni riconosciute (utile dopo recupero RSVP cross-device)
      if (event?.gifts) {
        const reservedByMe = event.gifts
          .filter((g) => g.reserved_by?.toLowerCase() === rsvp.guest_name.toLowerCase())
          .map((g) => g.id)
        if (reservedByMe.length > 0) setMyReservations(reservedByMe)
      }
      // Save guest name server-side so other devices can auto-recover RSVP via sync
      const userKey = localStorage.getItem('piky_user_key')
      if (userKey) {
        addUserKeyLink(userKey, {
          linkType: 'invite',
          token: guestToken,
          childName: event?.child_name,
          partyDate: event?.party_date,
          guestName: rsvp.guest_name,
        }).catch(() => {})
      }
    }
  }

  const handleReserve = async ({ giftId, guestName, partnerName, purchasedOffline }) => {
    await reserveGift(giftId, { guestName, partnerName, purchasedOffline })
    if (guestName) {
      localStorage.setItem('piky_guest_name', guestName)
      // Save per-gift name so detection works even if RSVP overwrites piky_guest_name
      const saved = JSON.parse(localStorage.getItem('piky_reserved_gifts') || '{}')
      saved[giftId] = guestName
      localStorage.setItem('piky_reserved_gifts', JSON.stringify(saved))
    }
    setMyReservations((prev) => [...prev, giftId])
    await fetchEvent()
  }

  const handleCancelReservation = async ({ giftId, reservedBy }) => {
    const savedGiftNames = JSON.parse(localStorage.getItem('piky_reserved_gifts') || '{}')
    const guestName = savedGiftNames[giftId] || reservedBy || myRsvp?.guest_name || localStorage.getItem('piky_guest_name') || ''
    await cancelReservation(giftId, { guestName })
    // Clear the per-gift saved name
    delete savedGiftNames[giftId]
    localStorage.setItem('piky_reserved_gifts', JSON.stringify(savedGiftNames))
    setMyReservations((prev) => prev.filter((id) => id !== giftId))
    await fetchEvent()
  }

  const listClosed = event ? isListClosed(event.closing_date) : false

  const giftsWithMyFlag = (event?.gifts || []).map((g) => ({
    ...g,
    my_reservation: myReservations.includes(g.id),
  }))

  const rsvpName = myRsvp?.guest_name?.toLowerCase() || ''
  const storedName = localStorage.getItem('piky_guest_name')?.toLowerCase() || ''
  const myCollectiveContributions = (event?.contributions || []).filter((c) => {
    const name = c.contributor_name?.toLowerCase()
    return c.status === 'completed' && name && (
      (rsvpName && name === rsvpName) || (storedName && name === storedName)
    )
  })
  const myCollectiveTotal = myCollectiveContributions.reduce((acc, c) => acc + parseFloat(c.amount), 0)

  const rsvpYes = event?.rsvp?.filter((r) => r.status === 'yes') || []
  const rsvpYesCount = rsvpYes.length
  const totalAdults = rsvpYes.reduce((acc, r) => acc + (r.adults_count || (r.with_partner ? 2 : 1)), 0)
  const totalChildren = rsvpYes.reduce((acc, r) => acc + (r.children_count || 0), 0)

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-cipria border-t-salvia rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-cipria-dark mx-auto" />
            <h2 className="font-display text-2xl font-bold text-gray-800">{error}</h2>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Banner anteprima */}
      {isPreview && (
        <div className="sticky top-0 z-40 bg-salvia text-white text-sm flex items-center justify-between px-4 py-2.5 shadow-md">
          <span>Stai visualizzando l'anteprima come ospite</span>
          <button
            onClick={() => window.close()}
            className="font-medium underline hover:no-underline ml-4 whitespace-nowrap"
          >
            ← Chiudi anteprima
          </button>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* ── Header evento ───────────────────────────────────────────── */}
        <div className="card text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            event.gender === 'F' ? 'bg-cipria' : event.gender === 'M' ? 'bg-salvia/20' : 'bg-cipria'
          }`}>
            {event.gender === 'F'
              ? <HeartRibbonIcon size={40} />
              : event.gender === 'M'
              ? <BalloonIcon size={40} />
              : <BalloonIcon size={40} />
            }
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">
            Compleanno di {event.child_name}!
          </h1>

          <div className="flex flex-col items-center gap-2 text-sm text-gray-500 mb-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {event.party_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-cipria-dark" />
                  {format(new Date(event.party_date), "d MMMM yyyy", { locale: it })}
                </span>
              )}
              {event.party_time && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cipria-dark" />
                  {event.party_time.slice(0, 5)}
                </span>
              )}
            </div>
            {(event.location || event.address) && (
              event.address ? (
                <span className="flex flex-col items-center gap-0.5 text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cipria-dark flex-shrink-0" />
                    <span>{event.location || event.address}</span>
                  </span>
                  {event.location && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-gray-700 transition-colors"
                    >
                      {event.address} →
                    </a>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-gray-500">
                  <MapPin className="w-4 h-4 text-cipria-dark" />
                  <span>{event.location}</span>
                </span>
              )
            )}
          </div>

          {/* Confirmed count — visible to guests, cliccabile */}
          <button
            onClick={() => rsvpYesCount > 0 && setShowRsvpModal(true)}
            className={`inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${rsvpYesCount > 0 ? 'hover:bg-green-100 cursor-pointer' : 'cursor-default'}`}
          >
            <Users className="w-4 h-4" />
            {rsvpYesCount > 0
              ? `${totalAdults + totalChildren} confermati · ${totalAdults} adulti${totalChildren > 0 ? ` · ${totalChildren} bambini` : ''}`
              : 'Nessuna conferma ancora'}
            {rsvpYesCount > 0 && <span className="text-green-500 text-xs ml-1">›</span>}
          </button>

          {event.notes && (
            <p className="mt-4 pt-4 border-t border-avorio-dark text-sm text-gray-500 italic text-left">
              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 flex-shrink-0" />{event.notes}</span>
            </p>
          )}

        </div>

        {/* ── Countdown / stato prenotazioni ──────────────────────────── */}
        <ClosingCountdown closingDate={event.closing_date} closed={listClosed} />

        {/* ── RSVP ────────────────────────────────────────────────────── */}
        <div id="rsvp">
        <RsvpSection
          eventId={event.id}
          existingRsvp={myRsvp}
          onRsvpSaved={handleRsvpSaved}
          serverRsvps={event.rsvp || []}
          eventData={event}
          listClosed={listClosed}
        />
        </div>

        {/* ── Prompt codice personale — mostrato dopo l'RSVP ─────────── */}
        {myRsvp && !userKey && !keyPromptDismissed && !keyLinked && (
          <div className="bg-avorio rounded-2xl border border-avorio-dark p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">Vuoi ritrovare questo invito in futuro?</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Se hai già un codice Piky, inseriscilo qui per salvare questo invito e ritrovarlo sempre.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                placeholder="Es. MARCO-7X2Q"
                className="input flex-1 font-mono tracking-wider text-sm py-2"
                onKeyDown={(e) => e.key === 'Enter' && handleLinkKey()}
              />
              <button
                onClick={handleLinkKey}
                disabled={!keyInput.trim() || keyLoading}
                className="btn-primary px-4 py-2 text-sm whitespace-nowrap"
              >
                {keyLoading ? '...' : 'Collega'}
              </button>
            </div>
            {keyError && <p className="text-xs text-red-500">{keyError}</p>}
            <button
              onClick={() => setKeyPromptDismissed(true)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Non ora
            </button>
          </div>
        )}

        {keyLinked && (
          <div className="bg-salvia/10 border border-salvia/30 rounded-2xl p-3 text-center">
            <p className="text-sm text-salvia font-semibold">✓ Invito collegato al tuo codice Piky!</p>
            <p className="text-xs text-gray-500 mt-0.5">Lo troverai nella home dell'app.</p>
          </div>
        )}

        {/* ── Welcome / invitation message — seconda parte ─────────────── */}
        <div className="bg-gradient-to-br from-avorio to-white rounded-3xl border border-avorio-dark px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            Se hai voglia, trovi anche la lista dei desideri di{' '}
            <span className="font-semibold text-gray-800">{event.child_name}</span>:
            ogni regalo è in esclusiva, così nessuno si sovrappone.{' '}
            Nessun obbligo, naturalmente!
          </p>
          <div className="flex items-center gap-2">
            <BalloonIcon size={18} />
            <span className="text-sm font-semibold text-salvia">A presto!</span>
          </div>
        </div>

        {/* ── Collettivo promo ─────────────────────────────────────────── */}
        {event.collective_enabled && (
          <div className="bg-gradient-to-br from-salvia/10 to-cipria/10 rounded-3xl border border-salvia/20 p-5">
            <div className="flex items-start gap-3">
              <HeartRibbonIcon size={24} />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-salvia uppercase tracking-wide mb-0.5">Regalo collettivo</p>
                    <p className="font-display font-bold text-gray-900 text-lg leading-tight">
                      {event.collective_description || 'Regalo di gruppo'}
                    </p>
                  </div>
                  {myCollectiveTotal > 0 && (
                    <a
                      href={`${baseUrl}/collettivo/${event.collective_token}`}
                      className="text-salvia hover:text-salvia-dark transition-colors p-1 flex-shrink-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {myCollectiveTotal > 0 ? (
                  <p className="text-sm text-gray-600 mt-0.5 mb-3">
                    Hai contribuito con <span className="font-semibold text-salvia">€{myCollectiveTotal.toFixed(2)}</span>
                    {myCollectiveContributions.length > 1 && ` (${myCollectiveContributions.length} versamenti)`}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1 mb-3">
                    Unisciti agli altri invitati per completare la raccolta
                  </p>
                )}
                {(event.collective_amount > 0 || event.collective_goal > 0) && (
                  <>
                    <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-salvia rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((event.collective_amount || 0) / (event.collective_goal || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      €{(event.collective_amount || 0).toFixed(2)} su €{(event.collective_goal || 0).toFixed(2)}
                    </p>
                  </>
                )}
                {myCollectiveTotal === 0 ? (
                  <a
                    href={`${baseUrl}/collettivo/${event.collective_token}`}
                    className="btn-primary text-sm py-2 px-4 inline-block"
                  >
                    Contribuisci
                  </a>
                ) : (
                  <a
                    href={`${baseUrl}/collettivo/${event.collective_token}`}
                    className="text-xs text-gray-400 hover:text-salvia transition-colors"
                  >
                    + Aggiungi un altro contributo
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Lista regali ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl text-gray-900 flex items-center gap-2">
              Lista desideri <GiftIcon size={22} />
            </h2>
            <span className="text-sm text-gray-400">
              {giftsWithMyFlag.filter((g) => !g.reserved_by).length} disponibili
            </span>
          </div>

          {giftsWithMyFlag.length > 0 ? (
            <div className="grid gap-4">
              {/* Available gifts first */}
              {giftsWithMyFlag
                .filter((g) => !g.reserved_by || g.my_reservation)
                .map((gift) => (
                  <GiftCard
                    key={gift.id}
                    gift={gift}
                    mode="guest"
                    onReserve={handleReserve}
                    onCancelReservation={handleCancelReservation}
                    defaultGuestName={myRsvp?.guest_name || localStorage.getItem('piky_guest_name') || ''}
                    hasRsvp={!!myRsvp}
                    listClosed={listClosed}
                  />
                ))}

              {/* Reserved gifts (greyed out) */}
              {giftsWithMyFlag.filter((g) => g.reserved_by && !g.my_reservation).length > 0 && (
                <>
                  <div className="flex items-center gap-3 text-xs text-gray-400 font-medium uppercase tracking-wide">
                    <div className="flex-1 h-px bg-gray-200" />
                    Già prenotati
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  {giftsWithMyFlag
                    .filter((g) => g.reserved_by && !g.my_reservation)
                    .map((gift) => (
                      <GiftCard
                        key={gift.id}
                        gift={gift}
                        mode="guest"
                      />
                    ))}
                </>
              )}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-400">
              <Gift className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p>Nessun regalo ancora — controlla più tardi</p>
            </div>
          )}
        </div>

        {/* ── Scarica / Condividi ───────────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            onClick={() => window.dispatchEvent(new Event('piky:trigger-install'))}
            className="flex-1 inline-flex items-center justify-center bg-salvia text-white font-medium px-6 py-3 rounded-2xl hover:bg-salvia-dark transition-colors duration-200 text-sm"
          >
            Scarica l'app
          </button>
          <button
            onClick={async () => {
              const shareData = {
                title: 'Piky — Lista desideri per compleanni',
                text: 'Crea la wishlist per il compleanno, condividila con gli invitati e zero doppioni!',
                url: window.location.origin,
              }
              if (navigator.share) {
                await navigator.share(shareData)
              } else {
                await navigator.clipboard.writeText(window.location.origin)
                alert('Link copiato!')
              }
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-salvia text-white font-medium px-6 py-3 rounded-2xl hover:bg-salvia-dark transition-colors duration-200 text-sm"
          >
            <Share2 className="w-4 h-4" />
            Condividi
          </button>
        </div>

      </div>

      {/* ── Modal confermati ─────────────────────────────────────────────── */}
      {showRsvpModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4"
          onClick={() => setShowRsvpModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-gray-900 text-lg">Chi partecipa 🎉</h3>
              <button onClick={() => setShowRsvpModal(false)} className="text-gray-300 hover:text-gray-500 text-xl leading-none">✕</button>
            </div>
            <ul className="space-y-2">
              {event.rsvp
                .filter((r) => r.status === 'yes')
                .map((r, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5 border-b border-avorio-dark last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">
                        {r.guest_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-gray-800 text-sm">{r.guest_name}</span>
                    </div>
                    {r.children_count > 0 && (
                      <span className="text-xs text-gray-400">+{r.children_count} bambini</span>
                    )}
                  </li>
                ))}
            </ul>
            <p className="text-xs text-gray-400 text-center">
              {totalAdults + totalChildren} confermati · {totalAdults} adulti{totalChildren > 0 ? ` · ${totalChildren} bambini` : ''}
            </p>
          </div>
        </div>
      )}
    </Layout>
  )
}

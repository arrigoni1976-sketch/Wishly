import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar, CalendarPlus, MapPin, Users, Gift, HelpCircle, Frown, AlertCircle, FileText, Share2 } from 'lucide-react'
import Layout from '../components/Layout'
import GiftCard from '../components/GiftCard'
import GiftIcon from '../components/GiftIcon'
import BalloonIcon from '../components/BalloonIcon'
import HeartRibbonIcon from '../components/HeartRibbonIcon'
import CelebrationIcon from '../components/CelebrationIcon'
import WaveIcon from '../components/WaveIcon'
import RSVPSelector from '../components/RSVPSelector'
import CopyLink from '../components/CopyLink'
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

// ─── Calendar helper ───────────────────────────────────────────────────────
function downloadIcs({ childName, partyDate, partyTime, location, inviteUrl }) {
  const pad = (n) => String(n).padStart(2, '0')

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
function RsvpSection({ eventId, existingRsvp, onRsvpSaved, serverRsvps = [], eventData = null }) {
  const [step, setStep] = useState(existingRsvp ? 'done' : 'prompt') // 'prompt' | 'form' | 'done' | 'recover'
  const [guestName, setGuestName] = useState(existingRsvp?.guest_name || '')
  const [guestEmail, setGuestEmail] = useState(existingRsvp?.guest_email || '')
  const [status, setStatus] = useState(existingRsvp?.status || '')
  const [childrenCount, setChildrenCount] = useState(existingRsvp?.children_count || 0)
  const [withPartner, setWithPartner] = useState(existingRsvp?.with_partner || false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [recoverName, setRecoverName] = useState('')
  const [recoverError, setRecoverError] = useState('')

  const handleSubmit = async () => {
    if (!guestName.trim() || !status) return
    setLoading(true)
    try {
      let res
      if (existingRsvp?.id) {
        res = await updateRsvp(existingRsvp.id, { status, childrenCount, withPartner })
      } else {
        res = await submitRsvp(eventId, {
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          status,
          childrenCount,
          withPartner,
        })
      }
      onRsvpSaved(res.data)
      setStep('done')
      setSaved(true)
    } catch {
      /* handle silently */
    } finally {
      setLoading(false)
    }
  }

  const handleRecover = () => {
    const name = recoverName.trim().toLowerCase()
    if (!name) return
    const found = serverRsvps.find((r) => r.guest_name?.toLowerCase() === name)
    if (found) {
      onRsvpSaved(found)
      setStatus(found.status)
      setChildrenCount(found.children_count || 0)
      setWithPartner(found.with_partner || false)
      setStep('done')
    } else {
      setRecoverError('Nessuna risposta trovata con questo nome.')
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
          {recoverError && <p className="text-xs text-red-500 mt-1">{recoverError}</p>}
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
        <div className="flex items-center justify-between">
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
          <button
            onClick={() => setStep('form')}
            className="text-sm text-salvia hover:underline font-medium"
          >
            Modifica
          </button>
        </div>
        {(status === 'yes' || status === 'maybe') && eventData && (
          <button
            onClick={() => downloadIcs({
              childName: eventData.child_name,
              partyDate: eventData.party_date,
              partyTime: eventData.party_time,
              location: eventData.location,
              inviteUrl: window.location.href,
            })}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-salvia border border-salvia/30 rounded-2xl hover:bg-salvia/5 transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            Aggiungi al calendario
          </button>
        )}
      </div>
    )
  }

  if (step === 'prompt') {
    return (
      <div className="bg-white rounded-3xl border border-cipria/40 p-5 text-center">
        <p className="font-semibold text-gray-800 mb-1">Puoi partecipare?</p>
        <p className="text-sm text-gray-500 mb-4">Fai sapere ai festeggiati se ci sarai</p>
        <button
          onClick={() => setStep('form')}
          className="btn-primary text-sm px-6 py-2.5"
        >
          Conferma la tua presenza
        </button>
        {serverRsvps.length > 0 && (
          <button
            onClick={() => setStep('recover')}
            className="block w-full mt-3 text-xs text-gray-400 hover:text-salvia transition-colors"
          >
            Hai già risposto? Ritrova la tua risposta →
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-avorio-dark p-5 space-y-4 animate-fade-in">
      <h3 className="font-display font-bold text-gray-900">La tua risposta</h3>

      {!existingRsvp && (
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
      )}

      <div>
        <label className="label">Parteciperai?</label>
        <RSVPSelector value={status} onChange={setStatus} />
      </div>

      {status === 'yes' && (
        <>
          <div>
            <label className="label">Vieni con qualcuno?</label>
            <div className="flex rounded-xl border border-avorio-dark overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setWithPartner(false)}
                className={`flex-1 py-2.5 font-medium transition-colors ${
                  !withPartner ? 'bg-salvia text-white' : 'text-gray-500 hover:bg-avorio'
                }`}
              >
                Solo/a
              </button>
              <button
                type="button"
                onClick={() => setWithPartner(true)}
                className={`flex-1 py-2.5 font-medium transition-colors ${
                  withPartner ? 'bg-salvia text-white' : 'text-gray-500 hover:bg-avorio'
                }`}
              >
                Con il/la mio partner
              </button>
            </div>
          </div>

          <div>
            <label className="label">Porti bambini? (quanti)</label>
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
        </>
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
      setEvent(res.data)
      // Salva l'invito nel localStorage per ritrovarlo dalla homepage
      const saved = JSON.parse(localStorage.getItem('piky_invites') || '[]')
      const alreadySaved = saved.find((e) => e.guestToken === guestToken)
      if (!alreadySaved) {
        saved.unshift({
          childName: res.data.child_name,
          partyDate: res.data.party_date,
          guestToken,
          visitedAt: new Date().toISOString(),
        })
        localStorage.setItem('piky_invites', JSON.stringify(saved.slice(0, 20)))
      }
    } catch {
      setError('Lista non trovata o link non valido.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvent() }, [guestToken])

  // Register invite under personal key (non-blocking)
  useEffect(() => {
    if (!event) return
    const userKey = localStorage.getItem('piky_user_key')
    if (userKey) {
      addUserKeyLink(userKey, {
        linkType: 'invite',
        token: guestToken,
        childName: event.child_name,
        partyDate: event.party_date,
      }).catch(() => {})
    }
  }, [event])

  // Auto-recover RSVP and gift reservations from server if name is known
  useEffect(() => {
    if (!event) return
    const storedName = localStorage.getItem('piky_guest_name')
    if (!storedName) return

    // Recover RSVP
    if (!myRsvp) {
      const found = event.rsvp?.find(
        (r) => r.guest_name?.toLowerCase() === storedName.toLowerCase()
      )
      if (found) {
        setMyRsvp(found)
        localStorage.setItem(`piky_rsvp_${guestToken}`, JSON.stringify(found))
      }
    }

    // Recover gift reservations
    const reservedByMe = (event.gifts || [])
      .filter((g) => g.reserved_by?.toLowerCase() === storedName.toLowerCase())
      .map((g) => g.id)
    if (reservedByMe.length > 0) {
      setMyReservations(reservedByMe)
    }
  }, [event])

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
    if (guestName) localStorage.setItem('piky_guest_name', guestName)
    setMyReservations((prev) => [...prev, giftId])
    await fetchEvent()
  }

  const handleCancelReservation = async ({ giftId }) => {
    await cancelReservation(giftId, {})
    setMyReservations((prev) => prev.filter((id) => id !== giftId))
    await fetchEvent()
  }

  const giftsWithMyFlag = (event?.gifts || []).map((g) => ({
    ...g,
    my_reservation: myReservations.includes(g.id),
  }))

  const rsvpYesCount = event?.rsvp?.filter((r) => r.status === 'yes').length || 0
  const totalChildren = event?.rsvp?.filter((r) => r.status === 'yes')
    .reduce((acc, r) => acc + (r.children_count || 0), 0) || 0

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
      {/* View name prompt */}

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

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 mb-4">
            {event.party_date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cipria-dark" />
                {format(new Date(event.party_date), "d MMMM yyyy", { locale: it })}
                {event.party_time && ` · ${event.party_time.slice(0, 5)}`}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cipria-dark" />
                {event.location}
              </span>
            )}
          </div>

          {/* Confirmed count — visible to guests, cliccabile */}
          <button
            onClick={() => rsvpYesCount > 0 && setShowRsvpModal(true)}
            className={`inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${rsvpYesCount > 0 ? 'hover:bg-green-100 cursor-pointer' : 'cursor-default'}`}
          >
            <Users className="w-4 h-4" />
            {rsvpYesCount > 0
              ? `${rsvpYesCount} ${rsvpYesCount === 1 ? 'persona confermata' : 'persone confermate'}`
              : 'Nessuna conferma ancora'}
            {totalChildren > 0 && ` · ${totalChildren} bambini`}
            {rsvpYesCount > 0 && <span className="text-green-500 text-xs ml-1">›</span>}
          </button>

          {event.notes && (
            <p className="mt-4 pt-4 border-t border-avorio-dark text-sm text-gray-500 italic text-left">
              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 flex-shrink-0" />{event.notes}</span>
            </p>
          )}

        </div>

        {/* ── Prompt codice personale ─────────────────────────────────── */}
        {!userKey && !keyPromptDismissed && !keyLinked && (
          <div className="bg-avorio rounded-2xl border border-avorio-dark p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">Salva questo invito sul tuo Piky</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Hai già un codice personale? Inseriscilo per ritrovare questo invito dall'app su qualsiasi dispositivo.
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

        {/* ── Welcome / invitation message ────────────────────────────── */}
        <div className="bg-gradient-to-br from-avorio to-white rounded-3xl border border-avorio-dark p-6 space-y-4">
          {/* Greeting row */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cipria/30 rounded-2xl flex items-center justify-center flex-shrink-0">
              <WaveIcon size={26} />
            </div>
            <h2 className="font-display font-bold text-gray-900 text-lg leading-snug">
              Sei invitato al compleanno di {event.child_name}!
            </h2>
          </div>

          {/* Event details recap */}
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {event.party_date && (
              <span className="inline-flex items-center gap-1.5 bg-white border border-avorio-dark rounded-xl px-3 py-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-cipria-dark flex-shrink-0" />
                {format(new Date(event.party_date), "d MMMM yyyy", { locale: it })}
                {event.party_time && <> · {event.party_time.slice(0, 5)}</>}
              </span>
            )}
            {event.location && (
              <span className="inline-flex items-center gap-1.5 bg-white border border-avorio-dark rounded-xl px-3 py-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-cipria-dark flex-shrink-0" />
                {event.location}
              </span>
            )}
          </div>

          {/* Invitation text */}
          <p className="text-sm text-gray-600 leading-relaxed">
            Ci farebbe molto piacere festeggiare insieme a te — facci sapere se riesci a esserci con la tua risposta qui sotto.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Se hai voglia, trovi anche la lista dei desideri di{' '}
            <span className="font-semibold text-gray-800">{event.child_name}</span>:
            ogni regalo è in esclusiva, così nessuno si sovrappone.{' '}
            Nessun obbligo, naturalmente!
          </p>

          {/* Sign-off */}
          <div className="flex items-center gap-2 pt-1">
            <BalloonIcon size={18} />
            <span className="text-sm font-semibold text-salvia">A presto!</span>
          </div>
        </div>

        {/* ── RSVP ────────────────────────────────────────────────────── */}
        <RsvpSection
          eventId={event.id}
          existingRsvp={myRsvp}
          onRsvpSaved={handleRsvpSaved}
          serverRsvps={event.rsvp || []}
          eventData={event}
        />

        {/* ── Collettivo promo ─────────────────────────────────────────── */}
        {event.collective_enabled && (
          <div className="bg-gradient-to-br from-salvia/10 to-cipria/10 rounded-3xl border border-salvia/20 p-5">
            <div className="flex items-start gap-3">
              <HeartRibbonIcon size={24} />
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Regalo collettivo</p>
                <p className="text-sm text-gray-500 mt-0.5 mb-3">
                  Puoi contribuire al regalo collettivo con il link dedicato
                </p>
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
                <a
                  href={`${baseUrl}/collettivo/${event.collective_token}`}
                  className="btn-primary text-sm py-2 px-4 inline-block"
                >
                  Contribuisci
                </a>
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
              {rsvpYesCount} {rsvpYesCount === 1 ? 'persona confermata' : 'persone confermate'}
              {totalChildren > 0 && ` · ${totalChildren} bambini`}
            </p>
          </div>
        </div>
      )}
    </Layout>
  )
}

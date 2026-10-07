import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import DownloadButton from '../components/DownloadButton'
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
import { formatEur } from '../lib/format'

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
function addToCalendar({ childName, partyDate, partyTime, location, inviteUrl, t }) {
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

  const summary = t('guest.ics.summary', { name: childName })
  const descBase = t('guest.ics.description')
  const linkLabel = t('guest.ics.link_label')

  if (isAndroid) {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: summary,
      dates: `${dtStart}/${dtEnd}`,
      details: inviteUrl ? `${descBase}\n${linkLabel} ${inviteUrl}` : descBase,
    })
    if (location) params.set('location', location)
    window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank')
    return
  }

  // iOS / desktop: download .ics
  const isAllDay = !partyTime
  const description = inviteUrl
    ? `${descBase}\\n${linkLabel} ${inviteUrl}`
    : descBase

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Piky//Piky App//IT',
    'BEGIN:VEVENT',
    `SUMMARY:${summary}`,
    isAllDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
    isAllDay ? `DTEND;VALUE=DATE:${dtEnd}` : `DTEND:${dtEnd}`,
    location ? `LOCATION:${location}` : '',
    `DESCRIPTION:${description}`,
    inviteUrl ? `URL:${inviteUrl}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${t('guest.ics.alarm1', { name: childName })}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${t('guest.ics.alarm2', { name: childName })}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `birthday-${childName.toLowerCase().replace(/\s+/g, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── RSVP Form ─────────────────────────────────────────────────────────────
function RsvpSection({ eventId, guestToken, existingRsvp, onRsvpSaved, serverRsvps = [], eventData = null, listClosed = false }) {
  const [step, setStep] = useState(existingRsvp ? 'done' : 'prompt') // 'prompt' | 'form' | 'done' | 'recover'
  const [guestName, setGuestName] = useState(existingRsvp?.guest_name || '')
  const [parentName, setParentName] = useState(existingRsvp?.parent_name || '')
  const [status, setStatus] = useState(existingRsvp?.status || '')
  const [extraAdults, setExtraAdults] = useState(
    Array(Math.max(0, (existingRsvp?.adults_count || 1) - 1)).fill('')
  )
  const [extraChildren, setExtraChildren] = useState(
    Array(Math.max(0, (existingRsvp?.children_count || 1) - 1)).fill('')
  )
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [recoverName, setRecoverName] = useState('')
  const [recoverError, setRecoverError] = useState('')
  const idempotencyKeyRef = useRef(null)
  const { t } = useTranslation()

  const handleSubmit = async () => {
    if (!guestName.trim() || !parentName.trim() || !status) return
    setLoading(true)
    setSubmitError('')
    try {
      let res
      if (existingRsvp?.id) {
        res = await updateRsvp(existingRsvp.id, {
          status,
          childrenCount: 1 + extraChildren.length,
          adultsCount: 1 + extraAdults.length,
          guestName: guestName.trim(),
          parentName: parentName.trim(),
        }, guestToken)
      } else {
        // Stessa chiave riusata sui retry (es. dopo un errore di rete) per evitare
        // invii/notifiche duplicate
        if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID()
        res = await submitRsvp(eventId, {
          guestName: guestName.trim(),
          parentName: parentName.trim(),
          status,
          childrenCount: 1 + extraChildren.length,
          adultsCount: 1 + extraAdults.length,
          idempotencyKey: idempotencyKeyRef.current,
        })
      }
      onRsvpSaved(res.data)
      setStep('done')
      setSaved(true)
    } catch {
      setSubmitError(t('guest.rsvp.form.error'))
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
      setStep('done')
    } else {
      setRecoverError(
        serverRsvps.length === 0
          ? t('guest.rsvp.recover.not_found')
          : t('guest.rsvp.recover.error', { name: recoverName.trim() })
      )
    }
  }

  if (step === 'recover') {
    return (
      <div className="bg-white rounded-3xl border border-avorio-dark p-5 space-y-4 animate-fade-in">
        <h3 className="font-display font-bold text-gray-900">{t('guest.rsvp.recover.title')}</h3>
        <div>
          <label className="label">{t('guest.rsvp.recover.label')}</label>
          <input
            value={recoverName}
            onChange={(e) => { setRecoverName(e.target.value); setRecoverError('') }}
            placeholder={t('guest.rsvp.recover.placeholder')}
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
            {t('guest.rsvp.recover.cancel')}
          </button>
          <button
            onClick={handleRecover}
            disabled={!recoverName.trim()}
            className="flex-1 btn-primary text-sm py-2.5"
          >
            {t('guest.rsvp.recover.submit')}
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
              {t('guest.rsvp.done.greeting', { name: parentName || existingRsvp?.parent_name || guestName || existingRsvp?.guest_name })}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('guest.rsvp.done.answered')}{' '}
              <span className="font-medium">
                <span className="flex items-center gap-1">
                  {status === 'yes' ? <><CelebrationIcon size={14} /> {t('guest.rsvp.done.yes')}</>
                   : status === 'maybe' ? <><HelpCircle className="w-3.5 h-3.5" /> {t('guest.rsvp.done.maybe')}</>
                   : <><Frown className="w-3.5 h-3.5" /> {t('guest.rsvp.done.no')}</>}
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
              t,
            })}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-salvia bg-salvia/10 border border-salvia/40 rounded-2xl hover:bg-salvia/20 transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            {t('guest.rsvp.done.calendar')}
          </button>
        )}
        {status === 'no' && (
          <p className="text-sm text-gray-500 bg-cipria/20 border border-cipria/30 rounded-2xl px-4 py-3 leading-relaxed">
            {t('guest.rsvp.done.no_msg')}
          </p>
        )}
        {status === 'maybe' && (
          <p className="text-sm text-gray-500 bg-cipria/20 border border-cipria/30 rounded-2xl px-4 py-3 leading-relaxed">
            {t('guest.rsvp.done.maybe_msg')}
          </p>
        )}
      </div>
    )
  }

  if (step === 'prompt' && listClosed) {
    return (
      <div className="bg-avorio rounded-3xl border border-avorio-dark p-6 text-center space-y-2">
        <Lock className="w-6 h-6 text-gray-400 mx-auto" />
        <p className="font-display font-semibold text-gray-700">{t('guest.rsvp.closed.title')}</p>
        <p className="text-sm text-gray-400 leading-relaxed">
          {t('guest.rsvp.closed.body')}
        </p>
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
                {t('guest.rsvp.prompt.recover_title')}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t('guest.rsvp.prompt.recover_subtitle')}
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
              {t('guest.rsvp.prompt.title', { name: eventData?.child_name })}
            </h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {t('guest.rsvp.prompt.body')}
          </p>
          <button
            onClick={() => setStep('form')}
            className="btn-primary w-full text-sm py-3"
          >
            {t('guest.rsvp.prompt.btn')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-avorio-dark p-5 space-y-4 animate-fade-in">
      <h3 className="font-display font-bold text-gray-900">{t('guest.rsvp.form.title')}</h3>

      {/* Nome bambino + extra bambini */}
      <div className="space-y-2">
        <label className="label">{t('guest.rsvp.form.child_name.label')}</label>
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder={t('guest.rsvp.form.child_name.placeholder')}
          className="input"
        />
        {extraChildren.map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const next = [...extraChildren]
                next[i] = e.target.value
                setExtraChildren(next)
              }}
              placeholder={t('guest.rsvp.form.extra_child.placeholder')}
              className="input text-sm py-2 flex-1"
            />
            <button
              type="button"
              onClick={() => setExtraChildren(extraChildren.filter((_, j) => j !== i))}
              className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center text-lg"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setExtraChildren([...extraChildren, ''])}
          className="text-sm text-salvia hover:text-salvia/80 font-medium"
        >
          {t('guest.rsvp.form.add_child')}
        </button>
      </div>

      {/* Nome genitore + extra adulti */}
      <div className="space-y-2">
        <label className="label">{t('guest.rsvp.form.parent_name.label')}</label>
        <input
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
          placeholder={t('guest.rsvp.form.parent_name.placeholder')}
          className="input"
        />
        {extraAdults.map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const next = [...extraAdults]
                next[i] = e.target.value
                setExtraAdults(next)
              }}
              placeholder={t('guest.rsvp.form.extra_adult.placeholder')}
              className="input text-sm py-2 flex-1"
            />
            <button
              type="button"
              onClick={() => setExtraAdults(extraAdults.filter((_, j) => j !== i))}
              className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center text-lg"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setExtraAdults([...extraAdults, ''])}
          className="text-sm text-salvia hover:text-salvia/80 font-medium"
        >
          {t('guest.rsvp.form.add_adult')}
        </button>
      </div>

      <div>
        <label className="label">{t('guest.rsvp.form.status.label')}</label>
        <RSVPSelector value={status} onChange={setStatus} />
      </div>

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {submitError}
        </p>
      )}

      <div className="flex gap-3">
        {existingRsvp && (
          <button onClick={() => setStep('done')} className="flex-1 btn-outline text-sm py-2.5">
            {t('guest.rsvp.form.cancel')}
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!guestName.trim() || !parentName.trim() || !status || loading}
          className="flex-1 btn-primary text-sm py-2.5"
        >
          {loading ? t('guest.rsvp.form.loading') : t('guest.rsvp.form.submit')}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function GuestWishlistPage() {
  const { guestToken } = useParams()
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
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
      setError(t('guest.error.not_found'))
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
        setKeyError(t('guest.key.prompt.error_notfound'))
      } else {
        setKeyError(t('guest.key.prompt.error_generic'))
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
          <span>{t('guest.preview.banner')}</span>
          <button
            onClick={() => window.close()}
            className="font-medium underline hover:no-underline ml-4 whitespace-nowrap"
          >
            {t('guest.preview.close')}
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
            {t('guest.header.title', { name: event.child_name })}
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
          {rsvpYesCount > 0 && (
            <p className="text-sm text-gray-500 mt-1 mb-2 flex items-center justify-center gap-1.5">
              {t('guest.header.rsvp_hint')} <BalloonIcon size={18} />
            </p>
          )}
          <button
            onClick={() => rsvpYesCount > 0 && setShowRsvpModal(true)}
            className={`inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${rsvpYesCount > 0 ? 'hover:bg-green-100 cursor-pointer' : 'cursor-default'}`}
          >
            <Users className="w-4 h-4" />
            {rsvpYesCount > 0
              ? `${totalAdults + totalChildren} ${t('guest.rsvp_modal.adults_other')} · ${totalAdults} ${totalAdults === 1 ? t('guest.rsvp_modal.adults_one') : t('guest.rsvp_modal.adults_other')}${totalChildren > 0 ? ` · ${totalChildren} ${totalChildren === 1 ? t('guest.rsvp_modal.children_one') : t('guest.rsvp_modal.children_other')}` : ''}`
              : t('guest.header.no_confirm')}
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
          guestToken={guestToken}
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
              <p className="text-sm font-semibold text-gray-700">{t('guest.key.prompt.title')}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t('guest.key.prompt.body')}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                placeholder={t('guest.key.prompt.placeholder')}
                className="input flex-1 font-mono tracking-wider text-sm py-2"
                onKeyDown={(e) => e.key === 'Enter' && handleLinkKey()}
              />
              <button
                onClick={handleLinkKey}
                disabled={!keyInput.trim() || keyLoading}
                className="btn-primary px-4 py-2 text-sm whitespace-nowrap"
              >
                {keyLoading ? '...' : t('guest.key.prompt.btn')}
              </button>
            </div>
            {keyError && <p className="text-xs text-red-500">{keyError}</p>}
            <button
              onClick={() => setKeyPromptDismissed(true)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('guest.key.prompt.dismiss')}
            </button>
          </div>
        )}

        {keyLinked && (
          <div className="bg-salvia/10 border border-salvia/30 rounded-2xl p-3 text-center">
            <p className="text-sm text-salvia font-semibold">{t('guest.key.linked.title')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('guest.key.linked.body')}</p>
          </div>
        )}

        {/* ── Welcome / invitation message — seconda parte ─────────────── */}
        <div className="bg-gradient-to-br from-avorio to-white rounded-3xl border border-avorio-dark px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: t('guest.welcome.body', { name: event.child_name }) }}
          />
          <div className="flex items-center gap-2">
            <BalloonIcon size={18} />
            <span className="text-sm font-semibold text-salvia">{t('guest.welcome.closing')}</span>
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
                    <p className="text-xs font-medium text-salvia uppercase tracking-wide mb-0.5">{t('guest.collective.label')}</p>
                    <p className="font-display font-bold text-gray-900 text-lg leading-tight">
                      {event.collective_description || t('guest.collective.default_title')}
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
                  <p className="text-sm text-gray-600 mt-0.5 mb-3"
                    dangerouslySetInnerHTML={{ __html: t('guest.collective.my_contrib', { amount: formatEur(myCollectiveTotal) }) + (myCollectiveContributions.length > 1 ? ` ${t('guest.collective.payments_count', { count: myCollectiveContributions.length })}` : '') }}
                  />
                ) : (
                  <p className="text-sm text-gray-500 mt-1 mb-3">
                    {t('guest.collective.join_hint')}
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
                      €{formatEur(event.collective_amount || 0)} su €{formatEur(event.collective_goal || 0)}
                    </p>
                  </>
                )}
                {myCollectiveTotal === 0 ? (
                  <a
                    href={`${baseUrl}/collettivo/${event.collective_token}`}
                    className="btn-primary text-sm py-2 px-4 inline-block"
                  >
                    {t('guest.collective.contribute_btn')}
                  </a>
                ) : (
                  <a
                    href={`${baseUrl}/collettivo/${event.collective_token}`}
                    className="text-xs text-gray-400 hover:text-salvia transition-colors"
                  >
                    {t('guest.collective.add_more')}
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
              {t('guest.wishlist.title')} <GiftIcon size={22} />
            </h2>
            <span className="text-sm text-gray-400">
              {t('guest.wishlist.available', { count: giftsWithMyFlag.filter((g) => !g.reserved_by).length })}
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
                    {t('guest.wishlist.reserved_separator')}
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
              <p>{t('guest.wishlist.empty')}</p>
            </div>
          )}
        </div>

        {/* ── Scarica / Condividi ───────────────────────────────────────── */}
        <div className="flex gap-3">
          <DownloadButton className="flex-1 inline-flex items-center justify-center bg-salvia text-white font-medium px-6 py-3 rounded-2xl hover:bg-salvia-dark transition-colors duration-200 text-sm" />
          <button
            onClick={async () => {
              const shareData = {
                title: 'Piky',
                text: t('home.final_cta.share_text'),
                url: `${window.location.origin}/scarica`,
              }
              if (navigator.share) {
                await navigator.share(shareData)
              } else {
                await navigator.clipboard.writeText(window.location.origin)
                alert(t('guest.share.copied_alert'))
              }
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-salvia text-white font-medium px-6 py-3 rounded-2xl hover:bg-salvia-dark transition-colors duration-200 text-sm"
          >
            <Share2 className="w-4 h-4" />
            {t('guest.share.btn')}
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
            className="bg-white rounded-3xl w-full max-w-sm animate-slide-up flex flex-col"
            style={{ maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header fisso */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
              <h3 className="font-display font-bold text-gray-900 text-lg">{t('guest.rsvp_modal.title')}</h3>
              <button onClick={() => setShowRsvpModal(false)} className="text-gray-300 hover:text-gray-500 text-xl leading-none">✕</button>
            </div>
            {/* Lista scrollabile */}
            <ul className="overflow-y-auto px-6 flex-1">
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
                    <span className="text-xs text-gray-400">
                      {[
                        r.adults_count > 0 && `+${r.adults_count} ${r.adults_count === 1 ? t('guest.rsvp_modal.adults_one') : t('guest.rsvp_modal.adults_other')}`,
                        r.children_count > 1 && `+${r.children_count - 1} ${r.children_count - 1 === 1 ? t('guest.rsvp_modal.children_one') : t('guest.rsvp_modal.children_other')}`,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </li>
                ))}
            </ul>
            {/* Footer fisso */}
            <p className="text-xs text-gray-400 text-center px-6 py-4 flex-shrink-0">
              {totalAdults + totalChildren} {t('guest.rsvp_modal.adults_other')} · {totalAdults} {totalAdults === 1 ? t('guest.rsvp_modal.adults_one') : t('guest.rsvp_modal.adults_other')}{totalChildren > 0 ? ` · ${totalChildren} ${totalChildren === 1 ? t('guest.rsvp_modal.children_one') : t('guest.rsvp_modal.children_other')}` : ''}
            </p>
          </div>
        </div>
      )}
    </Layout>
  )
}

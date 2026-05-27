import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar, MapPin, Users, Gift, HelpCircle, Frown, AlertCircle, FileText, Share2 } from 'lucide-react'
import Layout from '../components/Layout'
import GiftCard from '../components/GiftCard'
import GiftIcon from '../components/GiftIcon'
import BalloonIcon from '../components/BalloonIcon'
import HeartRibbonIcon from '../components/HeartRibbonIcon'
import CelebrationIcon from '../components/CelebrationIcon'
import RSVPSelector from '../components/RSVPSelector'
import CopyLink from '../components/CopyLink'
import {
  getEventByGuestToken,
  trackLinkView,
  reserveGift,
  cancelReservation,
  submitRsvp,
  updateRsvp,
} from '../lib/api'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import clsx from 'clsx'

// ─── RSVP Form ─────────────────────────────────────────────────────────────
function RsvpSection({ eventId, existingRsvp, onRsvpSaved }) {
  const [step, setStep] = useState(existingRsvp ? 'done' : 'prompt') // 'prompt' | 'form' | 'done'
  const [guestName, setGuestName] = useState(existingRsvp?.guest_name || '')
  const [guestEmail, setGuestEmail] = useState(existingRsvp?.guest_email || '')
  const [status, setStatus] = useState(existingRsvp?.status || '')
  const [childrenCount, setChildrenCount] = useState(existingRsvp?.children_count || 0)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async () => {
    if (!guestName.trim() || !status) return
    setLoading(true)
    try {
      let res
      if (existingRsvp?.id) {
        res = await updateRsvp(existingRsvp.id, { status, childrenCount })
      } else {
        res = await submitRsvp(eventId, {
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          status,
          childrenCount,
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

  if (step === 'done') {
    return (
      <div className="bg-white rounded-3xl border border-avorio-dark p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">
              {saved ? 'RSVP salvato!' : `Ciao, ${existingRsvp?.guest_name}`}
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
          Rispondi all'RSVP
        </button>
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
  const [myRsvp, setMyRsvp] = useState(null)
  const [myReservations, setMyReservations] = useState([]) // gift IDs
  const [viewTracked, setViewTracked] = useState(false)

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

  // Track view silently after 2s
  useEffect(() => {
    if (!event || viewTracked) return
    const timer = setTimeout(() => {
      trackLinkView(guestToken, {}).catch(() => {})
      setViewTracked(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [event, viewTracked])

  const handleReserve = async ({ giftId, guestName, partnerName, purchasedOffline }) => {
    await reserveGift(giftId, { guestName, partnerName, purchasedOffline })
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
          <div className="w-16 h-16 bg-cipria rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BalloonIcon size={40} />
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

          {/* Confirmed count — visible to guests */}
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-2 text-sm font-medium">
            <Users className="w-4 h-4" />
            {rsvpYesCount > 0
              ? `${rsvpYesCount} ${rsvpYesCount === 1 ? 'persona confermata' : 'persone confermate'}`
              : 'Nessuna conferma ancora'}
            {totalChildren > 0 && ` · ${totalChildren} bambini`}
          </div>

          {event.notes && (
            <p className="mt-4 pt-4 border-t border-avorio-dark text-sm text-gray-500 italic text-left">
              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 flex-shrink-0" />{event.notes}</span>
            </p>
          )}

          {/* Share button */}
          <button
            onClick={async () => {
              const shareData = {
                title: `Compleanno di ${event.child_name}`,
                text: `Prenota un regalo per il compleanno di ${event.child_name}! 🎈`,
                url: window.location.href,
              }
              if (navigator.share) {
                await navigator.share(shareData)
              } else {
                await navigator.clipboard.writeText(window.location.href)
                alert('Link copiato!')
              }
            }}
            className="mt-4 inline-flex items-center gap-2 text-sm text-salvia font-medium hover:text-salvia-dark transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Condividi la lista
          </button>
        </div>

        {/* ── RSVP ────────────────────────────────────────────────────── */}
        <RsvpSection
          eventId={event.id}
          existingRsvp={myRsvp}
          onRsvpSaved={setMyRsvp}
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
    </Layout>
  )
}

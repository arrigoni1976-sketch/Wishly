import { useEffect } from 'react'
import { X, Calendar, Clock, MapPin, Gift, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import GiftCard from './GiftCard'
import GiftIcon from './GiftIcon'
import BalloonIcon from './BalloonIcon'
import HeartRibbonIcon from './HeartRibbonIcon'
import WaveIcon from './WaveIcon'
import ClosingCountdown from './ClosingCountdown'
import { formatEur } from '../lib/format'

function buildEvent(data) {
  return {
    child_name: data.childName?.trim() || '…',
    gender: data.gender || '',
    party_date: data.partyDate || null,
    party_time: data.partyTime || null,
    location: data.location?.trim() || null,
    address: data.address?.trim() || null,
    notes: data.notes?.trim() || null,
    closing_date: data.closingDate || null,
    collective_enabled: !!data.collectiveEnabled,
    collective_goal: data.collectiveGoal ? parseFloat(data.collectiveGoal) : null,
    collective_description: data.collectiveDescription?.trim() || null,
    gifts: (data.gifts || [])
      .filter((g) => g?.name?.trim())
      .map((g, i) => ({
        id: `preview-${i}`,
        name: g.name,
        description: g.description?.trim() || null,
        price: g.price ? parseFloat(g.price) : null,
        link: g.link?.trim() || null,
        link2: g.link2?.trim() || null,
        reserved_by: null,
        my_reservation: false,
        image_url: null,
      })),
  }
}

export default function WishlistPreviewModal({ formData, onClose }) {
  const { t } = useTranslation()
  const event = buildEvent(formData)

  // Blocca lo scroll della pagina sottostante
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Chiudi con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FAF7F2]">

      {/* ── Banner preview ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-salvia text-white text-sm flex items-center justify-between px-4 py-2.5 shadow-md">
        <span className="font-medium">{t('guest.preview.banner')}</span>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 underline hover:no-underline ml-4 whitespace-nowrap"
        >
          <X className="w-4 h-4" />
          {t('guest.preview.close')}
        </button>
      </div>

      {/* ── Contenuto scrollabile ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

          {/* ── Header evento ─────────────────────────────────────────── */}
          <div className="card text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              event.gender === 'F' ? 'bg-cipria' : 'bg-salvia/20'
            }`}>
              {event.gender === 'F'
                ? <HeartRibbonIcon size={40} />
                : <BalloonIcon size={40} />}
            </div>

            <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">
              {t('guest.header.title', { name: event.child_name })}
            </h1>

            <div className="flex flex-col items-center gap-2 text-sm text-gray-500 mb-4">
              <div className="flex flex-wrap items-center justify-center gap-4">
                {event.party_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-cipria-dark" />
                    {format(new Date(event.party_date), 'd MMMM yyyy', { locale: it })}
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
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-cipria-dark" />
                  {event.location || event.address}
                </span>
              )}
            </div>

            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-2 text-sm font-medium">
              <Users className="w-4 h-4" />
              {t('guest.header.no_confirm')}
            </div>

            {event.notes && (
              <p className="mt-4 pt-4 border-t border-avorio-dark text-sm text-gray-500 italic text-left">
                {event.notes}
              </p>
            )}
          </div>

          {/* ── Countdown chiusura ────────────────────────────────────── */}
          <ClosingCountdown closingDate={event.closing_date} closed={false} />

          {/* ── RSVP (non interattivo) ────────────────────────────────── */}
          <div className="bg-gradient-to-br from-avorio to-white rounded-3xl border border-avorio-dark p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cipria/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                <WaveIcon size={26} />
              </div>
              <h2 className="font-display font-bold text-gray-900 text-lg leading-snug">
                {t('guest.rsvp.prompt.title', { name: event.child_name })}
              </h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('guest.rsvp.prompt.body')}
            </p>
            <button
              disabled
              className="btn-primary w-full text-sm py-3 opacity-50 cursor-not-allowed"
            >
              {t('guest.rsvp.prompt.btn')}
            </button>
          </div>

          {/* ── Messaggio di benvenuto ────────────────────────────────── */}
          <div className="bg-gradient-to-br from-avorio to-white rounded-3xl border border-avorio-dark px-6 py-4 space-y-3">
            <p
              className="text-sm text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t('guest.welcome.body', { name: event.child_name }) }}
            />
            <div className="flex items-center gap-2">
              <BalloonIcon size={18} />
              <span className="text-sm font-semibold text-salvia">{t('guest.welcome.closing')}</span>
            </div>
          </div>

          {/* ── Regalo collettivo ─────────────────────────────────────── */}
          {event.collective_enabled && (
            <div className="bg-gradient-to-br from-salvia/10 to-cipria/10 rounded-3xl border border-salvia/20 p-5">
              <div className="flex items-start gap-3">
                <HeartRibbonIcon size={24} />
                <div className="flex-1">
                  <p className="text-xs font-medium text-salvia uppercase tracking-wide mb-0.5">
                    {t('guest.collective.label')}
                  </p>
                  <p className="font-display font-bold text-gray-900 text-lg leading-tight">
                    {event.collective_description || t('guest.collective.default_title')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1 mb-3">
                    {t('guest.collective.join_hint')}
                  </p>
                  {event.collective_goal > 0 && (
                    <>
                      <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-salvia rounded-full" style={{ width: '0%' }} />
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        €0 su €{formatEur(event.collective_goal)}
                      </p>
                    </>
                  )}
                  <span className="btn-primary text-sm py-2 px-4 inline-block opacity-50 cursor-not-allowed">
                    {t('guest.collective.contribute_btn')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Lista regali ──────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-gray-900 flex items-center gap-2">
                {t('guest.wishlist.title')} <GiftIcon size={22} />
              </h2>
              <span className="text-sm text-gray-400">
                {t('guest.wishlist.available', { count: event.gifts.length })}
              </span>
            </div>

            {event.gifts.length > 0 ? (
              <div className="grid gap-4 pointer-events-none select-none">
                {event.gifts.map((gift) => (
                  <GiftCard
                    key={gift.id}
                    gift={gift}
                    mode="guest"
                    listClosed={false}
                    hasRsvp={false}
                  />
                ))}
              </div>
            ) : (
              <div className="card text-center py-12 text-gray-400">
                <Gift className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p>{t('guest.wishlist.empty')}</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

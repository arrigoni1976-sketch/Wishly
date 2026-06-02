import { useState } from 'react'
import { ExternalLink, ShoppingBag, Lock, Trash2, Pencil } from 'lucide-react'
import clsx from 'clsx'

export default function GiftCard({
  gift,
  mode = 'guest', // 'guest' | 'parent'
  onReserve,
  onCancelReservation,
  onEdit,
  onDelete,
  defaultGuestName = '',
  hasRsvp = true,
}) {
  const [showReserveForm, setShowReserveForm] = useState(false)
  const [guestName, setGuestName] = useState(defaultGuestName)
  const [loading, setLoading] = useState(false)
  const [reserveError, setReserveError] = useState('')

  const isReserved = !!gift.reserved_by
  const isMyReservation = gift.my_reservation // flag set by parent based on session

  const handleReserve = async () => {
    if (!guestName.trim()) return
    setLoading(true)
    setReserveError('')
    try {
      await onReserve?.({
        giftId: gift.id,
        guestName: guestName.trim(),
      })
      setShowReserveForm(false)
    } catch (e) {
      setReserveError(e?.response?.data?.message || 'Errore nella prenotazione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    setLoading(true)
    try {
      await onCancelReservation?.({ giftId: gift.id })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={clsx(
        'card transition-all duration-200 relative overflow-hidden',
        isReserved && !isMyReservation && 'opacity-60',
        isMyReservation && 'ring-2 ring-salvia'
      )}
    >
      {/* Reserved badge — shown only in guest mode (parent mode shows edit/delete there instead) */}
      {isReserved && mode === 'guest' && (
        <div
          className={clsx(
            'absolute top-3 right-3 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
            isMyReservation
              ? 'bg-salvia text-white'
              : 'bg-gray-100 text-gray-500'
          )}
        >
          <Lock className="w-3 h-3" />
          {isMyReservation ? 'Tuo' : 'Prenotato'}
        </div>
      )}

      {/* Parent action buttons */}
      {mode === 'parent' && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button
            onClick={() => onEdit?.(gift)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-salvia hover:bg-salvia/10 transition-colors"
            title="Modifica"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete?.(gift.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Elimina"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="pr-16">
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900 text-base leading-snug">{gift.name}</h3>
          {isReserved && mode === 'parent' && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0 mt-0.5">
              <Lock className="w-3 h-3" />
              Prenotato
            </span>
          )}
        </div>
        {gift.description && (
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{gift.description}</p>
        )}
      </div>

      {/* Price */}
      {gift.price && (
        <p className="text-salvia font-bold text-lg mt-2">€{parseFloat(gift.price).toFixed(2)}</p>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-2 mt-3">
        {gift.amazon_url && (
          <a
            href={gift.amazon_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Amazon
          </a>
        )}
        {gift.store_url && (
          <a
            href={gift.store_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Negozio
          </a>
        )}
      </div>

      {/* Reserved by (parent view) */}
      {mode === 'parent' && isReserved && (
        <div className="mt-3 pt-3 border-t border-avorio-dark text-xs text-gray-500">
          <span className="font-medium text-gray-700">{gift.reserved_by}</span>
          {gift.reserved_partner && ` & ${gift.reserved_partner}`}
          {gift.purchased_offline && (
            <span className="ml-2 text-green-600 font-medium">· Già acquistato</span>
          )}
        </div>
      )}

      {/* Guest actions */}
      {mode === 'guest' && !isReserved && (
        <div className="mt-4 pt-3 border-t border-avorio-dark">
          {!showReserveForm ? (
            <button
              onClick={() => setShowReserveForm(true)}
              className="btn-primary text-sm w-full py-2.5"
            >
              Prenota questo regalo
            </button>
          ) : (
            <div className="space-y-3 animate-fade-in">
              {!hasRsvp && (
                <div className="bg-cipria/30 border border-cipria rounded-xl px-3 py-2.5 text-xs text-gray-600">
                  <span className="font-semibold">Prima di prenotare</span>, facci sapere se riesci a venire!{' '}
                  <a href="#rsvp" className="text-salvia font-medium underline underline-offset-2">
                    Conferma la presenza →
                  </a>
                </div>
              )}
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Il tuo nome *"
                className="input text-sm py-2.5"
                autoFocus
              />

              {reserveError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{reserveError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowReserveForm(false); setReserveError('') }}
                  className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleReserve}
                  disabled={!guestName.trim() || loading}
                  className="flex-1 btn-primary text-sm py-2"
                >
                  {loading ? 'Confermo...' : 'Prenota'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel own reservation */}
      {mode === 'guest' && isMyReservation && (
        <div className="mt-4 pt-3 border-t border-avorio-dark">
          <p className="text-xs text-salvia font-medium mb-2">
            Hai prenotato questo regalo
          </p>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-xs text-red-500 hover:text-red-600 hover:underline transition-colors"
          >
            {loading ? 'Annullo...' : 'Annulla prenotazione'}
          </button>
        </div>
      )}
    </div>
  )
}

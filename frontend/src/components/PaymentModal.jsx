import { useState } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

const QUICK_AMOUNTS = [10, 20, 30, 50]

export default function PaymentModal({ isOpen, onClose, goal, collected, onSubmit, paypalEmail, fixedAmount, defaultName = '' }) {
  const remaining = Math.max(0, goal - collected)
  const [amount, setAmount] = useState('')
  const [customAmount, setCustomAmount] = useState(false)
  const [name, setName] = useState(defaultName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  // If fixedAmount is set, use it (capped at remaining)
  const effectiveFixed = fixedAmount ? Math.min(parseFloat(fixedAmount), remaining) : null

  const numAmount = effectiveFixed ?? parseFloat(amount)
  const isValid = name.trim() && !isNaN(numAmount) && numAmount >= 1 && numAmount <= remaining

  const handleCash = async () => {
    if (!isValid) return
    setError('')
    setLoading(true)
    try {
      await onSubmit({ method: 'contanti', amount: numAmount, name: name.trim() })
      onClose()
    } catch (e) {
      setError(e.message || 'Errore. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  const handlePayPal = async () => {
    if (!isValid) return
    setError('')
    setLoading(true)
    // Apre la finestra subito (gesto diretto utente) — altrimenti iOS la blocca
    const paypalWindow = window.open('', '_blank')
    try {
      await onSubmit({ method: 'paypal', amount: numAmount, name: name.trim() })
      if (paypalWindow) {
        paypalWindow.location.href = `https://paypal.me/${encodeURIComponent(paypalEmail)}/${numAmount}`
      }
      onClose()
    } catch (e) {
      if (paypalWindow) paypalWindow.close()
      setError(e.message || 'Errore. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-xl font-bold">Prenota la tua quota</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-5">
            {effectiveFixed
              ? 'Inserisci il tuo nome per confermare la quota.'
              : 'Indica il tuo nome e la quota che vuoi contribuire.'}
          </p>

          {/* Name */}
          <div className="mb-4">
            <label className="label">Il tuo nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Come vuoi apparire nella lista"
              className="input"
              autoFocus
            />
          </div>

          {/* Amount — fixed or free choice */}
          {effectiveFixed ? (
            <div className="mb-6">
              <div className="bg-avorio rounded-2xl border border-avorio-dark px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">Quota per persona</span>
                <span className="text-xl font-bold text-salvia">€{effectiveFixed.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <label className="label">Importo (min €10, max €{remaining.toFixed(0)})</label>

              {!customAmount && (
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {QUICK_AMOUNTS.filter((a) => a <= remaining).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAmount(String(a))}
                      className={clsx(
                        'py-2.5 rounded-xl text-sm font-semibold border-2 transition-all',
                        amount === String(a)
                          ? 'bg-salvia text-white border-salvia'
                          : 'border-gray-200 text-gray-700 hover:border-salvia'
                      )}
                    >
                      €{a}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                {!customAmount ? (
                  <button
                    type="button"
                    onClick={() => { setCustomAmount(true); setAmount('') }}
                    className="flex-1 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl hover:border-salvia hover:text-salvia transition-colors"
                  >
                    Altro importo
                  </button>
                ) : (
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">€</span>
                    <input
                      type="number"
                      min={10}
                      max={remaining}
                      step={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="input pl-7"
                    />
                  </div>
                )}
                {customAmount && (
                  <button
                    type="button"
                    onClick={() => { setCustomAmount(false); setAmount('') }}
                    className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl"
                  >
                    Veloci
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            {paypalEmail && (
              <button
                onClick={handlePayPal}
                disabled={!isValid || loading}
                className="w-full py-3.5 text-base font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors
                  bg-[#0070ba] hover:bg-[#005ea6] text-white
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvataggio...' : isValid ? `Paga €${numAmount.toFixed(2)} con PayPal` : 'Paga con PayPal'}
              </button>
            )}

            <button
              onClick={handleCash}
              disabled={!isValid || loading}
              className={clsx(
                'w-full py-3.5 text-base transition-colors rounded-2xl font-semibold flex items-center justify-center',
                paypalEmail
                  ? 'border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
                  : 'btn-primary'
              )}
            >
              {loading
                ? 'Salvataggio...'
                : isValid
                ? `Prenota €${numAmount.toFixed(2)} — porto i contanti`
                : 'Inserisci il tuo nome'}
            </button>
          </div>

          {!paypalEmail && (
            <p className="text-xs text-center text-gray-400 mt-3">
              Nessun pagamento online — porterai i contanti il giorno della festa.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

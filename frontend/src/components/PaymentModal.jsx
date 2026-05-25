import { useState } from 'react'
import { X, CreditCard, Smartphone, Wallet } from 'lucide-react'
import clsx from 'clsx'

const PAYMENT_METHODS = [
  {
    id: 'stripe',
    label: 'Carta di credito/debito',
    icon: CreditCard,
    description: 'Visa, Mastercard, Amex — pagamento sicuro con Stripe',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    id: 'paypal',
    label: 'PayPal',
    icon: Wallet,
    description: 'Paga con il tuo account PayPal',
    color: 'text-blue-800',
    bg: 'bg-blue-50',
  },
  {
    id: 'satispay',
    label: 'Satispay',
    icon: Smartphone,
    description: 'Paga con Satispay dal tuo smartphone',
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
]

const QUICK_AMOUNTS = [10, 20, 30, 50]

export default function PaymentModal({ isOpen, onClose, goal, collected, onSubmit }) {
  const remaining = Math.max(0, goal - collected)
  const [method, setMethod] = useState('stripe')
  const [amount, setAmount] = useState('')
  const [customAmount, setCustomAmount] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const numAmount = parseFloat(amount)
  const isValid =
    name.trim() &&
    !isNaN(numAmount) &&
    numAmount >= 10 &&
    numAmount <= remaining

  const handleSubmit = async () => {
    if (!isValid) return
    setError('')
    setLoading(true)
    try {
      await onSubmit({ method, amount: numAmount, name: name.trim() })
      onClose()
    } catch (e) {
      setError(e.message || 'Errore nel pagamento. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold">Contribuisci</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="label">Il tuo nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Come vuoi apparire nella lista"
              className="input"
            />
          </div>

          {/* Amount */}
          <div className="mb-5">
            <label className="label">Importo (min €10, max €{remaining.toFixed(0)})</label>

            {/* Quick amounts */}
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

          {/* Payment method */}
          <div className="mb-6">
            <label className="label">Metodo di pagamento</label>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setMethod(pm.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                    method === pm.id
                      ? 'border-salvia bg-salvia/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={clsx('p-2 rounded-lg', pm.bg)}>
                    <pm.icon className={clsx('w-4 h-4', pm.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{pm.label}</p>
                    <p className="text-xs text-gray-500">{pm.description}</p>
                  </div>
                  <div
                    className={clsx(
                      'ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      method === pm.id ? 'border-salvia' : 'border-gray-300'
                    )}
                  >
                    {method === pm.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-salvia" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="btn-primary w-full py-3.5 text-base"
          >
            {loading
              ? 'Elaborazione...'
              : isValid
              ? `Contribuisci €${numAmount.toFixed(2)}`
              : 'Inserisci nome e importo'}
          </button>

          <p className="text-xs text-center text-gray-400 mt-3">
            Pagamento sicuro e cifrato. Non condividiamo i tuoi dati.
          </p>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Heart, Calendar, MapPin } from 'lucide-react'
import Layout from '../components/Layout'
import ProgressBar from '../components/ProgressBar'
import PaymentModal from '../components/PaymentModal'
import { getEventByCollectiveToken, createContribution } from '../lib/api'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function CollectiveGiftPage() {
  const { collectiveToken } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const fetchEvent = async () => {
    try {
      const res = await getEventByCollectiveToken(collectiveToken)
      setEvent(res.data)
    } catch {
      setError('Pagina non trovata o link non valido.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvent() }, [collectiveToken])

  const handleContribute = async ({ method, amount, name }) => {
    const res = await createContribution(event.id, {
      contributorName: name,
      amount,
      paymentMethod: method,
      collectiveToken,
    })
    // In a real app, redirect to payment provider here
    // For now simulate success
    await fetchEvent()
    setSuccessMsg(`Grazie ${name}! Il tuo contributo di €${amount.toFixed(2)} è stato registrato.`)
    setTimeout(() => setSuccessMsg(''), 6000)
  }

  const isComplete = event
    ? (event.collective_amount || 0) >= (event.collective_goal || 0)
    : false

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
            <div className="text-5xl">😕</div>
            <h2 className="font-display text-2xl font-bold text-gray-800">{error}</h2>
          </div>
        </div>
      </Layout>
    )
  }

  const collected = event.collective_amount || 0
  const goal = event.collective_goal || 0
  const remaining = Math.max(0, goal - collected)

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-12 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="card text-center">
          <div className="text-5xl mb-4">💝</div>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">
            {event.collective_description
              ? `${event.collective_description} per ${event.child_name}`
              : `Regalo collettivo per ${event.child_name}`}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500 mb-4">
            {event.party_date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cipria-dark" />
                {format(new Date(event.party_date), "d MMMM yyyy", { locale: it })}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cipria-dark" />
                {event.location}
              </span>
            )}
          </div>
        </div>

        {/* ── Progress ─────────────────────────────────────────────────── */}
        <div className="card">
          <h2 className="font-display font-bold text-lg text-gray-900 mb-4">
            Raccolta fondi
          </h2>
          <ProgressBar current={collected} goal={goal} />

          {isComplete ? (
            <div className="mt-4 bg-salvia/10 border border-salvia/30 rounded-2xl p-4 text-center">
              <p className="text-salvia font-semibold text-lg">🎉 Obiettivo raggiunto!</p>
              <p className="text-sm text-gray-500 mt-1">
                Grazie a tutti per i contributi. Il regalo è completo!
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <button
                onClick={() => setPaymentOpen(true)}
                className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
              >
                <Heart className="w-5 h-5" />
                Contribuisci al regalo
              </button>
              <p className="text-xs text-center text-gray-400 mt-2">
                Importo minimo €10 · Massimo €{remaining.toFixed(0)}
              </p>
            </div>
          )}
        </div>

        {/* ── Success message ──────────────────────────────────────────── */}
        {successMsg && (
          <div className="bg-salvia text-white rounded-2xl p-4 text-center font-medium animate-slide-up">
            {successMsg}
          </div>
        )}

        {/* ── Contributori ─────────────────────────────────────────────── */}
        {event.contributions?.length > 0 && (
          <div className="card">
            <h2 className="font-display font-bold text-lg text-gray-900 mb-4">
              Chi ha contribuito ❤️
            </h2>
            <div className="space-y-3">
              {event.contributions
                .filter((c) => c.status === 'completed')
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-cipria flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {c.contributor_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700">{c.contributor_name}</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(c.created_at), "d MMM", { locale: it })}
                        {' · '}
                        <span className="capitalize">{c.payment_method}</span>
                      </p>
                    </div>
                    <span className="font-bold text-salvia text-sm">
                      €{parseFloat(c.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Info metodi pagamento ────────────────────────────────────── */}
        {!isComplete && (
          <div className="rounded-2xl border border-avorio-dark bg-avorio p-4 text-sm text-gray-500 text-center">
            <p className="font-medium text-gray-700 mb-1">Metodi di pagamento accettati</p>
            <div className="flex justify-center gap-4 mt-2 text-base">
              <span title="Stripe">💳 Carta</span>
              <span title="PayPal">🔵 PayPal</span>
              <span title="Satispay">🔴 Satispay</span>
            </div>
          </div>
        )}
      </div>

      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        goal={goal}
        collected={collected}
        onSubmit={handleContribute}
      />
    </Layout>
  )
}

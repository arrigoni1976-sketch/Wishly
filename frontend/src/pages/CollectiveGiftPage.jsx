import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Heart, Calendar, MapPin, Banknote, AlertCircle, ArrowLeft } from 'lucide-react'
import Layout from '../components/Layout'
import ProgressBar from '../components/ProgressBar'
import PaymentModal from '../components/PaymentModal'
import CelebrationIcon from '../components/CelebrationIcon'
import HeartRibbonIcon from '../components/HeartRibbonIcon'
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
  const [myContribution, setMyContribution] = useState(null)

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

  // Auto-detect if this user already contributed
  useEffect(() => {
    if (!event) return
    const storedName = localStorage.getItem('piky_guest_name')
    if (!storedName) return
    const found = (event.contributions || []).find(
      (c) => c.contributor_name?.toLowerCase() === storedName.toLowerCase()
    )
    if (found) setMyContribution(found)
  }, [event])

  const handleContribute = async ({ method, amount, name }) => {
    await createContribution(event.id, {
      contributorName: name,
      amount,
      paymentMethod: method,
      collectiveToken,
    })
    localStorage.setItem('piky_guest_name', name)
    await fetchEvent()
    const msg = method === 'paypal'
      ? `Grazie ${name}! 🎉 Il tuo contributo di €${amount.toFixed(2)} è stato registrato. Il totale si aggiornerà non appena Piky avrà ricevuto la conferma del pagamento PayPal.`
      : `Grazie ${name}! Hai prenotato €${amount.toFixed(2)}. Ricordati di portare i contanti il giorno della festa!`
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 10000)
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
            <AlertCircle className="w-16 h-16 text-cipria-dark mx-auto" />
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

        {/* ── Back button ─────────────────────────────────────────────── */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-salvia transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla lista
        </button>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="card text-center">
          <div className="mb-4 flex justify-center"><HeartRibbonIcon size={56} /></div>
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
              <p className="text-salvia font-semibold text-lg"><span className="flex items-center justify-center gap-1.5"><CelebrationIcon size={20} /> Obiettivo raggiunto!</span></p>
              <p className="text-sm text-gray-500 mt-1">
                Grazie a tutti per i contributi. Il regalo è completo!
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {myContribution && (
                <div className="bg-cipria/20 border border-cipria rounded-2xl px-4 py-3 text-sm text-gray-700 text-center">
                  Hai già contribuito con <span className="font-semibold">€{parseFloat(myContribution.amount).toFixed(2)}</span> — puoi aggiungere un altro contributo se vuoi.
                </div>
              )}
              <button
                onClick={() => setPaymentOpen(true)}
                className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
              >
                <Heart className="w-5 h-5" />
                {event.collective_fixed_quota
                  ? `Paga la quota di €${parseFloat(event.collective_fixed_quota).toFixed(2)}`
                  : 'Contribuisci al regalo'}
              </button>
              <p className="text-xs text-center text-gray-400">
                {event.collective_fixed_quota
                  ? `Quota fissa per persona · Massimo disponibile €${remaining.toFixed(0)}`
                  : `Importo minimo €10 · Massimo €${remaining.toFixed(0)}`}
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
            <h2 className="font-display font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              Chi ha contribuito <Heart className="w-5 h-5 text-cipria-dark" />
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
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Info raccolta contanti + PayPal ─────────────────────────── */}
        {!isComplete && (
          <div className="rounded-2xl border border-avorio-dark bg-avorio p-4 text-sm text-gray-500 text-center">
            <p className="font-medium text-gray-700 mb-1 flex items-center justify-center gap-1.5"><Banknote className="w-4 h-4 text-salvia" /> Raccolta in contanti</p>
            <p className="text-xs mt-1">Prenota la tua quota ora e porta i contanti il giorno della festa al genitore che organizza, o paga direttamente con PayPal.</p>
          </div>
        )}

        {/* ── Nota PayPal (solo se attivo) ────────────────────────────── */}
        {event?.paypal_email && !isComplete && (
          <p className="text-xs text-center text-gray-400">
            Puoi anche pagare direttamente tramite PayPal usando il pulsante qui sopra.
          </p>
        )}

        {/* ── Torna alla lista ─────────────────────────────────────────── */}
        <button
          onClick={() => window.history.back()}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-500 border border-avorio-dark rounded-2xl hover:text-salvia hover:border-salvia bg-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla lista
        </button>

      </div>

      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        goal={goal}
        collected={collected}
        onSubmit={handleContribute}
        paypalEmail={event?.paypal_email}
        fixedAmount={event?.collective_fixed_quota}
      />
    </Layout>
  )
}

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Heart, Calendar, MapPin, Banknote, AlertCircle, ArrowLeft } from 'lucide-react'
import Layout from '../components/Layout'
import ProgressBar from '../components/ProgressBar'
import PaymentModal from '../components/PaymentModal'
import CelebrationIcon from '../components/CelebrationIcon'
import HeartRibbonIcon from '../components/HeartRibbonIcon'
import { getEventByCollectiveToken, createContribution, updateContribution } from '../lib/api'
import { syncFromServer } from '../lib/sync'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function CollectiveGiftPage() {
  const { collectiveToken } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [myContributions, setMyContributions] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [recoverName, setRecoverName] = useState('')
  const [recoverError, setRecoverError] = useState('')

  const findMyContributions = (contributions, name) =>
    (contributions || []).filter(
      (c) => c.contributor_name?.toLowerCase() === name.toLowerCase()
    )

  const fetchEvent = async () => {
    try {
      const res = await getEventByCollectiveToken(collectiveToken)
      const data = res.data
      setEvent(data)

      // Try to resolve guest name: localStorage first, then user key sync
      let storedName = localStorage.getItem('piky_guest_name')
      if (!storedName) {
        const userKey = localStorage.getItem('piky_user_key')
        if (userKey) {
          try {
            const synced = await syncFromServer(userKey)
            storedName = localStorage.getItem('piky_guest_name')
          } catch { /* sync failed silently */ }
        }
      }

      if (storedName) {
        setMyContributions(findMyContributions(data.contributions, storedName))
      }
    } catch {
      setError('Pagina non trovata o link non valido.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvent() }, [collectiveToken])

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

  const handleEditOpen = (contribution) => {
    setEditingId(contribution.id)
    setEditName(contribution.contributor_name)
    setEditAmount(parseFloat(contribution.amount).toFixed(2))
    setEditError('')
  }

  const handleEditSave = async () => {
    const amount = parseFloat(editAmount)
    if (!editName.trim()) return setEditError('Inserisci il tuo nome.')
    if (!amount || amount < 10) return setEditError('Importo minimo €10.')
    setEditLoading(true)
    setEditError('')
    try {
      await updateContribution(event.id, editingId, {
        contributorName: editName.trim(),
        amount,
        collectiveToken,
      })
      localStorage.setItem('piky_guest_name', editName.trim())
      await fetchEvent()
      setEditingId(null)
      setSuccessMsg(`Contributo aggiornato a €${amount.toFixed(2)}. Grazie!`)
      setTimeout(() => setSuccessMsg(''), 6000)
    } catch (e) {
      setEditError(e?.response?.data?.message || 'Errore. Riprova.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleRecover = () => {
    const name = recoverName.trim()
    if (!name) return
    const found = findMyContributions(event.contributions, name)
    if (found.length > 0) {
      localStorage.setItem('piky_guest_name', name)
      setMyContributions(found)
      setRecovering(false)
      setRecoverName('')
      setRecoverError('')
    } else {
      setRecoverError('Nessun contributo trovato con questo nome.')
    }
  }

  const isComplete = event
    ? (event.collective_amount || 0) >= (event.collective_goal || 0)
    : false

  const myTotal = myContributions
    .filter((c) => c.status === 'completed')
    .reduce((acc, c) => acc + parseFloat(c.amount), 0)

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

              {/* Contributi già fatti da questa persona */}
              {myContributions.length > 0 && editingId === null && (
                <div className="bg-cipria/20 border border-cipria rounded-2xl px-4 py-3 text-sm text-gray-700 space-y-2">
                  <p className="font-semibold">
                    Hai contribuito con <span className="text-salvia">€{myTotal.toFixed(2)}</span> in totale
                    {myContributions.length > 1 && ` (${myContributions.length} versamenti)`}
                  </p>
                  {myContributions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        €{parseFloat(c.amount).toFixed(2)}
                        {' · '}
                        {format(new Date(c.created_at), "d MMM", { locale: it })}
                        {c.status === 'pending' && ' · in attesa'}
                      </span>
                      {c.status === 'completed' && (
                        <button
                          onClick={() => handleEditOpen(c)}
                          className="text-salvia hover:underline font-medium ml-3"
                        >
                          Modifica
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Form modifica contributo */}
              {editingId !== null && (
                <div className="bg-white border border-avorio-dark rounded-2xl p-4 space-y-3 animate-fade-in">
                  <p className="text-sm font-semibold text-gray-800">Modifica il contributo</p>
                  <div>
                    <label className="label">Il tuo nome</label>
                    <input
                      value={editName}
                      onChange={(e) => { setEditName(e.target.value); setEditError('') }}
                      className="input"
                      placeholder="Nome Cognome"
                    />
                  </div>
                  <div>
                    <label className="label">Importo (€)</label>
                    <input
                      type="number"
                      min="10"
                      step="1"
                      value={editAmount}
                      onChange={(e) => { setEditAmount(e.target.value); setEditError('') }}
                      className="input"
                      placeholder="Es. 25"
                    />
                  </div>
                  {editError && <p className="text-xs text-red-500">{editError}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 btn-outline text-sm py-2.5"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleEditSave}
                      disabled={editLoading}
                      className="flex-1 btn-primary text-sm py-2.5"
                    >
                      {editLoading ? 'Salvo...' : 'Salva'}
                    </button>
                  </div>
                </div>
              )}

              {/* Recupero manuale per nome */}
              {recovering ? (
                <div className="bg-white border border-avorio-dark rounded-2xl p-4 space-y-3 animate-fade-in">
                  <p className="text-sm font-semibold text-gray-800">Ritrova il tuo contributo</p>
                  <input
                    value={recoverName}
                    onChange={(e) => { setRecoverName(e.target.value); setRecoverError('') }}
                    className="input"
                    placeholder="Nome Cognome"
                    onKeyDown={(e) => e.key === 'Enter' && handleRecover()}
                  />
                  {recoverError && <p className="text-xs text-red-500">{recoverError}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => setRecovering(false)} className="flex-1 btn-outline text-sm py-2.5">
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
              ) : (
                <>
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
                  {myContributions.length === 0 && (
                    <button
                      onClick={() => setRecovering(true)}
                      className="block w-full text-xs text-center text-gray-400 hover:text-salvia transition-colors"
                    >
                      Hai già contribuito? Ritrova il tuo contributo →
                    </button>
                  )}
                </>
              )}
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

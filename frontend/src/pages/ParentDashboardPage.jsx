import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  Gift, Users, Plus, Calendar, MapPin,
  Mail, ChevronDown, ChevronUp, Pencil, Trash2, X, Check, PartyPopper,
  Baby, AlertCircle, Share2
} from 'lucide-react'
import Layout from '../components/Layout'
import GiftCard from '../components/GiftCard'
import ProgressBar from '../components/ProgressBar'
import GiftIcon from '../components/GiftIcon'
import CakeIcon from '../components/CakeIcon'
import BalloonIcon from '../components/BalloonIcon'
import CelebrationIcon from '../components/CelebrationIcon'
import HeartRibbonIcon from '../components/HeartRibbonIcon'
import { getEventByParentToken, addGift, updateGift, deleteGift, updateEvent, confirmContribution } from '../lib/api'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const RSVP_LABELS = { yes: 'Ci sarò', maybe: 'Forse', no: 'Non vengo' }
const RSVP_COLORS = {
  yes: 'badge-rsvp-yes',
  maybe: 'badge-rsvp-maybe',
  no: 'badge-rsvp-no',
}

// ─── Add/Edit Gift Modal ───────────────────────────────────────────────────
function GiftModal({ isOpen, onClose, onSave, initialData }) {
  const [form, setForm] = useState(
    initialData || { name: '', description: '', price: '', amazonUrl: '', storeUrl: '' }
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) setForm(initialData)
    else setForm({ name: '', description: '', price: '', amazonUrl: '', storeUrl: '' })
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!form.name.trim()) return
    setLoading(true)
    await onSave(form)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl font-bold">
            {initialData ? 'Modifica regalo' : 'Aggiungi regalo'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Es. LEGO Technic 42175"
              className="input"
            />
          </div>
          <div>
            <label className="label">Descrizione</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Dettagli aggiuntivi"
              className="input"
            />
          </div>
          <div>
            <label className="label">Prezzo (€)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className="input pl-8"
              />
            </div>
          </div>
          <div>
            <label className="label">Link Amazon</label>
            <input
              type="url"
              value={form.amazonUrl}
              onChange={(e) => setForm({ ...form, amazonUrl: e.target.value })}
              placeholder="https://amazon.it/..."
              className="input"
            />
          </div>
          <div>
            <label className="label">Link negozio</label>
            <input
              type="url"
              value={form.storeUrl}
              onChange={(e) => setForm({ ...form, storeUrl: e.target.value })}
              placeholder="https://..."
              className="input"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 btn-outline py-2.5">
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim() || loading}
            className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {initialData ? 'Salva' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function ParentDashboardPage() {
  const { parentToken } = useParams()
  const [searchParams] = useSearchParams()
  const isNew = searchParams.get('nuovo') === '1'
  const [showNewBanner, setShowNewBanner] = useState(isNew)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [giftModal, setGiftModal] = useState({ open: false, data: null })
  const [showRsvp, setShowRsvp] = useState(true)
  const [showContrib, setShowContrib] = useState(false)
  const [copied, setCopied] = useState(false)
  const [collectiveModal, setCollectiveModal] = useState(false)
  const [collectiveForm, setCollectiveForm] = useState({ description: '', goal: '', paypal_email: '' })
  const [collectiveSaving, setCollectiveSaving] = useState(false)

  const baseUrl = window.location.origin

  const openCollectiveEdit = () => {
    setCollectiveForm({
      description: event.collective_description || '',
      goal: event.collective_goal || '',
      paypal_email: event.paypal_email || '',
    })
    setCollectiveModal(true)
  }

  const saveCollective = async () => {
    setCollectiveSaving(true)
    try {
      await updateEvent(event.id, {
        parentToken: parentToken,
        collective_description: collectiveForm.description || null,
        collective_goal: parseFloat(collectiveForm.goal) || event.collective_goal,
        paypal_email: collectiveForm.paypal_email || null,
      })
      await fetchEvent()
      setCollectiveModal(false)
    } catch (e) {
      console.error(e)
    } finally {
      setCollectiveSaving(false)
    }
  }

  const shareGuestLink = async () => {
    const url = `${baseUrl}/lista/${event?.guest_token}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Compleanno di ${event.child_name}`,
          text: `Sei invitato al compleanno di ${event.child_name}! Qui puoi prenotare un regalo e confermare la tua presenza.`,
          url,
        })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }


  const fetchEvent = async () => {
    try {
      const res = await getEventByParentToken(parentToken)
      setEvent(res.data)
    } catch {
      setError('Lista non trovata o link non valido.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvent() }, [parentToken])

  const handleAddGift = async (form) => {
    await addGift(event.id, form)
    await fetchEvent()
  }

  const handleEditGift = async (form) => {
    await updateGift(form.id, form)
    await fetchEvent()
  }

  const handleDeleteGift = async (giftId) => {
    if (!confirm('Eliminare questo regalo?')) return
    await deleteGift(giftId)
    await fetchEvent()
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-cipria border-t-salvia rounded-full animate-spin mx-auto" />
            <p className="text-gray-400">Carico il tuo dashboard...</p>
          </div>
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
            <Link to="/" className="btn-primary inline-block">Torna alla home</Link>
          </div>
        </div>
      </Layout>
    )
  }

  const rsvpYes = event.rsvp?.filter((r) => r.status === 'yes') || []
  const rsvpMaybe = event.rsvp?.filter((r) => r.status === 'maybe') || []
  const rsvpNo = event.rsvp?.filter((r) => r.status === 'no') || []
  const totalChildren = rsvpYes.reduce((acc, r) => acc + (r.children_count || 0), 0)
  const totalAdults = rsvpYes.reduce((acc, r) => acc + (r.adults_count || (r.with_partner ? 2 : 1)), 0)
  const reservedCount = event.gifts?.filter((g) => g.reserved_by).length || 0

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* ── Banner nuovo evento ──────────────────────────────────────── */}
        {showNewBanner && (
          <div className="relative bg-gradient-to-r from-salvia to-salvia-dark text-white rounded-3xl px-6 py-5 flex items-center gap-4 animate-slide-up shadow-lg shadow-salvia/20">
            <div className="flex-shrink-0"><CelebrationIcon size={36} /></div>
            <div className="flex-1">
              <p className="font-display font-bold text-lg leading-tight">
                Evento attivo e pronto!
              </p>
              <p className="text-white/80 text-sm mt-0.5">
                La lista è pronta! Condividi il link con i tuoi invitati con il pulsante qui sotto.
              </p>
            </div>
            <button
              onClick={() => setShowNewBanner(false)}
              className="flex-shrink-0 p-1.5 rounded-xl hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Header evento ───────────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                event.gender === 'F' ? 'bg-cipria' : event.gender === 'M' ? 'bg-salvia/20' : 'bg-cipria'
              }`}>
                {event.gender === 'F'
                  ? <HeartRibbonIcon size={32} />
                  : event.gender === 'M'
                  ? <BalloonIcon size={32} />
                  : <CakeIcon size={32} />
                }
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-gray-900">
                  Compleanno di {event.child_name}
                </h1>
                <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                  {event.party_date && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(event.party_date), "d MMMM yyyy", { locale: it })}
                      {event.party_time && ` · ${event.party_time.slice(0, 5)}`}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setShowRsvp(true); document.getElementById('rsvp-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                className="bg-green-50 text-green-700 rounded-xl px-3 py-1.5 text-sm font-medium hover:bg-green-100 transition-colors"
              >
                <span className="inline-flex items-center gap-1"><CelebrationIcon size={14} /> {rsvpYes.length} confermati · {totalAdults} adulti</span>
              </button>
              {totalChildren > 0 && (
                <div className="bg-blue-50 text-blue-700 rounded-xl px-3 py-1.5 text-sm font-medium">
                  <span className="inline-flex items-center gap-1"><Baby className="w-3.5 h-3.5" /> {totalChildren} bambini</span>
                </div>
              )}
              <div className="bg-cipria/20 text-gray-700 rounded-xl px-3 py-1.5 text-sm font-medium">
                <span className="inline-flex items-center gap-1"><GiftIcon size={14} /> {reservedCount}/{event.gifts?.length || 0} prenotati</span>
              </div>
              {event.collective_enabled && event.collective_goal > 0 && (
                <div className="bg-salvia/10 text-salvia rounded-xl px-3 py-1.5 text-sm font-medium">
                  <span className="inline-flex items-center gap-1">
                    <HeartRibbonIcon size={14} />
                    {Math.round(Math.min(100, ((event.collective_amount || 0) / event.collective_goal) * 100))}% collettivo
                  </span>
                </div>
              )}
            </div>
          </div>

          {event.notes && (
            <p className="mt-4 pt-4 border-t border-avorio-dark text-sm text-gray-500 italic">
              {event.notes}
            </p>
          )}
        </div>

        {/* ── Condividi con gli invitati ─────────────────────────────── */}
        <div className="card">
          <h2 className="font-display font-bold text-lg text-gray-900 mb-1">
            Invita i tuoi ospiti
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Condividi il link con gli invitati al compleanno di{' '}
            <span className="font-medium text-gray-700">{event.child_name}</span>.
          </p>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            Potranno confermare la presenza e prenotare un regalo — senza doppioni.
          </p>
          <button
            onClick={shareGuestLink}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm"
          >
            <Share2 className="w-4 h-4" />
            {copied ? 'Link copiato!' : 'Condividi invito'}
          </button>
        </div>

        {/* ── Regalo collettivo ────────────────────────────────────────── */}
        {event.collective_enabled && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-gray-900">
                {event.collective_description
                  ? `${event.collective_description} — Regalo collettivo`
                  : 'Regalo collettivo'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={openCollectiveEdit}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-salvia hover:bg-salvia/10 transition-colors"
                  title="Modifica regalo collettivo"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowContrib((v) => !v)}
                  className="text-sm text-salvia font-medium flex items-center gap-1"
                >
                  {showContrib ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showContrib ? 'Nascondi' : 'Contribuenti'}
                </button>
              </div>
            </div>

            {(event.collective_amount > 0 || event.collective_goal > 0) && (
              <ProgressBar
                current={event.collective_amount || 0}
                goal={event.collective_goal || 0}
              />
            )}


            {showContrib && event.contributions?.length > 0 && (() => {
              const confirmed = event.contributions.filter(c => c.status === 'completed')
              const pending = event.contributions.filter(c => c.status === 'pending' && c.payment_method === 'paypal')
              return (
                <div className="mt-4 border-t border-avorio-dark pt-4 space-y-3">
                  {confirmed.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{c.contributor_name}</span>
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-xs">{format(new Date(c.created_at), 'd MMM', { locale: it })}</span>
                        <span className="text-xs capitalize bg-gray-100 px-2 py-0.5 rounded-full">{c.payment_method}</span>
                        <span className="font-semibold text-salvia">€{parseFloat(c.amount).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  {pending.length > 0 && (
                    <div className="border-t border-amber-100 pt-3 space-y-2">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Da verificare su PayPal</p>
                      {pending.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-sm bg-amber-50 rounded-xl px-3 py-2">
                          <div>
                            <span className="font-medium text-gray-700">{c.contributor_name}</span>
                            <span className="text-xs text-gray-400 ml-2">{format(new Date(c.created_at), 'd MMM', { locale: it })} · €{parseFloat(c.amount).toFixed(2)}</span>
                          </div>
                          <button
                            onClick={async () => {
                              await confirmContribution(event.id, c.id, parentToken)
                              fetchEvent()
                            }}
                            className="text-xs font-semibold text-white bg-salvia hover:bg-salvia/90 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Conferma
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {showContrib && (!event.contributions || event.contributions.length === 0) && (
              <p className="mt-4 text-sm text-gray-400 text-center">Nessun contributo ancora</p>
            )}
          </div>
        )}

        {/* ── Regali ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg text-gray-900">
              Regali ({event.gifts?.length || 0})
            </h2>
            <button
              onClick={() => setGiftModal({ open: true, data: null })}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Aggiungi
            </button>
          </div>

          {event.gifts?.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {event.gifts.map((gift) => (
                <GiftCard
                  key={gift.id}
                  gift={gift}
                  mode="parent"
                  onEdit={(g) => setGiftModal({ open: true, data: g })}
                  onDelete={handleDeleteGift}
                />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-400">
              <Gift className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="font-medium">Nessun regalo aggiunto</p>
              <p className="text-sm mt-1">Aggiungi i regali che desideri</p>
            </div>
          )}
        </div>

        {/* ── RSVP ────────────────────────────────────────────────────── */}
        <div id="rsvp-section" className="card">
          <button
            onClick={() => setShowRsvp((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <h2 className="font-display font-bold text-lg text-gray-900">Presenze</h2>
              <div className="flex gap-1.5">
                <span className="badge-rsvp-yes">{rsvpYes.length} sì</span>
                <span className="badge-rsvp-maybe">{rsvpMaybe.length} forse</span>
                <span className="badge-rsvp-no">{rsvpNo.length} no</span>
              </div>
            </div>
            {showRsvp ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showRsvp && (
            <div className="mt-4 border-t border-avorio-dark pt-4 space-y-2">
              {event.rsvp?.length > 0 ? (
                event.rsvp.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-700">{r.guest_name}</span>
                      {(r.adults_count > 1 || r.with_partner) && (
                        <span className="ml-2 text-gray-400 text-xs">
                          {r.adults_count > 1 ? `${r.adults_count} adulti` : '+ partner'}
                        </span>
                      )}
                      {r.children_count > 0 && (
                        <span className="ml-2 text-gray-400 text-xs">
                          + {r.children_count} {r.children_count === 1 ? 'bambino' : 'bambini'}
                        </span>
                      )}
                    </div>
                    <span className={RSVP_COLORS[r.status]}>{RSVP_LABELS[r.status]}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">Nessuna risposta ancora</p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Gift Modal ──────────────────────────────────────────────────── */}
      <GiftModal
        isOpen={giftModal.open}
        initialData={giftModal.data}
        onClose={() => setGiftModal({ open: false, data: null })}
        onSave={giftModal.data ? handleEditGift : handleAddGift}
      />

      {/* ── Modifica regalo collettivo ──────────────────────────────────── */}
      {collectiveModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4"
          onClick={() => setCollectiveModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-gray-900 text-lg">Modifica regalo collettivo</h3>
              <button onClick={() => setCollectiveModal(false)} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Descrizione</label>
                <input
                  value={collectiveForm.description}
                  onChange={(e) => setCollectiveForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="es. Bicicletta nuova"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Obiettivo (€)</label>
                <input
                  type="number"
                  min="1"
                  value={collectiveForm.goal}
                  onChange={(e) => setCollectiveForm((f) => ({ ...f, goal: e.target.value }))}
                  placeholder="es. 150"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Email PayPal (opzionale)</label>
                <input
                  type="email"
                  value={collectiveForm.paypal_email}
                  onChange={(e) => setCollectiveForm((f) => ({ ...f, paypal_email: e.target.value }))}
                  placeholder="tua@email.com"
                  className="input"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCollectiveModal(false)} className="flex-1 btn-outline text-sm py-2.5">
                Annulla
              </button>
              <button
                onClick={saveCollective}
                disabled={collectiveSaving}
                className="flex-1 btn-primary text-sm py-2.5"
              >
                {collectiveSaving ? 'Salvo...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

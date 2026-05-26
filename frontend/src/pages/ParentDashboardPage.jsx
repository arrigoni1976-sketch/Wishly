import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  Gift, Users, Eye, EyeOff, Plus, Calendar, MapPin,
  Mail, ChevronDown, ChevronUp, Pencil, Trash2, X, Check, PartyPopper
} from 'lucide-react'
import Layout from '../components/Layout'
import CopyLink from '../components/CopyLink'
import GiftCard from '../components/GiftCard'
import ProgressBar from '../components/ProgressBar'
import GiftIcon from '../components/GiftIcon'
import { getEventByParentToken, addGift, updateGift, deleteGift } from '../lib/api'
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
  const [showRsvp, setShowRsvp] = useState(false)
  const [showViews, setShowViews] = useState(false)
  const [showContrib, setShowContrib] = useState(false)

  const baseUrl = window.location.origin

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
            <div className="text-5xl">😕</div>
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
  const reservedCount = event.gifts?.filter((g) => g.reserved_by).length || 0
  const openedCount = event.link_views?.length || 0

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* ── Banner nuovo evento ──────────────────────────────────────── */}
        {showNewBanner && (
          <div className="relative bg-gradient-to-r from-salvia to-salvia-dark text-white rounded-3xl px-6 py-5 flex items-center gap-4 animate-slide-up shadow-lg shadow-salvia/20">
            <div className="text-4xl flex-shrink-0">🎉</div>
            <div className="flex-1">
              <p className="font-display font-bold text-lg leading-tight">
                Evento attivo e pronto!
              </p>
              <p className="text-white/80 text-sm mt-0.5">
                La lista è stata creata con successo. Copia i link qui sotto e condividili con gli invitati.
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
              <div className="w-14 h-14 bg-cipria rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
                🎂
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
              <div className="bg-green-50 text-green-700 rounded-xl px-3 py-1.5 text-sm font-medium">
                🎉 {rsvpYes.length} confermati
              </div>
              {totalChildren > 0 && (
                <div className="bg-blue-50 text-blue-700 rounded-xl px-3 py-1.5 text-sm font-medium">
                  👧 {totalChildren} bambini
                </div>
              )}
              <div className="bg-cipria/20 text-gray-700 rounded-xl px-3 py-1.5 text-sm font-medium">
                <span className="inline-flex items-center gap-1"><GiftIcon size={14} /> {reservedCount}/{event.gifts?.length || 0} prenotati</span>
              </div>
              <div className="bg-avorio-dark text-gray-600 rounded-xl px-3 py-1.5 text-sm font-medium">
                👀 {openedCount} hanno aperto
              </div>
            </div>
          </div>

          {event.notes && (
            <p className="mt-4 pt-4 border-t border-avorio-dark text-sm text-gray-500 italic">
              {event.notes}
            </p>
          )}
        </div>

        {/* ── Link condivisione ────────────────────────────────────────── */}
        <div className="card space-y-3">
          <h2 className="font-display font-bold text-lg text-gray-900 mb-1">Link da condividere</h2>
          <CopyLink
            url={`${baseUrl}/lista/${event.guest_token}`}
            label="Lista invitati"
            icon="🔗"
            description="Condividi questo link con tutti gli invitati"
            variant="default"
          />
          {event.collective_enabled && (
            <CopyLink
              url={`${baseUrl}/collettivo/${event.collective_token}`}
              label="Regalo collettivo"
              icon="💝"
              description="Link separato solo per i contributi al regalo collettivo"
              variant="collective"
            />
          )}
          <CopyLink
            url={`${baseUrl}/dashboard/${event.parent_token}`}
            label="Dashboard (solo tuo)"
            icon="🔒"
            description="Tieni questo link privato — ti dà accesso completo alla lista"
            variant="default"
          />
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
              <button
                onClick={() => setShowContrib((v) => !v)}
                className="text-sm text-salvia font-medium flex items-center gap-1"
              >
                {showContrib ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showContrib ? 'Nascondi' : 'Contribuenti'}
              </button>
            </div>

            <ProgressBar
              current={event.collective_amount || 0}
              goal={event.collective_goal || 0}
            />

            {showContrib && event.contributions?.length > 0 && (
              <div className="mt-4 border-t border-avorio-dark pt-4 space-y-2">
                {event.contributions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{c.contributor_name}</span>
                    <div className="flex items-center gap-3 text-gray-500">
                      <span className="text-xs">{format(new Date(c.created_at), 'd MMM', { locale: it })}</span>
                      <span className="text-xs capitalize bg-gray-100 px-2 py-0.5 rounded-full">
                        {c.payment_method}
                      </span>
                      <span className="font-semibold text-salvia">€{parseFloat(c.amount).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
        <div className="card">
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

        {/* ── Chi ha aperto il link ────────────────────────────────────── */}
        <div className="card">
          <button
            onClick={() => setShowViews((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <h2 className="font-display font-bold text-lg text-gray-900">Accessi al link</h2>
              <span className="text-sm text-gray-400">{openedCount} invitati hanno aperto</span>
            </div>
            {showViews ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showViews && (
            <div className="mt-4 border-t border-avorio-dark pt-4 space-y-2">
              {event.link_views?.length > 0 ? (
                event.link_views.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {v.guest_name || <span className="text-gray-400 italic">Anonimo</span>}
                    </span>
                    <div className="flex items-center gap-3 text-gray-400 text-xs">
                      <span>{v.view_count}x</span>
                      <span>{format(new Date(v.last_viewed_at), 'd MMM · HH:mm', { locale: it })}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">Nessuna visualizzazione ancora</p>
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
    </Layout>
  )
}

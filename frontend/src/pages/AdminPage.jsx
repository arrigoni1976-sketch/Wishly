import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { RefreshCw, Gift, Users, Calendar, TrendingUp, Star, Eye, CheckCircle, Repeat2, Share2, Smartphone, Monitor, Clock, BarChart2, X, ChevronRight } from 'lucide-react'
import api from '../lib/api'

const getAdminStats = (key) => api.get(`/admin/stats?key=${encodeURIComponent(key)}`)
const getEventDetail = (key, id) => api.get(`/admin/events/${id}?key=${encodeURIComponent(key)}`)

// ── Event detail panel ────────────────────────────────────────────────────────
function EventDetailPanel({ eventId, adminKey, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setFetchError(false)
    getEventDetail(adminKey, eventId)
      .then(r => setDetail(r.data))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [eventId, adminKey])

  if (loading) return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-8 text-gray-500">Carico...</div>
    </div>
  )
  if (fetchError) return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 text-center" onClick={e => e.stopPropagation()}>
        <p className="text-red-500 mb-4">Impossibile caricare i dettagli.</p>
        <button onClick={onClose} className="btn-primary">Chiudi</button>
      </div>
    </div>
  )
  if (!detail) return null

  const { event, gifts, rsvp, views, contributions } = detail
  const totalViews = views.reduce((a, v) => a + (v.view_count || 1), 0)
  const giftsReserved = gifts.filter(g => g.reserved_by)

  // Funnel steps
  const steps = [
    { label: 'Evento creato', done: true, detail: format(new Date(event.created_at), 'd MMM yyyy HH:mm', { locale: it }) },
    { label: 'Regali aggiunti', done: gifts.length > 0, detail: `${gifts.length} regalo${gifts.length !== 1 ? 'i' : ''}` },
    { label: 'Link aperto dagli invitati', done: totalViews > 0, detail: `${totalViews} visualizzazion${totalViews !== 1 ? 'i' : 'e'}` },
    { label: 'RSVP ricevuti', done: rsvp.length > 0, detail: `${rsvp.filter(r => r.status === 'yes').length} sì / ${rsvp.length} totali` },
    { label: 'Regali prenotati', done: giftsReserved.length > 0, detail: `${giftsReserved.length} su ${gifts.length}` },
  ]
  if (event.collective_enabled) {
    steps.push({ label: 'Contributi collettivo', done: contributions.length > 0, detail: `€${event.collective_amount || 0} / €${event.collective_goal}` })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-avorio-dark px-5 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="font-display font-bold text-lg text-gray-900">{event.child_name}</h2>
            <p className="text-xs text-gray-400">{event.parent_email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Funnel percorso */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Percorso</p>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${s.done ? 'bg-salvia text-white' : 'bg-gray-100 text-gray-300'}`}>
                    {s.done ? '✓' : i + 1}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className={`text-sm ${s.done ? 'text-gray-800' : 'text-gray-300'}`}>{s.label}</span>
                    {s.done && <span className="text-xs text-gray-400">{s.detail}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regali */}
          {gifts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Regali</p>
              <div className="space-y-1.5">
                {gifts.map(g => (
                  <div key={g.id} className="flex items-center justify-between text-sm py-1.5 border-b border-avorio-dark last:border-0">
                    <span className="text-gray-700 flex-1">{g.name}{g.price ? ` · €${g.price}` : ''}</span>
                    {g.reserved_by
                      ? <span className="text-xs bg-salvia/10 text-salvia rounded-lg px-2 py-0.5 ml-2">{g.reserved_by}</span>
                      : <span className="text-xs text-gray-300 ml-2">non prenotato</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RSVP */}
          {rsvp.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">RSVP</p>
              <div className="space-y-1.5">
                {rsvp.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-avorio-dark last:border-0">
                    <span className="text-gray-700">{r.guest_name}</span>
                    <span className={`text-xs font-medium ${r.status === 'yes' ? 'text-salvia' : 'text-red-400'}`}>
                      {r.status === 'yes' ? 'Presente' : 'Assente'}
                      {r.status === 'yes' && r.adults_count ? ` · ${r.adults_count + (r.children_count || 0)} pers.` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contributi collettivo */}
          {contributions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contributi collettivo</p>
              <div className="space-y-1.5">
                {contributions.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-avorio-dark last:border-0">
                    <span className="text-gray-700">{c.contributor_name}</span>
                    <span className="text-amber-600 font-medium">€{c.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info evento */}
          <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-avorio-dark">
            {event.party_date && <p>Festa: {format(new Date(event.party_date), 'd MMMM yyyy', { locale: it })}{event.party_time ? ` ore ${event.party_time}` : ''}</p>}
            {event.location && <p>Luogo: {event.location}</p>}
            {event.address && <p>Indirizzo: {event.address}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color = 'salvia' }) {
  const colors = {
    salvia: 'bg-salvia/10 text-salvia',
    cipria: 'bg-cipria/40 text-cipria-dark',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    green: 'bg-green-50 text-green-600',
  }
  return (
    <div className="bg-white rounded-2xl p-5 border border-avorio-dark">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-gray-500 leading-snug">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ml-2 ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-display font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Funnel row ───────────────────────────────────────────────────────────────
function FunnelRow({ step, label, value, sub, pct, icon: Icon, color, isLast }) {
  const colors = {
    salvia: 'bg-salvia text-white',
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    amber: 'bg-amber-500 text-white',
    violet: 'bg-violet-500 text-white',
    cipria: 'bg-cipria-dark text-white',
  }
  const bars = {
    salvia: 'bg-salvia',
    blue: 'bg-blue-400',
    green: 'bg-green-400',
    amber: 'bg-amber-400',
    violet: 'bg-violet-400',
    cipria: 'bg-cipria-dark',
  }
  return (
    <div className={`flex items-center gap-4 py-4 ${!isLast ? 'border-b border-avorio-dark' : ''}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${colors[color]}`}>
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-xl font-display font-bold text-gray-900 ml-2">{value.toLocaleString('it-IT')}</span>
        </div>
        <div className="h-1.5 bg-avorio-dark rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${bars[color]}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Monthly bar ──────────────────────────────────────────────────────────────
function MonthBar({ month, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  const label = format(new Date(month + '-01'), 'MMM yy', { locale: it })
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-12 capitalize">{label}</span>
      <div className="flex-1 h-2 bg-avorio-dark rounded-full overflow-hidden">
        <div className="h-full bg-salvia rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-4 text-right">{count}</span>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [key, setKey] = useState(() => sessionStorage.getItem('piky_admin_key') || '')
  const [inputKey, setInputKey] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedEventId, setSelectedEventId] = useState(null)

  const fetchStats = async (k) => {
    setLoading(true)
    setError('')
    try {
      const res = await getAdminStats(k)
      setData(res.data)
      sessionStorage.setItem('piky_admin_key', k)
      setKey(k)
    } catch {
      setError('Chiave non valida.')
      sessionStorage.removeItem('piky_admin_key')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (key) fetchStats(key) }, [])

  // ── Login ─────────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <div className="min-h-screen bg-avorio flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 shadow-sm w-full max-w-xs text-center">
          <div className="w-12 h-12 bg-salvia/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star className="w-6 h-6 text-salvia" />
          </div>
          <h1 className="font-display text-xl font-bold text-gray-900 mb-6">Piky Admin</h1>
          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          <form onSubmit={(e) => { e.preventDefault(); fetchStats(inputKey) }} className="space-y-3">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Chiave admin"
              className="input text-center"
              autoFocus
            />
            <button type="submit" disabled={loading || !inputKey} className="btn-primary w-full">
              {loading ? 'Carico...' : 'Accedi'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const { overview, funnel, monetization, recentEvents, byMonth, analytics } = data
  const maxMonth = Math.max(...byMonth.map(([, c]) => c), 1)
  const collectivePct = overview.total > 0 ? Math.round((overview.withCollective / overview.total) * 100) : 0
  const base = funnel.eventsCreated || 1

  return (
    <div className="min-h-screen bg-avorio">
      {/* Header */}
      <div className="bg-white border-b border-avorio-dark px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-salvia rounded-xl flex items-center justify-center">
            <Star className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-display font-bold text-gray-900">Piky Admin</h1>
        </div>
        <button
          onClick={() => fetchStats(key)}
          disabled={loading}
          className="p-2 rounded-xl text-gray-400 hover:text-salvia hover:bg-salvia/10 transition-colors"
          title="Aggiorna"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Volume events */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Volume eventi</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Totale creati" value={overview.total} icon={Calendar} color="salvia" />
            <StatCard label="Questo mese" value={overview.thisMonth} icon={TrendingUp} color="blue" />
            <StatCard label="Ultimi 7 giorni" value={overview.thisWeek} icon={TrendingUp} color="cipria" />
            <StatCard label="Con collettivo" value={overview.withCollective} sub={`${collectivePct}% del totale`} icon={Gift} color="amber" />
          </div>
        </div>

        {/* Conversion funnel */}
        <div className="bg-white rounded-2xl border border-avorio-dark overflow-hidden">
          <div className="px-5 py-4 border-b border-avorio-dark">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Funnel di conversione</h2>
          </div>
          <div className="px-5">
            <FunnelRow
              step="1" icon={Calendar} color="salvia"
              label="Eventi creati"
              value={funnel.eventsCreated}
              pct={100}
              sub="punto di partenza"
            />
            <FunnelRow
              step="2" icon={Eye} color="blue"
              label="Invitati che aprono il link"
              value={funnel.linkViews}
              pct={funnel.linkViews / base * 100}
              sub={base > 0 ? `${(funnel.linkViews / base).toFixed(1)} aperture per evento` : undefined}
            />
            <FunnelRow
              step="3" icon={CheckCircle} color="green"
              label="Confermano la presenza"
              value={funnel.rsvpYes}
              pct={funnel.rsvpYes / Math.max(funnel.linkViews, 1) * 100}
              sub={funnel.linkViews > 0 ? `${Math.round(funnel.rsvpYes / funnel.linkViews * 100)}% degli invitati che aprono` : undefined}
            />
            <FunnelRow
              step="4" icon={Gift} color="amber"
              label="Prenotano un regalo"
              value={funnel.giftsReserved}
              pct={funnel.giftsReserved / Math.max(funnel.rsvpYes, 1) * 100}
              sub={funnel.rsvpYes > 0 ? `${Math.round(funnel.giftsReserved / funnel.rsvpYes * 100)}% dei confermati` : undefined}
            />
            <FunnelRow
              step="5" icon={Repeat2} color="violet"
              label="Tornano per un secondo compleanno"
              value={funnel.returnOrganizers}
              pct={funnel.returnOrganizers / base * 100}
              sub={base > 0 ? `${Math.round(funnel.returnOrganizers / base * 100)}% degli organizzatori` : undefined}
            />
            <FunnelRow
              step="6" icon={Share2} color="cipria"
              label="Organizzatori arrivati da un invito"
              value={funnel.organizersFromInvite}
              pct={funnel.organizersFromInvite / base * 100}
              sub="erano invitati prima di diventare organizzatori"
              isLast
            />
          </div>
        </div>

        {/* Monetizzazione */}
        <div className="bg-white rounded-2xl border border-avorio-dark overflow-hidden">
          <div className="px-5 py-4 border-b border-avorio-dark flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Monetizzazione</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${monetization?.paymentActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              {monetization?.paymentActive ? '● Attiva' : '○ Non attiva'}
            </span>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-gray-400">
              Modello: primo evento gratuito · dal secondo <strong>€{monetization?.pricePerEvent?.toFixed(2)}</strong> per evento · identificazione via email
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-gray-900">{monetization?.returningUsers ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">utenti di ritorno</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-gray-900">{monetization?.additionalEvents ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">eventi aggiuntivi</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-salvia">
                  €{(monetization?.potentialRevenue ?? 0).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">ricavo potenziale</p>
              </div>
            </div>
            {!monetization?.paymentActive && (
              <p className="text-xs text-gray-400 bg-avorio rounded-xl px-3 py-2">
                Per attivare il pagamento: imposta <code className="font-mono bg-gray-100 px-1 rounded">PAYMENT_ACTIVE = true</code> in <code className="font-mono bg-gray-100 px-1 rounded">CreateEventPage.jsx</code>
              </p>
            )}
          </div>
        </div>

        {/* Collective */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Regali collettivi</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Totale obiettivi sommati"
              value={`€${overview.totalCollectiveGoal.toLocaleString('it-IT')}`}
              icon={Star} color="amber"
            />
            <StatCard
              label="Raccolto effettivo"
              value={`€${overview.totalCollectiveOrganized.toLocaleString('it-IT')}`}
              sub={overview.totalCollectiveGoal > 0 ? `${Math.round(overview.totalCollectiveOrganized / overview.totalCollectiveGoal * 100)}% degli obiettivi` : undefined}
              icon={Users} color="green"
            />
          </div>
        </div>

        {/* Monthly trend */}
        {byMonth.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-avorio-dark">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Andamento ultimi 6 mesi</h2>
            <div className="space-y-3">
              {byMonth.map(([month, count]) => (
                <MonthBar key={month} month={month} count={count} max={maxMonth} />
              ))}
            </div>
          </div>
        )}

        {/* Dispositivi */}
        {analytics && (
          <div className="bg-white rounded-2xl border border-avorio-dark overflow-hidden">
            <div className="px-5 py-4 border-b border-avorio-dark flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dispositivi degli invitati</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Device type */}
              {(() => {
                const d = analytics.devices
                const tot = (d.mobile || 0) + (d.tablet || 0) + (d.desktop || 0) + (d.unknown || 0)
                const pct = (n) => tot > 0 ? Math.round((n / tot) * 100) : 0
                return (
                  <div className="space-y-2">
                    {[
                      { label: 'Mobile', val: d.mobile || 0, color: 'bg-salvia' },
                      { label: 'Desktop', val: d.desktop || 0, color: 'bg-blue-400' },
                      { label: 'Tablet', val: d.tablet || 0, color: 'bg-amber-400' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-14">{label}</span>
                        <div className="flex-1 h-2 bg-avorio-dark rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct(val)}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-16 text-right">{val} ({pct(val)}%)</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
              {/* OS breakdown */}
              {Object.keys(analytics.os || {}).length > 0 && (
                <div className="pt-3 border-t border-avorio-dark">
                  <p className="text-xs text-gray-400 mb-2">Sistema operativo</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analytics.os).sort((a, b) => b[1] - a[1]).map(([os, n]) => (
                      <span key={os} className="text-xs bg-avorio px-2 py-1 rounded-lg text-gray-600 font-medium">
                        {os}: {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Browser breakdown */}
              {Object.keys(analytics.browsers || {}).length > 0 && (
                <div className="pt-3 border-t border-avorio-dark">
                  <p className="text-xs text-gray-400 mb-2">Browser</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(analytics.browsers).sort((a, b) => b[1] - a[1]).map(([br, n]) => (
                      <span key={br} className="text-xs bg-avorio px-2 py-1 rounded-lg text-gray-600 font-medium">
                        {br}: {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Acquisizione */}
        {analytics && Object.keys(analytics.acquisition || {}).length > 0 && (
          <div className="bg-white rounded-2xl border border-avorio-dark overflow-hidden">
            <div className="px-5 py-4 border-b border-avorio-dark flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fonte di acquisizione</h2>
            </div>
            <div className="p-5">
              {(() => {
                const entries = Object.entries(analytics.acquisition).sort((a, b) => b[1] - a[1])
                const tot = entries.reduce((a, [, n]) => a + n, 0)
                return (
                  <div className="space-y-2">
                    {entries.map(([src, n]) => (
                      <div key={src} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24 truncate capitalize">{src}</span>
                        <div className="flex-1 h-2 bg-avorio-dark rounded-full overflow-hidden">
                          <div className="h-full bg-violet-400 rounded-full" style={{ width: `${Math.round(n / tot * 100)}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-16 text-right">{n} ({Math.round(n / tot * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Latenza */}
        {analytics?.latency && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Latenza — velocità di risposta</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-5 border border-avorio-dark">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm text-gray-500 leading-snug">Ore medie al primo RSVP</span>
                  <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 ml-2">
                    <Clock className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <p className="text-3xl font-display font-bold text-gray-900">
                  {analytics.latency.avgRsvpHours !== null ? (analytics.latency.avgRsvpHours === 0 ? '< 1h' : `${analytics.latency.avgRsvpHours}h`) : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">su {analytics.latency.eventsWithRsvp} eventi</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-avorio-dark">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm text-gray-500 leading-snug">Ore medie alla prima prenotazione</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 ml-2">
                    <Gift className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <p className="text-3xl font-display font-bold text-gray-900">
                  {analytics.latency.avgGiftHours !== null ? `${analytics.latency.avgGiftHours}h` : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">su {analytics.latency.eventsWithGift} eventi</p>
              </div>
            </div>
          </div>
        )}

        {/* Events table */}
        <div className="bg-white rounded-2xl border border-avorio-dark overflow-hidden">
          <div className="px-5 py-4 border-b border-avorio-dark">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Ultimi {recentEvents.length} eventi
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-avorio text-xs text-gray-400 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Bambino</th>
                  <th className="text-left px-4 py-3 font-semibold">Festa</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Email</th>
                  <th className="text-center px-4 py-3 font-semibold">Regali</th>
                  <th className="text-center px-4 py-3 font-semibold">RSVP ✓</th>
                  <th className="text-center px-4 py-3 font-semibold hidden sm:table-cell">Collettivo</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Creato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-avorio-dark">
                {recentEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-avorio/50 transition-colors cursor-pointer" onClick={() => setSelectedEventId(e.id)}>
                    <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-1">{e.child_name}<ChevronRight className="w-3 h-3 text-gray-300 inline" /></td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {e.party_date ? format(new Date(e.party_date), 'd MMM yyyy', { locale: it }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell text-xs">{e.parent_email}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{e.gifts_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${e.rsvp_yes > 0 ? 'text-salvia' : 'text-gray-300'}`}>
                        {e.rsvp_yes}
                        {e.rsvp_total > 0 && <span className="text-gray-300 font-normal">/{e.rsvp_total}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {e.collective_enabled
                        ? <span className="text-xs bg-amber-50 text-amber-600 rounded-lg px-2 py-0.5 font-medium">
                            €{e.collective_amount || 0}/€{e.collective_goal}
                          </span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell whitespace-nowrap">
                      {format(new Date(e.created_at), 'd MMM', { locale: it })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {selectedEventId && (
        <EventDetailPanel
          eventId={selectedEventId}
          adminKey={key}
          onClose={() => setSelectedEventId(null)}
        />
      )}
    </div>
  )
}

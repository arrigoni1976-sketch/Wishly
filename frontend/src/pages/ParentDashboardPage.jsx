import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  Gift, Users, Plus, Calendar, Clock, MapPin,
  Mail, ChevronDown, ChevronUp, Pencil, Trash2, X, Check, PartyPopper,
  Baby, AlertCircle, Share2, MessageCircle, Copy
} from 'lucide-react'
import Layout from '../components/Layout'
import GiftCard from '../components/GiftCard'
import ProgressBar from '../components/ProgressBar'
import GiftIcon from '../components/GiftIcon'
import CakeIcon from '../components/CakeIcon'
import BalloonIcon from '../components/BalloonIcon'
import CelebrationIcon from '../components/CelebrationIcon'
import HeartRibbonIcon from '../components/HeartRibbonIcon'
import { getEventByParentToken, addGift, updateGift, deleteGift, updateEvent, confirmContribution, getPushVapidKey, subscribePush } from '../lib/api'
import { useTranslation } from 'react-i18next'
import { formatEur } from '../lib/format'
import { format } from 'date-fns'
import { it, enUS } from 'date-fns/locale'

function urlBase64ToUint8Array(b64) {
  const padding = '='.repeat((4 - b64.length % 4) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}
const RSVP_COLORS = {
  yes: 'badge-rsvp-yes',
  maybe: 'badge-rsvp-maybe',
  no: 'badge-rsvp-no',
}

// ─── Add/Edit Gift Modal ───────────────────────────────────────────────────
function GiftModal({ isOpen, onClose, onSave, initialData }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(
    initialData || { name: '', description: '', price: '', amazonUrl: '', storeUrl: '' }
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) setForm(initialData)
    else setForm({ name: '', description: '', price: '', amazonUrl: '', storeUrl: '' })
    setError('')
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!form.name.trim()) return
    setLoading(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      console.error(e)
      setError(t('dashboard.gift_modal.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl font-bold">
            {initialData ? t('dashboard.gift_modal.title.edit') : t('dashboard.gift_modal.title.add')}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">{t('dashboard.gift_modal.name.label')}</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('dashboard.gift_modal.name.placeholder')}
              className="input"
            />
          </div>
          <div>
            <label className="label">{t('dashboard.gift_modal.description.label')}</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('dashboard.gift_modal.description.placeholder')}
              className="input"
            />
          </div>
          <div>
            <label className="label">{t('dashboard.gift_modal.price.label')}</label>
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
          <p className="text-xs text-gray-400 italic -mt-1">
            {t('dashboard.gift_modal.link_hint')}
          </p>
          <div>
            <label className="label">{t('dashboard.gift_modal.amazon.label')}</label>
            <input
              type="url"
              value={form.amazonUrl}
              onChange={(e) => setForm({ ...form, amazonUrl: e.target.value })}
              placeholder={t('dashboard.gift_modal.amazon.placeholder')}
              className="input"
            />
          </div>
          <div>
            <label className="label">{t('dashboard.gift_modal.store.label')}</label>
            <input
              type="url"
              value={form.storeUrl}
              onChange={(e) => setForm({ ...form, storeUrl: e.target.value })}
              placeholder={t('dashboard.gift_modal.store.placeholder')}
              className="input"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-3">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 btn-outline py-2.5">
            {t('dashboard.gift_modal.cancel')}
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
            {initialData ? t('dashboard.gift_modal.save') : t('dashboard.gift_modal.add')}
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
  const { t, i18n } = useTranslation()
  const isNew = searchParams.get('nuovo') === '1'
  const [showNewBanner, setShowNewBanner] = useState(isNew)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [giftModal, setGiftModal] = useState({ open: false, data: null })
  const [showRsvp, setShowRsvp] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [notifStatus, setNotifStatus] = useState(() => {
    if (typeof Notification === 'undefined') return 'unsupported'
    if (Notification.permission === 'granted') return 'granted'
    if (Notification.permission === 'denied') return 'denied'
    return 'default'
  })
  const [showContrib, setShowContrib] = useState(false)
  const [copied, setCopied] = useState(false)
  const [collectiveModal, setCollectiveModal] = useState(false)
  const [collectiveForm, setCollectiveForm] = useState({ description: '', goal: '', paypal_email: '', fixed_quota: '' })
  const [collectiveSaving, setCollectiveSaving] = useState(false)
  const [collectiveSaveError, setCollectiveSaveError] = useState('')
  const [eventModal, setEventModal] = useState(false)
  const [eventForm, setEventForm] = useState({
    child_name: '', gender: '', party_date: '', party_time: '', location: '', address: '', notes: '',
  })
  const [eventSaving, setEventSaving] = useState(false)
  const [eventSaveError, setEventSaveError] = useState('')
  const [thankYouMsg, setThankYouMsg] = useState('')
  const [msgCopied, setMsgCopied] = useState(false)

  const dateLocale = i18n.language === 'en' ? enUS : it

  const RSVP_LABELS = {
    yes: t('guest.rsvp.done.yes'),
    maybe: t('guest.rsvp.done.maybe'),
    no: t('guest.rsvp.done.no'),
  }

  const baseUrl = window.location.origin

  const openCollectiveEdit = () => {
    setCollectiveForm({
      description: event.collective_description || '',
      goal: event.collective_goal || '',
      paypal_email: event.paypal_email || '',
      fixed_quota: event.collective_fixed_quota || '',
    })
    setCollectiveSaveError('')
    setCollectiveModal(true)
  }

  const disableCollective = async () => {
    if (!window.confirm(t('dashboard.collective.disable_confirm'))) return
    try {
      await updateEvent(event.id, { parentToken, collective_enabled: false })
      await fetchEvent()
    } catch (e) {
      console.error(e)
    }
  }

  const saveCollective = async () => {
    setCollectiveSaving(true)
    setCollectiveSaveError('')
    try {
      await updateEvent(event.id, {
        parentToken: parentToken,
        collective_enabled: true,
        collective_description: collectiveForm.description || null,
        collective_goal: parseFloat(collectiveForm.goal) || event.collective_goal,
        paypal_email: collectiveForm.paypal_email || null,
        collective_fixed_quota: parseFloat(collectiveForm.fixed_quota) || null,
      })
      await fetchEvent()
      setCollectiveModal(false)
    } catch (e) {
      console.error(e)
      setCollectiveSaveError(t('dashboard.collective_modal.error'))
    } finally {
      setCollectiveSaving(false)
    }
  }

  const openEventEdit = () => {
    setEventForm({
      child_name: event.child_name || '',
      gender: event.gender || '',
      party_date: event.party_date || '',
      party_time: event.party_time ? event.party_time.slice(0, 5) : '',
      location: event.location || '',
      address: event.address || '',
      notes: event.notes || '',
    })
    setEventSaveError('')
    setEventModal(true)
  }

  const saveEventDetails = async () => {
    if (!eventForm.child_name.trim() || !eventForm.party_date) return
    setEventSaving(true)
    setEventSaveError('')
    try {
      await updateEvent(event.id, {
        parentToken: parentToken,
        child_name: eventForm.child_name.trim(),
        gender: eventForm.gender || null,
        party_date: eventForm.party_date,
        party_time: eventForm.party_time || null,
        location: eventForm.location || null,
        address: eventForm.address || null,
        notes: eventForm.notes || null,
      })
      await fetchEvent()
      setEventModal(false)
    } catch (e) {
      console.error(e)
      setEventSaveError(t('dashboard.event_modal.error'))
    } finally {
      setEventSaving(false)
    }
  }

  const shareGuestLink = async () => {
    const url = `${baseUrl}/lista/${event?.guest_token}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('dashboard.header.title', { name: event.child_name }),
          text: t('dashboard.share.share_text', { name: event.child_name }),
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

  const shareUpdate = async () => {
    const url = `${baseUrl}/lista/${event?.guest_token}`
    const text = t('dashboard.share.update_text', { name: event.child_name }) + `\n${url}`
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const fetchEvent = async () => {
    try {
      const res = await getEventByParentToken(parentToken)
      setEvent(res.data)
    } catch {
      setError(t('dashboard.error.not_found'))
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchEvent()
    setRefreshing(false)
  }

  const handleEnableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setNotifStatus('denied'); return }
      const sw = await navigator.serviceWorker.ready
      const { data: { key } } = await getPushVapidKey()
      const appKey = urlBase64ToUint8Array(key)
      const existing = await sw.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()
      const subscription = await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey })
      await subscribePush({ parentToken, subscription: subscription.toJSON() })
      setNotifStatus('granted')
    } catch (err) {
      console.error('[push] subscribe error:', err)
      setNotifStatus('denied')
    }
  }

  useEffect(() => {
    if (notifStatus !== 'granted' || !navigator.serviceWorker || !window.PushManager) return
    ;(async () => {
      try {
        const sw = await navigator.serviceWorker.ready
        const { data: { key } } = await getPushVapidKey()
        const appKey = urlBase64ToUint8Array(key)
        const existing = await sw.pushManager.getSubscription()
        if (existing) await existing.unsubscribe()
        const sub = await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey })
        await subscribePush({ parentToken, subscription: sub.toJSON() })
      } catch (err) { console.error('[push] rinnovo subscription fallito:', err) }
    })()
  }, [])

  useEffect(() => { fetchEvent() }, [parentToken])

  useEffect(() => {
    if (event?.contributions?.some(c => c.status === 'pending' && c.payment_method === 'paypal')) {
      setShowContrib(true)
    }
  }, [event?.contributions])

  const handleAddGift = async (form) => {
    await addGift(event.id, form, parentToken)
    await fetchEvent()
  }

  const handleEditGift = async (form) => {
    await updateGift(form.id, form, parentToken)
    await fetchEvent()
  }

  const handleDeleteGift = async (giftId) => {
    if (!confirm(t('dashboard.gifts.delete_confirm'))) return
    try {
      await deleteGift(giftId, parentToken)
      await fetchEvent()
    } catch (e) {
      console.error(e)
      alert(t('dashboard.gifts.delete_error'))
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-cipria border-t-salvia rounded-full animate-spin mx-auto" />
            <p className="text-gray-400">{t('dashboard.loading')}</p>
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
            <Link to="/" className="btn-primary inline-block">{t('dashboard.error.back')}</Link>
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

  const defaultThankYou = t('dashboard.thanks.placeholder', { name: event.child_name })

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* ── Banner nuovo evento ──────────────────────────────────────── */}
        {showNewBanner && (
          <div className="relative bg-gradient-to-r from-salvia to-salvia-dark text-white rounded-3xl px-6 py-5 flex items-center gap-4 animate-slide-up shadow-lg shadow-salvia/20">
            <div className="flex-shrink-0"><CelebrationIcon size={36} /></div>
            <div className="flex-1">
              <p className="font-display font-bold text-lg leading-tight">
                {t('dashboard.new_banner.title')}
              </p>
              <p className="text-white/80 text-sm mt-0.5">
                {t('dashboard.new_banner.body')}
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
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold text-gray-900">
                    {t('dashboard.header.title', { name: event.child_name })}
                  </h1>
                  <button
                    onClick={openEventEdit}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-salvia hover:bg-salvia/10 transition-colors flex-shrink-0"
                    title={t('dashboard.header.edit_title')}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-1 mt-1 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-3">
                    {event.party_date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cipria-dark" />
                        {format(new Date(event.party_date), "d MMMM yyyy", { locale: dateLocale })}
                      </span>
                    )}
                    {event.party_time && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cipria-dark" />
                        {event.party_time.slice(0, 5)}
                      </span>
                    )}
                  </div>
                  {(event.location || event.address) && (
                    event.address ? (
                      <span className="flex flex-col gap-0.5 text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-cipria-dark flex-shrink-0" />
                          <span>{event.location || event.address}</span>
                        </span>
                        {event.location && (
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pl-5 underline underline-offset-2 hover:text-gray-700 transition-colors"
                          >
                            {event.address} →
                          </a>
                        )}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cipria-dark" />
                        {event.location}
                      </span>
                    )
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
                <span className="inline-flex items-center gap-1">
                  <CelebrationIcon size={14} />
                  {t('dashboard.header.adults_children', { adults: totalAdults, children: totalChildren })}
                </span>
              </button>
              <div className="bg-cipria/20 text-gray-700 rounded-xl px-3 py-1.5 text-sm font-medium">
                <span className="inline-flex items-center gap-1"><GiftIcon size={14} /> {reservedCount}/{event.gifts?.length || 0} {t('dashboard.header.gifts_reserved')}</span>
              </div>
              {event.collective_enabled && event.collective_goal > 0 && (
                <div className="bg-salvia/10 text-salvia rounded-xl px-3 py-1.5 text-sm font-medium">
                  <span className="inline-flex items-center gap-1">
                    <HeartRibbonIcon size={14} />
                    {Math.round(Math.min(100, ((event.collective_amount || 0) / event.collective_goal) * 100))}% {t('dashboard.header.collective')}
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

          <div className="mt-3 pt-3 border-t border-avorio-dark flex justify-end">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs text-gray-400 hover:text-salvia transition-colors flex items-center gap-1"
            >
              <span className={refreshing ? 'animate-spin inline-block' : ''}>↻</span>
              {refreshing ? t('dashboard.refresh.loading') : t('dashboard.refresh.btn')}
            </button>
          </div>
        </div>

        {/* ── Condividi con gli invitati ─────────────────────────────── */}
        <div className="card">
          <h2 className="font-display font-bold text-lg text-gray-900 mb-1">
            {t('dashboard.share.title')}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            {t('dashboard.share.body1', { name: event.child_name })}
          </p>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            {t('dashboard.share.body2')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={shareGuestLink}
              className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 text-sm"
            >
              <Share2 className="w-4 h-4" />
              {copied ? t('dashboard.share.copied') : t('dashboard.share.btn')}
            </button>
            <a
              href={`${baseUrl}/lista/${event?.guest_token}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 border border-gray-200 rounded-2xl text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title={t('dashboard.share.preview_title')}
            >
              {t('dashboard.share.preview')}
            </a>
          </div>
          <div className="mt-3 pt-3 border-t border-avorio-dark">
            <p className="text-sm text-gray-600 mb-2">{t('dashboard.share.update_hint')}</p>
            <button
              onClick={shareUpdate}
              className="w-full py-2.5 border border-gray-200 rounded-2xl text-sm text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              {t('dashboard.share.update_btn')}
            </button>
          </div>
          {notifStatus === 'default' && (
            <button
              onClick={handleEnableNotifications}
              className="mt-3 w-full py-2.5 border border-salvia/40 rounded-2xl text-sm text-salvia font-medium flex items-center justify-center gap-2 hover:bg-salvia/5 transition-colors"
            >
              {t('dashboard.notif.enable')}
            </button>
          )}
          {notifStatus === 'granted' && (
            <p className="mt-3 text-xs text-salvia font-medium text-center">
              {t('dashboard.notif.active')}
            </p>
          )}
          {notifStatus === 'denied' && (
            <p className="mt-3 text-xs text-gray-400 text-center">
              {t('dashboard.notif.blocked')}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2 text-center">
            {t('dashboard.share.return_hint')}
          </p>
        </div>

        {/* ── Regalo collettivo ────────────────────────────────────────── */}
        {!event.collective_enabled && (
          <button
            onClick={openCollectiveEdit}
            className="w-full card flex items-center gap-3 text-left hover:bg-avorio-dark transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-salvia/10 flex items-center justify-center flex-shrink-0">
              <HeartRibbonIcon size={18} />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{t('dashboard.collective.add.title')}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.collective.add.subtitle')}</p>
            </div>
            <Plus className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
          </button>
        )}
        {event.collective_enabled && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-bold text-lg text-gray-900">
                  {t('dashboard.collective.section_title')}
                </h2>
                {event.collective_description && (
                  <p className="text-sm text-gray-500 mt-0.5">{event.collective_description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openCollectiveEdit}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-salvia hover:bg-salvia/10 transition-colors"
                  title={t('dashboard.collective.edit_title')}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowContrib((v) => !v)}
                  className="text-sm text-salvia font-medium flex items-center gap-1"
                >
                  {showContrib ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showContrib ? t('dashboard.collective.hide') : t('dashboard.collective.show')}
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
                        <span className="text-xs">{format(new Date(c.created_at), 'd MMM', { locale: dateLocale })}</span>
                        <span className="text-xs capitalize bg-gray-100 px-2 py-0.5 rounded-full">{c.payment_method}</span>
                        <span className="font-semibold text-salvia">€{formatEur(c.amount)}</span>
                      </div>
                    </div>
                  ))}
                  {pending.length > 0 && (
                    <div className="border-t border-amber-100 pt-3 space-y-2">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">{t('dashboard.collective.paypal_pending')}</p>
                      {pending.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-sm bg-amber-50 rounded-xl px-3 py-2">
                          <div>
                            <span className="font-medium text-gray-700">{c.contributor_name}</span>
                            <span className="text-xs text-gray-400 ml-2">{format(new Date(c.created_at), 'd MMM', { locale: dateLocale })} · €{formatEur(c.amount)}</span>
                          </div>
                          <button
                            onClick={async () => {
                              await confirmContribution(event.id, c.id, parentToken)
                              fetchEvent()
                            }}
                            className="text-xs font-semibold text-white bg-salvia hover:bg-salvia/90 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {t('dashboard.collective.confirm_btn')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {showContrib && (!event.contributions || event.contributions.length === 0) && (
              <p className="mt-4 text-sm text-gray-400 text-center">{t('dashboard.collective.empty')}</p>
            )}
          </div>
        )}

        {/* ── Regali ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg text-gray-900">
              {t('dashboard.gifts.title', { count: event.gifts?.length || 0 })}
            </h2>
            <button
              onClick={() => setGiftModal({ open: true, data: null })}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {t('dashboard.gifts.add_btn')}
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
              <p className="font-medium">{t('dashboard.gifts.empty.title')}</p>
              <p className="text-sm mt-1">{t('dashboard.gifts.empty.body')}</p>
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
              <h2 className="font-display font-bold text-lg text-gray-900">{t('dashboard.rsvp.title')}</h2>
              <div className="flex gap-1.5">
                <span className="badge-rsvp-yes">{rsvpYes.length} {t('dashboard.rsvp.yes')}</span>
                <span className="badge-rsvp-maybe">{rsvpMaybe.length} {t('dashboard.rsvp.maybe')}</span>
                <span className="badge-rsvp-no">{rsvpNo.length} {t('dashboard.rsvp.no')}</span>
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
                      {r.parent_name && (
                        <span className="ml-1.5 text-gray-400 text-xs">· {r.parent_name}</span>
                      )}
                      {r.parent_name ? (
                        <>
                          {r.adults_count > 1 && (
                            <span className="ml-2 text-gray-400 text-xs">
                              + {r.adults_count - 1} {r.adults_count - 1 === 1 ? t('dashboard.rsvp.adults_one') : t('dashboard.rsvp.adults_other')}
                            </span>
                          )}
                          {r.children_count > 1 && (
                            <span className="ml-2 text-gray-400 text-xs">
                              + {r.children_count - 1} {r.children_count - 1 === 1 ? t('dashboard.rsvp.children_one') : t('dashboard.rsvp.children_other')}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {(r.adults_count > 1 || r.with_partner) && (
                            <span className="ml-2 text-gray-400 text-xs">
                              {r.adults_count > 1 ? `${r.adults_count} ${t('dashboard.rsvp.adults_other')}` : t('dashboard.rsvp.partner')}
                            </span>
                          )}
                          {r.children_count > 0 && (
                            <span className="ml-2 text-gray-400 text-xs">
                              + {r.children_count} {r.children_count === 1 ? t('dashboard.rsvp.children_one') : t('dashboard.rsvp.children_other')}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <span className={RSVP_COLORS[r.status]}>{RSVP_LABELS[r.status]}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">{t('dashboard.rsvp.empty')}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Ringraziamenti ─────────────────────────────── */}
        {event.party_date && new Date(event.party_date) <= new Date() && (
          <div className="card">
            <h2 className="font-display font-bold text-lg text-gray-900 mb-1 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-cipria-dark" />
              {t('dashboard.thanks.title')}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {t('dashboard.thanks.body')}
            </p>
              <div className="space-y-3">
                <textarea
                  value={thankYouMsg}
                  onChange={(e) => setThankYouMsg(e.target.value)}
                  placeholder={defaultThankYou}
                  rows={4}
                  className="input resize-none text-sm"
                />
                <div className="flex gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(thankYouMsg.trim() || defaultThankYou)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                  >
                    <HeartRibbonIcon size={16} />
                    {t('dashboard.thanks.whatsapp_btn')}
                  </a>
                  <button
                    onClick={() => {
                      const text = thankYouMsg.trim() || defaultThankYou
                      navigator.clipboard.writeText(text)
                      setMsgCopied(true)
                      setTimeout(() => setMsgCopied(false), 2000)
                    }}
                    className="px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    {msgCopied ? <Check className="w-4 h-4 text-salvia" /> : <Copy className="w-4 h-4" />}
                    {msgCopied ? t('dashboard.thanks.copy_done') : t('dashboard.thanks.copy_btn')}
                  </button>
                </div>
              </div>
          </div>
        )}

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
              <h3 className="font-display font-bold text-gray-900 text-lg">{t('dashboard.collective_modal.title')}</h3>
              <button onClick={() => setCollectiveModal(false)} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">{t('dashboard.collective_modal.description.label')}</label>
                <input
                  value={collectiveForm.description}
                  onChange={(e) => setCollectiveForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t('dashboard.collective_modal.description.placeholder')}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('dashboard.collective_modal.goal.label')}</label>
                <input
                  type="number"
                  min="1"
                  value={collectiveForm.goal}
                  onChange={(e) => setCollectiveForm((f) => ({ ...f, goal: e.target.value }))}
                  placeholder={t('dashboard.collective_modal.goal.placeholder')}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('dashboard.collective_modal.fixed.label')}</label>
                <input
                  type="number"
                  min="1"
                  value={collectiveForm.fixed_quota}
                  onChange={(e) => setCollectiveForm((f) => ({ ...f, fixed_quota: e.target.value }))}
                  placeholder={t('dashboard.collective_modal.fixed.placeholder')}
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1">{t('dashboard.collective_modal.fixed.hint')}</p>
              </div>
              <div>
                <label className="label">{t('dashboard.collective_modal.paypal.label')}</label>
                <input
                  type="text"
                  value={collectiveForm.paypal_email}
                  onChange={(e) => setCollectiveForm((f) => ({ ...f, paypal_email: e.target.value }))}
                  placeholder={t('dashboard.collective_modal.paypal.placeholder')}
                  className="input"
                />
              </div>
            </div>

            {collectiveSaveError && (
              <p className="text-sm text-red-600">{collectiveSaveError}</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setCollectiveModal(false)} className="flex-1 btn-outline text-sm py-2.5">
                {t('dashboard.collective_modal.cancel')}
              </button>
              <button
                onClick={saveCollective}
                disabled={collectiveSaving}
                className="flex-1 btn-primary text-sm py-2.5"
              >
                {collectiveSaving ? t('dashboard.collective_modal.saving') : t('dashboard.collective_modal.save')}
              </button>
            </div>

            {event.collective_enabled && (
              <button
                onClick={() => { setCollectiveModal(false); disableCollective() }}
                className="w-full text-xs text-red-400 hover:text-red-600 text-center pt-1"
              >
                {t('dashboard.collective_modal.remove')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Modifica dettagli festa ───────────────────────────────────── */}
      {eventModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4"
          onClick={() => setEventModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-gray-900 text-lg">{t('dashboard.event_modal.title')}</h3>
              <button onClick={() => setEventModal(false)} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">{t('dashboard.event_modal.name.label')}</label>
                <input
                  value={eventForm.child_name}
                  onChange={(e) => setEventForm((f) => ({ ...f, child_name: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('dashboard.event_modal.date.label')}</label>
                <input
                  type="date"
                  value={eventForm.party_date}
                  onChange={(e) => setEventForm((f) => ({ ...f, party_date: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('dashboard.event_modal.time.label')}</label>
                <input
                  type="time"
                  value={eventForm.party_time}
                  onChange={(e) => setEventForm((f) => ({ ...f, party_time: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('dashboard.event_modal.location.label')}</label>
                <input
                  value={eventForm.location}
                  onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder={t('dashboard.event_modal.location.placeholder')}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('dashboard.event_modal.address.label')}</label>
                <input
                  value={eventForm.address}
                  onChange={(e) => setEventForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder={t('dashboard.event_modal.address.placeholder')}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('dashboard.event_modal.notes.label')}</label>
                <textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="input resize-none"
                />
              </div>
            </div>

            {eventSaveError && (
              <p className="text-sm text-red-600">{eventSaveError}</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setEventModal(false)} className="flex-1 btn-outline text-sm py-2.5">
                {t('dashboard.event_modal.cancel')}
              </button>
              <button
                onClick={saveEventDetails}
                disabled={eventSaving || !eventForm.child_name.trim() || !eventForm.party_date}
                className="flex-1 btn-primary text-sm py-2.5"
              >
                {eventSaving ? t('dashboard.event_modal.saving') : t('dashboard.event_modal.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

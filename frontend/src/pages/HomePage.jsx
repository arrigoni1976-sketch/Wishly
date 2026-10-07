import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { Gift, Users, Heart, Shield, Bell, Star, Lock, Sparkles, Share2, RefreshCw, Calendar, MapPin, LogIn, LogOut } from 'lucide-react'
import { getMyEvents, deleteAccount } from '../lib/api'
import GiftIcon from '../components/GiftIcon'
import BalloonIcon from '../components/BalloonIcon'
import CakeIcon from '../components/CakeIcon'
import CelebrationIcon from '../components/CelebrationIcon'
import HeartRibbonIcon from '../components/HeartRibbonIcon'
import AuthModal from '../components/AuthModal'
import DownloadButton from '../components/DownloadButton'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { it, enUS } from 'date-fns/locale'

export default function HomePage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { t, i18n } = useTranslation()
  const [myEvents, setMyEvents] = useState([])
  const [myInvites, setMyInvites] = useState([])
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('login')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  const dateLocale = i18n.language === 'en' ? enUS : it

  const FEATURES = [
    {
      customIcon: <CelebrationIcon size={28} />,
      title: t('features.rsvp.title'),
      description: t('features.rsvp.description'),
    },
    {
      customIcon: <GiftIcon size={28} />,
      title: t('features.nodup.title'),
      description: t('features.nodup.description'),
    },
    {
      customIcon: <HeartRibbonIcon size={28} />,
      title: t('features.collective.title'),
      description: t('features.collective.description'),
    },
    {
      customIcon: <Lock size={24} className="text-salvia" />,
      title: t('features.private.title'),
      description: t('features.private.description'),
    },
    {
      customIcon: <Bell size={24} className="text-salvia" />,
      title: t('features.reminders.title'),
      description: t('features.reminders.description'),
    },
    {
      customIcon: <Sparkles size={24} className="text-cipria-dark" />,
      title: t('features.thanks.title'),
      description: t('features.thanks.description'),
    },
  ]

  const STEPS = [
    { number: '01', title: t('steps.1.title'), description: t('steps.1.description') },
    { number: '02', title: t('steps.2.title'), description: t('steps.2.description') },
    { number: '03', title: t('steps.3.title'), description: t('steps.3.description') },
    { number: '04', title: t('steps.4.title'), description: t('steps.4.description') },
  ]

  const openAuth = (mode = 'login') => {
    setAuthModalMode(mode)
    setShowAuthModal(true)
  }

  useEffect(() => {
    if (authLoading) return
    if (user) {
      getMyEvents()
        .then((res) => setMyEvents(res.data || []))
        .catch(() => {})
    } else {
      setMyEvents([])
    }
  }, [user, authLoading])

  useEffect(() => {
    setMyInvites(JSON.parse(localStorage.getItem('piky_invites') || '[]'))
  }, [])

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    try {
      await deleteAccount()
      await signOut()
    } catch {
      setDeletingAccount(false)
      setShowDeleteAccount(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    if (user) {
      const res = await getMyEvents().catch(() => null)
      if (res) setMyEvents(res.data || [])
    }
    setTimeout(() => setRefreshing(false), 600)
  }

  const removeInvite = (guestToken) => {
    const updated = myInvites.filter((ev) => ev.guestToken !== guestToken)
    setMyInvites(updated)
    localStorage.setItem('piky_invites', JSON.stringify(updated))
  }

  const HIDE_AFTER_DAYS = 60
  const isExpired = (partyDate) => {
    if (!partyDate) return false
    return Date.now() - new Date(partyDate).getTime() > HIDE_AFTER_DAYS * 24 * 60 * 60 * 1000
  }

  const visibleInvites = myInvites.filter((inv) => !isExpired(inv.partyDate))

  return (
    <Layout>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-avorio via-avorio to-cipria/20 pt-10 pb-14 px-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cipria/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-salvia/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/70 border border-cipria/40 rounded-full px-4 py-1.5 text-sm text-gray-600 mb-6 backdrop-blur-sm">
            <CakeIcon size={20} />
            <span dangerouslySetInnerHTML={{ __html: t('home.hero.badge') }} />
          </div>

          <h1 className="font-display text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
            {t('home.hero.h1a')}{' '}
            <span className="text-salvia italic">{t('home.hero.h1b')}</span>
          </h1>

          <p className="text-base text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
            {t('home.hero.body1')}<br />
            <span dangerouslySetInnerHTML={{ __html: t('home.hero.body2') }} />
          </p>

          <div className="flex flex-row gap-3 justify-center">
            <Link to="/crea" className="btn-primary text-base px-5 py-3 rounded-2xl inline-flex items-center justify-center gap-1.5 flex-1 max-w-[200px]">
              <span>{t('home.hero.cta.primary')}</span>
              <span>→</span>
            </Link>
            <a
              href="#come-funziona"
              className="btn-outline text-base px-5 py-3 rounded-2xl inline-flex items-center justify-center gap-1.5 flex-1 max-w-[200px]"
            >
              <span>{t('home.hero.cta.secondary')}</span>
            </a>
          </div>

          {/* Box account */}
          <div className="max-w-md mx-auto mt-6">
            {user ? (
              <div className="bg-white/80 border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                    <LogIn className="w-4 h-4 text-salvia flex-shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
                  >
                    <LogOut className="w-3.5 h-3.5" /> {t('home.account.logout')}
                  </button>
                </div>
                {showDeleteAccount ? (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <p className="text-xs text-red-500">{t('home.account.delete.confirm')}</p>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setShowDeleteAccount(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2.5 py-1 rounded-lg bg-gray-100 transition-colors">{t('home.account.delete.cancel')}</button>
                      <button onClick={handleDeleteAccount} disabled={deletingAccount} className="text-xs text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60">
                        {deletingAccount ? t('home.account.delete.loading') : t('home.account.delete.confirm_btn')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowDeleteAccount(true)} className="mt-1.5 text-xs text-gray-300 hover:text-red-400 transition-colors">
                    {t('home.account.delete.trigger')}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 bg-white border border-avorio-dark rounded-2xl px-4 py-4 shadow-sm">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{t('home.auth.box.title')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('home.auth.box.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAuth('login')}
                    className="flex-1 text-sm font-medium text-gray-600 border border-gray-200 px-3 py-2 rounded-xl hover:border-salvia hover:text-salvia transition-colors"
                  >
                    {t('home.auth.box.login')}
                  </button>
                  <button
                    onClick={() => openAuth('register')}
                    className="flex-1 text-sm font-medium text-salvia bg-salvia/10 px-3 py-2 rounded-xl hover:bg-salvia/20 transition-colors"
                  >
                    {t('home.auth.box.register')}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ─── Le tue liste + Inviti ────────────────────────────────── */}
        <div className="max-w-lg mx-auto mt-10 px-4">
          <div className="bg-white/80 border border-avorio-dark rounded-3xl shadow-sm overflow-hidden">

            {/* Le tue liste */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display text-sm font-bold text-gray-600 uppercase tracking-wide">{t('home.myevents.title')}</h2>
                <button onClick={handleRefresh} className="p-1 text-gray-300 hover:text-salvia transition-colors" title={t('home.myevents.refresh.title')}>
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-gray-300 mb-3">{t('home.myevents.hint')}</p>
              {!user ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">{t('home.myevents.loggedout')}</p>
                  <button onClick={() => openAuth('login')} className="text-sm text-salvia font-medium hover:underline">{t('home.myevents.loggedout_link')}</button>
                </div>
              ) : myEvents.length > 0 ? (
                <div className="space-y-2">
                  {myEvents.map((ev) => (
                    <Link
                      key={ev.parent_token}
                      to={`/dashboard/${ev.parent_token}`}
                      className="flex items-center justify-between bg-avorio rounded-2xl px-4 py-3 border border-avorio-dark hover:border-salvia hover:shadow-sm transition-all"
                    >
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{ev.child_name}</p>
                        <p className="text-xs text-gray-400">
                          {ev.party_date ? format(new Date(ev.party_date), 'd MMMM yyyy', { locale: dateLocale }) : ''}
                        </p>
                      </div>
                      <span className="text-salvia font-medium text-sm">{t('home.myevents.open')}</span>
                    </Link>
                  ))}
                  <Link to="/crea" className="inline-flex items-center gap-1 text-xs text-salvia font-medium hover:underline mt-1">
                    {t('home.myevents.create_more')}
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">{t('home.myevents.empty')}</p>
                  <Link to="/crea" className="text-sm text-salvia font-medium hover:underline">{t('home.myevents.empty_link')}</Link>
                </div>
              )}
            </div>

            <div className="border-t border-avorio-dark mx-5" />

            {/* Inviti ricevuti */}
            <div className="px-5 pt-4 pb-5">
              <h2 className="font-display text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">{t('home.invites.title')}</h2>
              {visibleInvites.length > 0 ? (
                <div className="space-y-2">
                  {visibleInvites.map((ev) => (
                    <div key={ev.guestToken} className="flex items-center gap-2">
                      <Link
                        to={`/lista/${ev.guestToken}`}
                        className="flex-1 flex items-center justify-between bg-avorio rounded-2xl px-4 py-3 border border-avorio-dark hover:border-cipria hover:shadow-sm transition-all"
                      >
                        <div>
                          <p className="font-semibold text-gray-800 text-sm flex items-center gap-1">
                            <BalloonIcon size={14} /> {t('home.invites.item_label', { name: ev.childName })}
                          </p>
                          <p className="text-xs text-gray-400">
                            {ev.partyDate ? format(new Date(ev.partyDate), 'd MMMM yyyy', { locale: dateLocale }) : ''}
                          </p>
                        </div>
                        <span className="text-cipria-dark font-medium text-sm">{t('home.invites.open')}</span>
                      </Link>
                      {pendingDelete === ev.guestToken ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => setPendingDelete(null)} className="text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors">{t('home.invites.remove.no')}</button>
                          <button onClick={() => { removeInvite(ev.guestToken); setPendingDelete(null) }} className="text-xs font-semibold text-white bg-red-400 hover:bg-red-500 px-3 py-1.5 rounded-xl transition-colors">{t('home.invites.remove.yes')}</button>
                        </div>
                      ) : (
                        <button onClick={() => setPendingDelete(ev.guestToken)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors" title={t('home.invites.remove.title')}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">{t('home.invites.empty')}</p>
              )}
            </div>

          </div>
        </div>

      </section>

      {/* ─── Scopri come funziona ─────────────────────────────────────────── */}
      <section className="bg-white pt-16 pb-2 px-4">
        <div className="max-w-lg mx-auto">

          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-2">
              {t('home.discover.title')}
            </h2>
            <p className="text-lg text-gray-500">{t('home.discover.subtitle')}</p>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-salvia text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                {t('home.mockup.label')}
              </div>

              <div className="bg-gray-800 rounded-[2.8rem] p-[5px] shadow-2xl shadow-gray-300 border border-gray-700" style={{ width: 270 }}>
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-16 h-4 bg-gray-900 rounded-full" />
                </div>

                <div className="bg-avorio rounded-[2.2rem] overflow-hidden" style={{ height: 530 }}>

                  <div className="bg-white border-b border-avorio-dark px-4 py-2.5 flex items-center justify-between">
                    <span className="font-display font-bold text-salvia text-sm tracking-tight">piky</span>
                    <HeartRibbonIcon size={16} />
                  </div>

                  <div className="px-3 pt-3 pb-6 space-y-2.5 overflow-hidden">

                    <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-avorio-dark">
                      <div className="w-10 h-10 bg-cipria rounded-xl flex items-center justify-center mx-auto mb-1.5">
                        <HeartRibbonIcon size={22} />
                      </div>
                      <p className="font-display font-bold text-gray-900 text-xs leading-snug">
                        {t('home.mockup.event_title')}
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                          <Calendar className="w-2.5 h-2.5 text-cipria-dark" /> {t('home.mockup.date')}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                          <MapPin className="w-2.5 h-2.5 text-cipria-dark" /> {t('home.mockup.location')}
                        </span>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2 py-0.5 text-[10px] font-semibold">
                        <Users className="w-2.5 h-2.5" /> {t('home.mockup.confirmed')}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-avorio to-white rounded-2xl p-3 border border-avorio-dark">
                      <p className="text-[10px] text-gray-600 leading-relaxed italic">
                        "{t('home.mockup.invite_msg')}"
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-avorio-dark">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">{t('home.mockup.rsvp.label')}</p>
                      <div className="flex gap-1.5">
                        <div className="flex-1 py-1.5 text-[10px] font-bold bg-salvia text-white rounded-xl text-center">
                          {t('home.mockup.rsvp.yes')}
                        </div>
                        <div className="flex-1 py-1.5 text-[10px] font-medium border border-avorio-dark text-gray-400 rounded-xl text-center">
                          {t('home.mockup.rsvp.maybe')}
                        </div>
                        <div className="flex-1 py-1.5 text-[10px] font-medium border border-avorio-dark text-gray-400 rounded-xl text-center">
                          {t('home.mockup.rsvp.no')}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-avorio-dark">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <GiftIcon size={12} /> {t('home.mockup.wishlist.label')}
                      </p>
                      <div className="space-y-1.5">
                        {[
                          { name: 'LEGO Technic 42175', price: '€89', reserved: true, by: 'Marco' },
                          { name: 'Bici Strider', price: '€119', reserved: false },
                          { name: 'Kit pittura acquerello', price: '€34', reserved: true, by: 'Giulia' },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl ${
                              item.reserved ? 'bg-gray-50 opacity-60' : 'bg-cipria/10 border border-cipria/30'
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.reserved ? 'bg-gray-300' : 'bg-salvia'}`} />
                            <span className={`flex-1 text-[10px] font-medium truncate ${item.reserved ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {item.name}
                            </span>
                            <span className={`text-[10px] font-bold flex-shrink-0 ${item.reserved ? 'text-gray-400' : 'text-salvia'}`}>
                              {item.price}
                            </span>
                            {item.reserved ? (
                              <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-0.5">
                                <Lock size={8} /> {item.by}
                              </span>
                            ) : (
                              <div className="text-[9px] bg-salvia text-white px-2 py-0.5 rounded-lg font-semibold flex-shrink-0">
                                {t('home.mockup.reserve')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>


      {/* ─── Features ─────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-gray-900">
              {t('home.features.title')}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-3xl border border-avorio-dark hover:border-cipria/50 hover:shadow-md hover:shadow-cipria/10 transition-all duration-300 bg-avorio/50"
              >
                <div className="mb-4 flex items-center" style={{ minHeight: '2.25rem' }}>
                  {feature.customIcon}
                </div>
                <h3 className="font-display font-bold text-gray-900 text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Come funziona ────────────────────────────────────────────────── */}
      <section id="come-funziona" className="py-24 px-4 bg-avorio">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">{t('home.how.title')}</h2>
            <p className="text-lg text-gray-500">{t('home.how.subtitle')}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="bg-white rounded-3xl p-6 border border-avorio-dark flex gap-5"
              >
                <div className="flex-shrink-0">
                  <span className="font-display text-3xl font-bold text-cipria-dark">
                    {step.number}
                  </span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-gray-900 text-xl mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA finale ───────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-salvia text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl font-bold mb-4">
            {t('home.final_cta.title')}
          </h2>
          <p className="text-white/80 text-base mb-8 leading-relaxed">
            {t('home.final_cta.body')}
          </p>
          <div className="flex flex-col items-center gap-5">
            <Link
              to="/crea"
              className="inline-flex items-center gap-2 bg-white text-salvia font-semibold text-base px-7 py-3.5 rounded-2xl hover:bg-avorio transition-colors duration-200 justify-center"
            >
              {t('home.final_cta.btn')}
              <GiftIcon size={18} />
            </Link>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <DownloadButton className="inline-flex items-center gap-2 border border-white/40 text-white/80 hover:text-white hover:border-white text-sm font-medium px-4 py-2 rounded-xl transition-colors duration-200" />
              <button
                onClick={async () => {
                  const shareData = {
                    title: 'Piky — Lista desideri per compleanni',
                    text: t('home.hero.body1'),
                    url: `${window.location.origin}/scarica`,
                  }
                  if (navigator.share) {
                    await navigator.share(shareData)
                  } else {
                    await navigator.clipboard.writeText(window.location.origin)
                    alert(t('home.final_cta.share_copied_alert'))
                  }
                }}
                className="inline-flex items-center gap-2 border border-white/40 text-white/80 hover:text-white hover:border-white text-sm font-medium px-4 py-2 rounded-xl transition-colors duration-200"
              >
                <Share2 className="w-3.5 h-3.5" /> {t('home.final_cta.share')}
              </button>
            </div>
          </div>
        </div>
      </section>
      <AuthModal
        isOpen={showAuthModal}
        initialMode={authModalMode}
        onClose={() => setShowAuthModal(false)}
      />
    </Layout>
  )
}

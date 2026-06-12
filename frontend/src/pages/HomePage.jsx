import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { Gift, Users, Heart, Shield, Bell, Star, Lock, Sparkles, Share2, Key, RefreshCw, Calendar, MapPin, Copy, Check } from 'lucide-react'
import { syncFromServer } from '../lib/sync'
import { removeUserKeyLink } from '../lib/api'
import GiftIcon from '../components/GiftIcon'
import BalloonIcon from '../components/BalloonIcon'
import CakeIcon from '../components/CakeIcon'
import CelebrationIcon from '../components/CelebrationIcon'
import HeartRibbonIcon from '../components/HeartRibbonIcon'
import KeyModal from '../components/KeyModal'
import { useUserKey } from '../hooks/useUserKey'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const FEATURES = [
  {
    icon: Gift,
    emoji: null,
    customIcon: <GiftIcon size={28} />,
    title: 'Lista senza doppioni',
    description:
      'Chi prenota un regalo lo rende invisibile agli altri invitati. Zero sovrapposizioni, zero imbarazzo.',
  },
  {
    icon: Users,
    emoji: null,
    customIcon: <CelebrationIcon size={28} />,
    title: 'Conferma presenza',
    description:
      'Gli invitati confermano la loro presenza (ci sarò / forse / non vengo) direttamente nella lista.',
  },
  {
    icon: Heart,
    emoji: null,
    customIcon: <HeartRibbonIcon size={28} />,
    title: 'Regalo collettivo',
    description:
      'Gli invitati prenotano la loro quota e portano i contanti il giorno della festa, oppure pagano direttamente tramite PayPal. Barra di progresso in tempo reale.',
  },
  {
    icon: Shield,
    emoji: null,
    customIcon: <Lock size={24} className="text-salvia" />,
    title: 'Link privato',
    description:
      'Link privato da condividere con gli invitati — solo chi ha il link può vedere la lista.',
  },
  {
    icon: Bell,
    emoji: null,
    customIcon: <Bell size={24} className="text-salvia" />,
    title: 'Promemoria automatici',
    description:
      'Email automatica agli invitati 2 giorni prima. Riepilogo finale al genitore alla chiusura dell\'evento.',
  },
  {
    icon: Star,
    emoji: null,
    customIcon: <Sparkles size={24} className="text-cipria-dark" />,
    title: 'Messaggi di ringraziamento',
    description:
      'Invia messaggi personalizzati post-festa a tutti i partecipanti in un click.',
  },
]

const STEPS = [
  {
    number: '01',
    title: 'Organizza la festa',
    description:
      'Inserisci i dettagli della festa: nome del festeggiato, date, luogo e i regali desiderati con link Amazon o negozio.',
  },
  {
    number: '02',
    title: 'Condividi il link',
    description:
      'Ricevi un link privato da condividere con gli invitati — solo chi lo riceve può vedere la lista e confermare la presenza.',
  },
  {
    number: '03',
    title: 'Gli invitati prenotano',
    description:
      'Ogni invitato conferma la presenza e, se vuole, prenota un regalo in esclusiva. Zero doppioni, zero imbarazzo.',
  },
  {
    number: '04',
    title: 'Segui tutto dalla tua area',
    description:
      'Vedi chi ha aperto il link, chi ha prenotato cosa, le presenze confermate e i contributi al collettivo.',
  },
]

export default function HomePage() {
  const [myEvents, setMyEvents] = useState([])
  const [myInvites, setMyInvites] = useState([])
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)
  const [keyModalMode, setKeyModalMode] = useState('create')
  const [pendingDelete, setPendingDelete] = useState(null) // token dell'elemento da rimuovere
  const { userKey, saveKey } = useUserKey()

  const openKeyModal = (mode = 'create') => {
    setKeyModalMode(mode)
    setShowKeyModal(true)
  }

  const [refreshing, setRefreshing] = useState(false)

  const refreshLists = () => {
    setMyEvents(JSON.parse(localStorage.getItem('piky_events') || '[]'))
    setMyInvites(JSON.parse(localStorage.getItem('piky_invites') || '[]'))
  }

  // Auto-sync from server on every load when key is present
  useEffect(() => {
    refreshLists()
    if (!userKey) return
    syncFromServer(userKey)
      .then(() => refreshLists())
      .catch(() => {})
  }, [userKey])

  const handleRefresh = async () => {
    setRefreshing(true)
    if (userKey) {
      await syncFromServer(userKey).catch(() => {})
    }
    refreshLists()
    setTimeout(() => setRefreshing(false), 600)
  }

  const handleKeySet = (key) => {
    saveKey(key)
    refreshLists()
  }

  const addToHidden = (token) => {
    const hidden = JSON.parse(localStorage.getItem('piky_hidden') || '[]')
    if (!hidden.includes(token)) {
      localStorage.setItem('piky_hidden', JSON.stringify([...hidden, token]))
    }
  }

  const removeEvent = (parentToken) => {
    const updated = myEvents.filter((ev) => ev.parentToken !== parentToken)
    setMyEvents(updated)
    localStorage.setItem('piky_events', JSON.stringify(updated))
    addToHidden(parentToken)
    if (userKey) removeUserKeyLink(userKey, parentToken).catch(() => {})
  }

  const removeInvite = (guestToken) => {
    const updated = myInvites.filter((ev) => ev.guestToken !== guestToken)
    setMyInvites(updated)
    localStorage.setItem('piky_invites', JSON.stringify(updated))
    addToHidden(guestToken)
    if (userKey) removeUserKeyLink(userKey, guestToken).catch(() => {})
  }

  const hasContent = myEvents.length > 0 || myInvites.length > 0

  const HIDE_AFTER_DAYS = 60
  const isExpired = (partyDate) => {
    if (!partyDate) return false
    return Date.now() - new Date(partyDate).getTime() > HIDE_AFTER_DAYS * 24 * 60 * 60 * 1000
  }

  const visibleEvents = myEvents.filter((ev) => !isExpired(ev.partyDate))
  const visibleInvites = myInvites.filter((inv) => !isExpired(inv.partyDate))
  const hiddenCount = (myEvents.length - visibleEvents.length) + (myInvites.length - visibleInvites.length)

  return (
    <Layout>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-avorio via-avorio to-cipria/20 pt-10 pb-14 px-4">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cipria/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-salvia/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/70 border border-cipria/40 rounded-full px-4 py-1.5 text-sm text-gray-600 mb-6 backdrop-blur-sm">
            <CakeIcon size={20} />
            <span>La wishlist intelligente per i compleanni</span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Organizzare un compleanno{' '}
            <span className="text-salvia italic">non è mai stato così semplice</span>
          </h1>

          <p className="text-base text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
            Organizza il compleanno del tuo bambino — o il tuo — in pochi minuti. Condividi il link con gli invitati: la lista dei regali e le conferme di presenza le gestisce Piky.
          </p>

          <div className="flex flex-row gap-3 justify-center">
            <Link to="/crea" className="btn-primary text-base px-5 py-3 rounded-2xl inline-flex items-center justify-center gap-1.5 flex-1 max-w-[200px]">
              <span>Organizza la festa</span>
              <span>→</span>
            </Link>
            <a
              href="#come-funziona"
              className="btn-outline text-base px-5 py-3 rounded-2xl inline-flex items-center justify-center gap-1.5 flex-1 max-w-[200px]"
            >
              <span>Come funziona</span>
            </a>
          </div>

          {/* Box codice — visibile subito sotto i bottoni principali */}
          <div className="max-w-md mx-auto mt-6 text-left">
            {userKey ? (
              <div className="flex items-center justify-between bg-white/80 border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Key className="w-4 h-4 text-salvia flex-shrink-0" />
                  <span>
                    Codice:{' '}
                    <span className="font-mono font-semibold text-gray-800 tracking-wider">
                      {userKey.toUpperCase()}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userKey.toUpperCase()).catch(() => {})
                      setKeyCopied(true)
                      setTimeout(() => setKeyCopied(false), 2000)
                    }}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-salvia hover:text-salvia transition-colors"
                  >
                    {keyCopied ? '✓ Copiato' : 'Copia'}
                  </button>
                  <button
                    onClick={() => openKeyModal('create')}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-salvia hover:text-salvia transition-colors"
                  >
                    Cambia
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-white border border-avorio-dark rounded-2xl px-4 py-3 shadow-sm">
                <Key className="w-5 h-5 text-salvia flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">Salva le tue liste</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Crea un codice per ritrovarle su qualsiasi dispositivo
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openKeyModal('recover')}
                    className="text-xs font-medium text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-xl hover:border-salvia hover:text-salvia transition-colors"
                  >
                    Ho un codice
                  </button>
                  <button
                    onClick={() => openKeyModal('create')}
                    className="text-sm font-medium text-salvia bg-salvia/10 px-3 py-1.5 rounded-xl hover:bg-salvia/20 transition-colors"
                  >
                    Crea →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Azioni secondarie — Scarica e Condividi */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <button
              onClick={() => window.dispatchEvent(new Event('piky:trigger-install'))}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:border-salvia hover:text-salvia transition-colors shadow-sm"
            >
              Scarica l'app
            </button>
            <button
              onClick={async () => {
                const shareData = {
                  title: 'Piky — Lista desideri per compleanni',
                  text: 'Crea la wishlist per il compleanno, condividila con gli invitati e zero doppioni!',
                  url: window.location.origin,
                }
                if (navigator.share) {
                  await navigator.share(shareData)
                } else {
                  await navigator.clipboard.writeText(window.location.origin)
                  alert('Link copiato!')
                }
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:border-salvia hover:text-salvia transition-colors shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" /> Condividi
            </button>
          </div>

          <p className="text-sm text-gray-400 mt-5">
            Nessun account necessario · Pronto in pochi minuti · Tutto in un link
          </p>
        </div>

        {/* ─── Le tue liste + Inviti ────────────────────────────────── */}
        <div className="max-w-lg mx-auto mt-10 px-4">
          <div className="bg-white/80 border border-avorio-dark rounded-3xl shadow-sm overflow-hidden">

            {/* Le tue liste */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display text-sm font-bold text-gray-600 uppercase tracking-wide">Le tue liste</h2>
                <button onClick={handleRefresh} className="p-1 text-gray-300 hover:text-salvia transition-colors" title="Aggiorna">
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-gray-300 mb-3">
                {hiddenCount > 0
                  ? `${hiddenCount} ${hiddenCount === 1 ? 'lista nascosta' : 'liste nascoste'} automaticamente · `
                  : ''}
                Spariscono 60 giorni dopo la festa
              </p>
              {visibleEvents.length > 0 ? (
                <div className="space-y-2">
                  {visibleEvents.map((ev) => (
                    <div key={ev.parentToken} className="flex items-center gap-2">
                      <Link
                        to={`/dashboard/${ev.parentToken}`}
                        className="flex-1 flex items-center justify-between bg-avorio rounded-2xl px-4 py-3 border border-avorio-dark hover:border-salvia hover:shadow-sm transition-all"
                      >
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{ev.childName}</p>
                          <p className="text-xs text-gray-400">
                            {ev.partyDate ? format(new Date(ev.partyDate), 'd MMMM yyyy', { locale: it }) : ''}
                          </p>
                        </div>
                        <span className="text-salvia font-medium text-sm">Apri →</span>
                      </Link>
                      {pendingDelete === ev.parentToken ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => setPendingDelete(null)} className="text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors">No</button>
                          <button onClick={() => { removeEvent(ev.parentToken); setPendingDelete(null) }} className="text-xs font-semibold text-white bg-red-400 hover:bg-red-500 px-3 py-1.5 rounded-xl transition-colors">Sì</button>
                        </div>
                      ) : (
                        <button onClick={() => setPendingDelete(ev.parentToken)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors" title="Rimuovi">✕</button>
                      )}
                    </div>
                  ))}
                  <Link to="/crea" className="inline-flex items-center gap-1 text-xs text-salvia font-medium hover:underline mt-1">
                    + Crea una nuova lista
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">Nessuna lista ancora</p>
                  <Link to="/crea" className="text-sm text-salvia font-medium hover:underline">Crea la prima →</Link>
                </div>
              )}
            </div>

            {/* Divisore */}
            <div className="border-t border-avorio-dark mx-5" />

            {/* Inviti ricevuti */}
            <div className="px-5 pt-4 pb-5">
              <h2 className="font-display text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Inviti ricevuti</h2>
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
                            <BalloonIcon size={14} /> Compleanno di {ev.childName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {ev.partyDate ? format(new Date(ev.partyDate), 'd MMMM yyyy', { locale: it }) : ''}
                          </p>
                        </div>
                        <span className="text-cipria-dark font-medium text-sm">Apri →</span>
                      </Link>
                      {pendingDelete === ev.guestToken ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => setPendingDelete(null)} className="text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors">No</button>
                          <button onClick={() => { removeInvite(ev.guestToken); setPendingDelete(null) }} className="text-xs font-semibold text-white bg-red-400 hover:bg-red-500 px-3 py-1.5 rounded-xl transition-colors">Sì</button>
                        </div>
                      ) : (
                        <button onClick={() => setPendingDelete(ev.guestToken)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors" title="Rimuovi">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Nessun invito — comparirà qui quando aprirai un link invito</p>
              )}
            </div>


          </div>
        </div>

      </section>

      {/* ─── Scopri come funziona ─────────────────────────────────────────── */}
      <section className="bg-white pt-16 pb-2 px-4">
        <div className="max-w-lg mx-auto">

          {/* Titolo sezione */}
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-2">
              Scopri di più
            </h2>
            <p className="text-lg text-gray-500">Semplice per chi organizza, comodo per gli invitati</p>
          </div>

          {/* Phone mockup — fedele alla pagina ospite reale */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Etichetta esempio */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-salvia text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                Così lo vede l'invitato
              </div>

              {/* Cornice telefono */}
              <div className="bg-gray-800 rounded-[2.8rem] p-[5px] shadow-2xl shadow-gray-300 border border-gray-700" style={{ width: 270 }}>
                {/* Dynamic island */}
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-16 h-4 bg-gray-900 rounded-full" />
                </div>

                {/* Schermo */}
                <div className="bg-avorio rounded-[2.2rem] overflow-hidden" style={{ height: 530 }}>

                  {/* Mini navbar */}
                  <div className="bg-white border-b border-avorio-dark px-4 py-2.5 flex items-center justify-between">
                    <span className="font-display font-bold text-salvia text-sm tracking-tight">piky</span>
                    <HeartRibbonIcon size={16} />
                  </div>

                  {/* Contenuto scrollabile (visualmente troncato) */}
                  <div className="px-3 pt-3 pb-6 space-y-2.5 overflow-hidden">

                    {/* Header evento */}
                    <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-avorio-dark">
                      <div className="w-10 h-10 bg-cipria rounded-xl flex items-center justify-center mx-auto mb-1.5">
                        <HeartRibbonIcon size={22} />
                      </div>
                      <p className="font-display font-bold text-gray-900 text-xs leading-snug">
                        Compleanno di Bianca!
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                          <Calendar className="w-2.5 h-2.5 text-cipria-dark" /> 5 ottobre · 16:00
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                          <MapPin className="w-2.5 h-2.5 text-cipria-dark" /> Giardino di casa
                        </span>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-2 py-0.5 text-[10px] font-semibold">
                        <Users className="w-2.5 h-2.5" /> 8 persone confermate
                      </div>
                    </div>

                    {/* Messaggio invito */}
                    <div className="bg-gradient-to-br from-avorio to-white rounded-2xl p-3 border border-avorio-dark">
                      <p className="text-[10px] text-gray-600 leading-relaxed italic">
                        "Ci farebbe molto piacere festeggiare insieme a te — facci sapere se riesci a esserci!"
                      </p>
                    </div>

                    {/* RSVP */}
                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-avorio-dark">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Conferma la tua presenza</p>
                      <div className="flex gap-1.5">
                        <div className="flex-1 py-1.5 text-[10px] font-bold bg-salvia text-white rounded-xl text-center">
                          ✓ Ci sarò
                        </div>
                        <div className="flex-1 py-1.5 text-[10px] font-medium border border-avorio-dark text-gray-400 rounded-xl text-center">
                          Forse
                        </div>
                        <div className="flex-1 py-1.5 text-[10px] font-medium border border-avorio-dark text-gray-400 rounded-xl text-center">
                          Non vengo
                        </div>
                      </div>
                    </div>

                    {/* Lista regali */}
                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-avorio-dark">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <GiftIcon size={12} /> Lista desideri
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
                                Prenota
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
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
              Tutto quello che ti serve
            </h2>
            <p className="text-lg text-gray-500">
              Pensato per chi organizza, comodo per gli invitati.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-3xl border border-avorio-dark hover:border-cipria/50 hover:shadow-md hover:shadow-cipria/10 transition-all duration-300 bg-avorio/50"
              >
                <div className="mb-4 flex items-center" style={{ minHeight: '2.25rem' }}>
                  {feature.customIcon ?? <span className="text-3xl">{feature.emoji}</span>}
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
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">Come funziona</h2>
            <p className="text-lg text-gray-500">Quattro passi e la lista è pronta</p>

          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {STEPS.map((step, i) => (
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
            Pronto a organizzare la festa?
          </h2>
          <p className="text-white/80 text-base mb-8 leading-relaxed">
            Ci vogliono meno di 5 minuti. Nome, data e luogo, aggiungi i regali, copia il link e condividilo con gli invitati.
          </p>
          <div className="flex flex-col items-center gap-5">
            <Link
              to="/crea"
              className="inline-flex items-center gap-2 bg-white text-salvia font-semibold text-base px-7 py-3.5 rounded-2xl hover:bg-avorio transition-colors duration-200 justify-center"
            >
              Organizza la festa
              <GiftIcon size={18} />
            </Link>
            <div className="flex items-center gap-1 text-white/60 text-sm">
              <button
                onClick={() => window.dispatchEvent(new Event('piky:trigger-install'))}
                className="px-3 py-1.5 hover:text-white transition-colors"
              >
                Scarica l'app
              </button>
              <span>·</span>
              <button
                onClick={async () => {
                  const shareData = {
                    title: 'Piky — Lista desideri per compleanni',
                    text: 'Crea la wishlist per il compleanno, condividila con gli invitati e zero doppioni!',
                    url: window.location.origin,
                  }
                  if (navigator.share) {
                    await navigator.share(shareData)
                  } else {
                    await navigator.clipboard.writeText(window.location.origin)
                    alert('Link copiato!')
                  }
                }}
                className="px-3 py-1.5 hover:text-white transition-colors inline-flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" /> Condividi
              </button>
            </div>
          </div>
        </div>
      </section>
      <KeyModal
        isOpen={showKeyModal}
        initialMode={keyModalMode}
        onClose={() => setShowKeyModal(false)}
        onKeySet={handleKeySet}
      />
    </Layout>
  )
}

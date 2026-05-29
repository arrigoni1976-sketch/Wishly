import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { Gift, Users, Heart, Shield, Bell, Star, Lock, Sparkles, Share2, Key, RefreshCw } from 'lucide-react'
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
    title: 'Conferma presenza integrata',
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
    title: 'Link privati',
    description:
      'Due link privati: uno per gestire la lista (solo per te), uno da condividere con gli invitati.',
  },
  {
    icon: Bell,
    emoji: null,
    customIcon: <Bell size={24} className="text-salvia" />,
    title: 'Promemoria automatici',
    description:
      'Email automatica agli invitati 2 giorni prima. Riepilogo finale al genitore alla chiusura.',
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
    title: 'Crea la lista',
    description:
      'Inserisci i dettagli della festa: nome del bambino, date, luogo e i regali desiderati con link Amazon o negozio.',
  },
  {
    number: '02',
    title: 'Condividi i link',
    description:
      'Ricevi due link privati: uno per gli invitati, uno per chi vuole contribuire al regalo collettivo in contanti o tramite PayPal.',
  },
  {
    number: '03',
    title: 'Gli invitati prenotano',
    description:
      'Ogni invitato prenota un regalo in esclusiva. Chi arriva tardi troverà solo ciò che rimane.',
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

  const handleRefresh = () => {
    setRefreshing(true)
    refreshLists()
    setTimeout(() => setRefreshing(false), 600)
  }

  useEffect(() => { refreshLists() }, [])

  const handleKeySet = (key) => {
    saveKey(key)
    refreshLists() // reload from localStorage after recovery merge
  }

  const removeEvent = (parentToken) => {
    const updated = myEvents.filter((ev) => ev.parentToken !== parentToken)
    setMyEvents(updated)
    localStorage.setItem('piky_events', JSON.stringify(updated))
  }

  const removeInvite = (guestToken) => {
    const updated = myInvites.filter((ev) => ev.guestToken !== guestToken)
    setMyInvites(updated)
    localStorage.setItem('piky_invites', JSON.stringify(updated))
  }

  const hasContent = myEvents.length > 0 || myInvites.length > 0

  return (
    <Layout>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-avorio via-avorio to-cipria/20 pt-20 pb-28 px-4">
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
            Organizza il compleanno del tuo bambino in pochi minuti. Invita le persone condividendo un link — la lista dei regali e le conferme di presenza le gestisce l'app.
          </p>

          <div className="flex flex-row gap-3 justify-center">
            <Link to="/crea" className="btn-primary text-base px-5 py-3 rounded-2xl inline-flex items-center justify-center gap-1.5 flex-1 max-w-[200px]">
              <span>Crea la lista gratis</span>
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
                <button
                  onClick={() => openKeyModal('create')}
                  className="text-xs text-salvia hover:underline font-medium"
                >
                  Cambia
                </button>
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
            Nessun account necessario · Completamente gratuito · Zero commissioni
          </p>
        </div>

        {/* ─── Le tue liste + Inviti ────────────────────────────────── */}
        <div className="max-w-lg mx-auto mt-10 px-4">
          <div className="bg-white/80 border border-avorio-dark rounded-3xl shadow-sm overflow-hidden">

            {/* Le tue liste */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-sm font-bold text-gray-600 uppercase tracking-wide">Le tue liste</h2>
                <button onClick={handleRefresh} className="p-1 text-gray-300 hover:text-salvia transition-colors" title="Aggiorna">
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {myEvents.length > 0 ? (
                <div className="space-y-2">
                  {myEvents.map((ev) => (
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
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs text-gray-500">Rimuovi?</span>
                          <button onClick={() => { removeEvent(ev.parentToken); setPendingDelete(null) }} className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">Sì</button>
                          <button onClick={() => setPendingDelete(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">No</button>
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
              {myInvites.length > 0 ? (
                <div className="space-y-2">
                  {myInvites.map((ev) => (
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
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs text-gray-500">Rimuovi?</span>
                          <button onClick={() => { removeInvite(ev.guestToken); setPendingDelete(null) }} className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">Sì</button>
                          <button onClick={() => setPendingDelete(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">No</button>
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

        {/* Separatore visivo */}
        <div className="max-w-lg mx-auto mt-12 px-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-0.5 bg-gray-200 rounded-full" />
            <span className="text-xs text-gray-400 tracking-widest">· · ·</span>
            <div className="flex-1 h-0.5 bg-gray-200 rounded-full" />
          </div>
        </div>

        {/* Mock preview card */}
        <div className="relative max-w-lg mx-auto mt-10 px-4">
          {/* Example badge */}
          <div className="absolute -top-3 left-8 z-10 bg-salvia text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
            Esempio
          </div>
          <div className="bg-white rounded-3xl shadow-2xl shadow-cipria/20 p-6 border border-avorio-dark">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-cipria rounded-2xl flex items-center justify-center">
                <BalloonIcon size={28} />
              </div>
              <div>
                <h3 className="font-display font-bold text-gray-900">Compleanno di Bianca</h3>
                <p className="text-sm text-gray-500">5 ottobre · 16:00 · Giardino di casa</p>
              </div>
              <div className="ml-auto bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                8 confermati
              </div>
            </div>

            <div className="space-y-3">
              {[
                { name: 'LEGO Technic 42175', price: '€89', reserved: true, by: 'Marco & Anna' },
                { name: 'Bici senza pedali Strider', price: '€119', reserved: false },
                { name: 'Kit pittura acquerello', price: '€34', reserved: true, by: 'Giulia' },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    item.reserved
                      ? 'border-gray-100 bg-gray-50 opacity-70'
                      : 'border-cipria/40 bg-cipria/5'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.reserved ? 'bg-gray-300' : 'bg-salvia'
                    }`}
                  />
                  <span className={`flex-1 text-sm font-medium ${item.reserved ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {item.name}
                  </span>
                  <span className={`text-sm font-bold ${item.reserved ? 'text-gray-400' : 'text-salvia'}`}>
                    {item.price}
                  </span>
                  {item.reserved ? (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                      <Lock size={12} className="inline text-gray-400" /> {item.by}
                    </span>
                  ) : (
                    <button className="text-xs bg-salvia text-white px-3 py-1 rounded-lg font-medium">
                      Prenota
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Collective progress bar */}
            <div className="mt-5 pt-4 border-t border-avorio-dark">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                  <GiftIcon size={16} /> Regalo collettivo
                </span>
                <span className="font-bold text-salvia">68%</span>
              </div>
              <div className="h-2 bg-avorio-dark rounded-full overflow-hidden">
                <div className="h-full w-[68%] bg-gradient-to-r from-cipria-dark to-salvia rounded-full" />
              </div>
              <p className="text-xs text-gray-400 mt-1">€136 raccolti su €200</p>
            </div>
          </div>
        </div>
      </section>


      {/* ─── Features ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">
              Tutto quello che ti serve
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Pensato per i genitori, comodo per gli invitati.
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
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">Come funziona</h2>
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
            Pronto a creare la lista?
          </h2>
          <p className="text-white/80 text-lg mb-8 leading-relaxed">
            Ci vogliono meno di 5 minuti. Aggiungi i regali, copia il link e mandalo su WhatsApp.
          </p>
          <div className="flex flex-col items-center gap-5">
            <Link
              to="/crea"
              className="inline-flex items-center gap-2 bg-white text-salvia font-semibold text-base px-7 py-3.5 rounded-2xl hover:bg-avorio transition-colors duration-200 justify-center"
            >
              Crea la lista gratis
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

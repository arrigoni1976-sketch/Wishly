import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { Gift, Users, Heart, Shield, Bell, Star, Lock, Sparkles, Share2 } from 'lucide-react'
import GiftIcon from '../components/GiftIcon'
import BalloonIcon from '../components/BalloonIcon'
import CakeIcon from '../components/CakeIcon'
import CelebrationIcon from '../components/CelebrationIcon'
import HeartRibbonIcon from '../components/HeartRibbonIcon'
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
    title: 'RSVP integrato',
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
      'Due link separati: uno per la lista completa, uno solo per il regalo collettivo.',
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
    title: 'Segui tutto dal dashboard',
    description:
      'Vedi chi ha aperto il link, chi ha prenotato cosa, le presenze confermate e i contributi al collettivo.',
  },
]

export default function HomePage() {
  const [myEvents, setMyEvents] = useState([])
  const [myInvites, setMyInvites] = useState([])

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('piky_events') || '[]')
    setMyEvents(saved)
    const invites = JSON.parse(localStorage.getItem('piky_invites') || '[]')
    setMyInvites(invites)
  }, [])

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
            Regali perfetti,{' '}
            <span className="text-salvia italic">zero doppioni</span>
          </h1>

          <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
            Crea la lista dei desideri del tuo bambino (o la tua!), condividila con gli invitati e lascia che
            si coordinino da soli. Semplice per te, perfetto per tutti.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/crea" className="btn-primary text-lg px-8 py-4 rounded-2xl inline-flex items-center gap-2">
              <span>Crea la lista gratis</span>
              <span>→</span>
            </Link>
            <a
              href="#come-funziona"
              className="btn-outline text-lg px-8 py-4 rounded-2xl inline-flex items-center gap-2"
            >
              <span>Come funziona</span>
            </a>
          </div>

          <p className="text-sm text-gray-400 mt-6">
            Nessun account necessario · Completamente gratuito · Zero commissioni
          </p>
        </div>

        {/* Mock preview card */}
        <div className="relative max-w-lg mx-auto mt-16 px-4">
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
                <p className="text-sm text-gray-500">15 giugno · 16:00 · Giardino di casa</p>
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

      {/* ─── Le tue liste ────────────────────────────────────────────────── */}
      {myEvents.length > 0 && (
        <section className="py-10 px-4 bg-white border-b border-avorio-dark">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">Le tue liste</h2>
            <div className="space-y-3">
              {myEvents.map((ev) => (
                <div key={ev.parentToken} className="flex items-center gap-2">
                  <Link
                    to={`/dashboard/${ev.parentToken}`}
                    className="flex-1 flex items-center justify-between bg-avorio rounded-2xl px-5 py-4 border border-avorio-dark hover:border-salvia hover:shadow-sm transition-all"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{ev.childName}</p>
                      <p className="text-sm text-gray-400">
                        {ev.partyDate
                          ? format(new Date(ev.partyDate), "d MMMM yyyy", { locale: it })
                          : ''}
                      </p>
                    </div>
                    <span className="text-salvia font-medium text-sm">Apri →</span>
                  </Link>
                  <button
                    onClick={() => removeEvent(ev.parentToken)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                    title="Rimuovi dalla lista"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <Link to="/crea" className="mt-4 inline-flex items-center gap-1 text-sm text-salvia font-medium hover:underline">
              + Crea una nuova lista
            </Link>
          </div>
        </section>
      )}

      {/* ─── Inviti ricevuti ─────────────────────────────────────────────── */}
      {myInvites.length > 0 && (
        <section className="py-10 px-4 bg-white border-b border-avorio-dark">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">Inviti ricevuti</h2>
            <div className="space-y-3">
              {myInvites.map((ev) => (
                <div key={ev.guestToken} className="flex items-center gap-2">
                  <Link
                    to={`/lista/${ev.guestToken}`}
                    className="flex-1 flex items-center justify-between bg-avorio rounded-2xl px-5 py-4 border border-avorio-dark hover:border-cipria hover:shadow-sm transition-all"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 flex items-center gap-1"><BalloonIcon size={16} className="inline-block" /> Compleanno di {ev.childName}</p>
                      <p className="text-sm text-gray-400">
                        {ev.partyDate
                          ? format(new Date(ev.partyDate), "d MMMM yyyy", { locale: it })
                          : ''}
                      </p>
                    </div>
                    <span className="text-cipria-dark font-medium text-sm">Apri →</span>
                  </Link>
                  <button
                    onClick={() => removeInvite(ev.guestToken)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                    title="Rimuovi"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Features ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">
              Tutto quello che ti serve
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Pensato per i genitori, comodo per gli invitati. Nessuna app da installare, nessun
              account da creare.
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
          <p className="text-salvia-light text-lg mb-8 leading-relaxed">
            Ci vogliono meno di 5 minuti. Aggiungi i regali, copia il link e mandalo su WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/crea"
              className="inline-flex items-center gap-2 bg-white text-salvia font-semibold text-lg px-8 py-4 rounded-2xl hover:bg-avorio transition-colors duration-200"
            >
              Crea la lista gratis
              <GiftIcon size={22} />
            </Link>
            <button
              onClick={async () => {
                const shareData = {
                  title: 'Piky — Lista desideri per compleanni',
                  text: 'Crea la wishlist per il compleanno, condividila con gli invitati e zero doppioni!',
                  url: 'https://www.pikyapp.it',
                }
                if (navigator.share) {
                  await navigator.share(shareData)
                } else {
                  await navigator.clipboard.writeText('https://www.pikyapp.it')
                  alert('Link copiato!')
                }
              }}
              className="inline-flex items-center gap-2 bg-salvia-dark text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:bg-salvia transition-colors duration-200"
            >
              <Share2 className="w-5 h-5" />
              Condividi l'app
            </button>
          </div>
        </div>
      </section>
    </Layout>
  )
}
